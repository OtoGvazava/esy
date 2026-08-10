package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.ProductVariantRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Product variants (D11). The rules worth pinning are the ones a reader of the
 * entities alone would not see: the grid is generated rather than trusted,
 * stock survives an edit, and the product's own quantity becomes a cached sum.
 */
@SpringBootTest
class ProductVariantServiceTest {

    @Autowired ProductVariantService service;
    @Autowired ProductRepository productRepository;
    @Autowired ProductVariantRepository variantRepository;
    @Autowired TenantRepository tenantRepository;

    private static final String SUB = "variant-test-store";
    private Product product;

    @BeforeEach
    void setUp() {
        Tenant tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Variant Test Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        product = productRepository.save(newProduct(tenant));
    }

    private Product newProduct(Tenant tenant) {
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle("Shirt");
        p.setDescription("A shirt");
        p.setPrice(new BigDecimal("70.00"));
        p.setQuantity(0);
        return p;
    }

    private Map<String, Object> axis(String name, String... values) {
        return Map.of("name", name, "values", List.of(values));
    }

    private Map<String, Object> row(List<String> key, Object price, Integer stock) {
        return price == null
            ? Map.of("key", key, "stock", stock)
            : Map.of("key", key, "price", price, "stock", stock);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> rowsOf(Map<String, Object> doc) {
        return (List<Map<String, Object>>) doc.get("rows");
    }

    @Test
    @Transactional
    void oneAxisProducesOneRowPerValue() {
        Map<String, Object> doc = service.replace(product, Map.of(
            "axes", List.of(axis("Size", "S", "M", "L")),
            "rows", List.of(row(List.of("S"), null, 6), row(List.of("M"), null, 0),
                row(List.of("L"), "80.00", 12))));

        assertThat(rowsOf(doc)).hasSize(3);
        assertThat(rowsOf(doc).stream().map(r -> r.get("stock"))).containsExactly(6, 0, 12);
        // A row with no price of its own falls back to the product's.
        assertThat(rowsOf(doc).get(0).get("price")).isNull();
        assertThat(rowsOf(doc).get(2).get("price")).isEqualTo(new BigDecimal("80.00"));
    }

    @Test
    @Transactional
    void twoAxesProduceTheFullGridEvenWhereNoRowWasSent() {
        // The storefront judges availability against the whole grid, so a
        // missing combination would read as "out of stock" rather than absent.
        Map<String, Object> doc = service.replace(product, Map.of(
            "axes", List.of(axis("Size", "38", "40"), axis("Colour", "grey", "black")),
            "rows", List.of(row(List.of("38", "grey"), null, 2))));

        assertThat(rowsOf(doc)).hasSize(4);
        assertThat(rowsOf(doc).stream().map(r -> r.get("label")))
            .containsExactly("38 · grey", "38 · black", "40 · grey", "40 · black");
    }

    @Test
    @Transactional
    void theProductQuantityBecomesTheSumOfTheRows() {
        service.replace(product, Map.of(
            "axes", List.of(axis("Size", "S", "M")),
            "rows", List.of(row(List.of("S"), null, 4), row(List.of("M"), null, 5))));

        assertThat(productRepository.findById(product.getId()).orElseThrow().getQuantity())
            .isEqualTo(9);
    }

    @Test
    @Transactional
    void editingTheAxesKeepsTheStockAlreadyRecorded() {
        service.replace(product, Map.of(
            "axes", List.of(axis("Size", "S", "M")),
            "rows", List.of(row(List.of("S"), null, 4), row(List.of("M"), null, 5))));

        // Merchant adds a size and saves without retyping the counts. Zeroing
        // them would be indistinguishable from selling out.
        Map<String, Object> doc = service.replace(product, Map.of(
            "axes", List.of(axis("Size", "S", "M", "L")),
            "rows", List.of()));

        assertThat(rowsOf(doc).stream().map(r -> r.get("stock"))).containsExactly(4, 5, 0);
    }

    @Test
    @Transactional
    void aThirdAxisIsRefused() {
        assertThatThrownBy(() -> service.replace(product, Map.of(
            "axes", List.of(axis("Size", "S"), axis("Colour", "red"), axis("Fit", "slim")),
            "rows", List.of())))
            .hasMessageContaining("at most 2 axes");
    }

    @Test
    @Transactional
    void anAxisWithNoValuesIsRefused() {
        assertThatThrownBy(() -> service.replace(product, Map.of(
            "axes", List.of(Map.of("name", "Size", "values", List.of())),
            "rows", List.of())))
            .hasMessageContaining("no values");
    }

    @Test
    @Transactional
    void duplicateValuesCollapseRatherThanBreakingTheUniqueConstraint() {
        Map<String, Object> doc = service.replace(product, Map.of(
            "axes", List.of(axis("Size", "S", "S", "M")),
            "rows", List.of()));
        assertThat(rowsOf(doc)).hasSize(2);
    }

    @Test
    @Transactional
    void anUnmanageablyLargeGridIsRefused() {
        String[] many = new String[30];
        for (int i = 0; i < many.length; i++) many[i] = "v" + i;
        assertThatThrownBy(() -> service.replace(product, Map.of(
            "axes", List.of(axis("A", many), axis("B", many)),
            "rows", List.of())))
            .hasMessageContaining("combinations");
    }

    @Test
    @Transactional
    void sendingNoAxesTurnsVariantsOffAndHandsStockBack() {
        service.replace(product, Map.of(
            "axes", List.of(axis("Size", "S")), "rows", List.of(row(List.of("S"), null, 3))));
        assertThat(productRepository.findById(product.getId()).orElseThrow().variantsEnabled()).isTrue();

        assertThat(service.replace(product, Map.of("axes", List.of()))).isNull();

        Product after = productRepository.findById(product.getId()).orElseThrow();
        assertThat(after.variantsEnabled()).isFalse();
        assertThat(variantRepository.findByProductOrderByIdAsc(after)).isEmpty();
    }

    @Test
    @Transactional
    void aProductWithoutVariantsReadsAsNone() {
        assertThat(service.read(product)).isNull();
    }

    @Test
    @Transactional
    void checkingOutAVariantProductWithoutChoosingIsRefused() {
        service.replace(product, Map.of(
            "axes", List.of(axis("Size", "S", "M")), "rows", List.of()));

        assertThatThrownBy(() -> service.require(product, null))
            .hasMessageContaining("Choose an option");
    }

    @Test
    @Transactional
    void aVariantFromAnotherProductIsRefused() {
        service.replace(product, Map.of(
            "axes", List.of(axis("Size", "S")), "rows", List.of(row(List.of("S"), null, 1))));

        Product other = productRepository.save(newProduct(product.getTenant()));
        service.replace(other, Map.of(
            "axes", List.of(axis("Size", "S")), "rows", List.of(row(List.of("S"), null, 1))));
        Long foreign = variantRepository.findByProductOrderByIdAsc(other).get(0).getId();

        assertThatThrownBy(() -> service.require(product, foreign))
            .hasMessageContaining("no longer available");
    }
}
