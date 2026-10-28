package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Bulk product import (decision D7).
 *
 * <p>The behaviour worth defending is that a file is taken whole or not at all.
 * There is no bulk delete, so a partial import leaves a merchant reconciling a
 * half-built catalogue by hand against a file they can no longer trust — and
 * the report has to name the line a spreadsheet would show them, or it does not
 * help them fix it.
 */
@SpringBootTest
class ProductImportTest {

    @Autowired ProductImportService importService;
    @Autowired ProductRepository productRepository;
    @Autowired TenantRepository tenantRepository;

    @MockBean TenantContextService tenantContextService;

    private static final String SUB = "import-store";
    private Tenant tenant;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant fresh = new Tenant();
            fresh.setName("Import Store");
            fresh.setSubdomain(SUB);
            fresh.setIsActive(true);
            return tenantRepository.save(fresh);
        });
        productRepository.deleteAll(stored());
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
    }

    private List<Product> stored() {
        return productRepository.findByTenant(tenant, Pageable.unpaged()).getContent();
    }

    @Test
    @Transactional
    @DisplayName("a good file creates every row")
    void importsEveryRow() {
        var report = importService.importCsv("""
            title,description,price,quantity
            Ceramic mug,"Small, hand-thrown",24.00,12
            Linen apron,,48.50,4
            """, false);

        assertThat(report.ok()).isTrue();
        assertThat(report.parsed()).isEqualTo(2);
        assertThat(report.imported()).isEqualTo(2);
        assertThat(stored()).hasSize(2);

        Product mug = stored().stream().filter(p -> p.getTitle().equals("Ceramic mug")).findFirst().orElseThrow();
        // The quoted comma survived the round trip into the database.
        assertThat(mug.getDescription()).isEqualTo("Small, hand-thrown");
        assertThat(mug.getPrice()).isEqualByComparingTo("24.00");
        assertThat(mug.getQuantity()).isEqualTo(12);
        // A blank description is absent, not an empty string.
        assertThat(stored().stream().filter(p -> p.getTitle().equals("Linen apron")).findFirst()
            .orElseThrow().getDescription()).isNull();
    }

    @Test
    @Transactional
    @DisplayName("one bad row rejects the whole file and writes nothing")
    void allOrNothing() {
        var report = importService.importCsv("""
            title,price,quantity
            Good mug,24.00,12
            Bad mug,not-a-price,4
            Another good,10.00,1
            """, false);

        assertThat(report.ok()).isFalse();
        assertThat(report.imported()).isZero();
        // Not "the two valid ones got in" — nothing did.
        assertThat(stored()).isEmpty();
    }

    @Test
    @Transactional
    @DisplayName("every problem is reported at once, at the line a spreadsheet shows")
    void reportsEveryProblemWithItsLine() {
        var report = importService.importCsv("""
            title,price,quantity
            ,24.00,12
            Mug,-5,4
            Plate,10.00,nope
            """, false);

        // All three, not just the first: a merchant fixing a file wants the
        // whole list in one pass.
        assertThat(report.errors()).hasSize(3);
        // Line 2 is the first product row, because the header is line 1.
        assertThat(report.errors().get(0).line()).isEqualTo(2);
        assertThat(report.errors().get(0).message()).contains("title");
        assertThat(report.errors().get(1).line()).isEqualTo(3);
        assertThat(report.errors().get(1).message()).contains("greater than 0");
        assertThat(report.errors().get(2).line()).isEqualTo(4);
        assertThat(report.errors().get(2).message()).contains("whole number");
    }

    @Test
    @Transactional
    @DisplayName("a dry run reports the outcome and creates nothing")
    void dryRunWritesNothing() {
        var report = importService.importCsv("""
            title,price,quantity
            Mug,24.00,12
            """, true);

        assertThat(report.ok()).isTrue();
        assertThat(report.dryRun()).isTrue();
        assertThat(report.parsed()).isEqualTo(1);
        assertThat(report.imported()).isZero();
        assertThat(stored()).isEmpty();
    }

    @Test
    @Transactional
    @DisplayName("column order does not matter, and names are case-insensitive")
    void headerDrivenColumns() {
        var report = importService.importCsv("""
            Quantity,TITLE,Price
            7,Mug,24.00
            """, false);

        assertThat(report.ok()).isTrue();
        Product p = stored().get(0);
        assertThat(p.getTitle()).isEqualTo("Mug");
        assertThat(p.getQuantity()).isEqualTo(7);
    }

    @Test
    @Transactional
    @DisplayName("a European decimal comma is read as a decimal point")
    void acceptsDecimalComma() {
        // The field was already split by the CSV reader, so the comma here
        // cannot be a separator — and refusing 24,50 would be correct and
        // useless to someone using a Georgian spreadsheet.
        var report = importService.importCsv("""
            title,price,quantity
            Mug,"24,50",3
            """, false);

        assertThat(report.ok()).isTrue();
        assertThat(stored().get(0).getPrice()).isEqualByComparingTo("24.50");
    }

    @Test
    @Transactional
    @DisplayName("a price with real extra precision is refused, a harmless one is not")
    void priceScale() {
        assertThat(importService.importCsv("""
            title,price,quantity
            Mug,24.999,3
            """, true).errors()).hasSize(1);

        // 24.500 is the same number as 24.50; nothing is lost, so nothing is
        // refused.
        assertThat(importService.importCsv("""
            title,price,quantity
            Mug,24.500,3
            """, true).ok()).isTrue();
    }

    @Test
    @Transactional
    @DisplayName("a file with no usable header is refused outright")
    void missingColumns() {
        assertThatThrownBy(() -> importService.importCsv("name,cost\nMug,24\n", false))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("title");

        assertThatThrownBy(() -> importService.importCsv("", false))
            .isInstanceOf(ResponseStatusException.class);

        // Header only, no products.
        assertThatThrownBy(() -> importService.importCsv("title,price,quantity\n", false))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("no products");
    }

    @Test
    @Transactional
    @DisplayName("an oversized file is refused before anything is created")
    void rowCap() {
        StringBuilder csv = new StringBuilder("title,price,quantity\n");
        for (int i = 0; i < ProductImportService.MAX_ROWS + 1; i++) {
            csv.append("Thing ").append(i).append(",1.00,1\n");
        }
        assertThatThrownBy(() -> importService.importCsv(csv.toString(), false))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining(String.valueOf(ProductImportService.MAX_ROWS));
        assertThat(stored()).isEmpty();
    }

    @Test
    @Transactional
    @DisplayName("the template we hand out is a file this importer accepts")
    void templateRoundTrips() {
        // A template that does not import is worse than none: it teaches the
        // wrong format and the failure looks like the merchant's mistake.
        var report = importService.importCsv(ProductImportService.template(), true);
        assertThat(report.ok()).isTrue();
        assertThat(report.parsed()).isEqualTo(2);
    }
}
