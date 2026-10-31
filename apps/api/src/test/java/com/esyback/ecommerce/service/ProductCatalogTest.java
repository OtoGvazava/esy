package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CategoryCount;
import com.esyback.ecommerce.dto.OptionFacet;
import com.esyback.ecommerce.dto.ProductDto;
import com.esyback.ecommerce.dto.ProductFilter;
import com.esyback.ecommerce.dto.ProductListDto;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Categories and the collection filters.
 *
 * <p>What is worth pinning: a category is the merchant's own word, so it is
 * matched and counted ignoring case but never rewritten; an edit that does not
 * mention it leaves it alone; and "in stock" with an option chosen means the
 * chosen combination can be bought, not merely that the product has stock
 * somewhere.
 */
@SpringBootTest
@Transactional
class ProductCatalogTest {

    @Autowired ProductService productService;
    @Autowired ProductVariantService variantService;
    @Autowired ProductRepository productRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired EntityManager entityManager;

    @MockBean TenantContextService tenantContextService;

    private Tenant store;
    private Tenant other;

    @BeforeEach
    void setUp() {
        store = tenant("catalog-store");
        other = tenant("catalog-other");
        productRepository.deleteAll(productRepository.findByTenant(store, Pageable.unpaged()).getContent());
        productRepository.deleteAll(productRepository.findByTenant(other, Pageable.unpaged()).getContent());
        when(tenantContextService.getCurrentTenant()).thenReturn(store);
    }

    private Tenant tenant(String sub) {
        return tenantRepository.findBySubdomain(sub).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName(sub);
            t.setSubdomain(sub);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
    }

    private Product product(Tenant tenant, String title, String category, String price, int quantity) {
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle(title);
        p.setCategory(category);
        p.setPrice(new BigDecimal(price));
        p.setQuantity(quantity);
        return productRepository.save(p);
    }

    private ProductDto dto(String title, String category) {
        ProductDto d = new ProductDto();
        d.setTitle(title);
        d.setPrice(new BigDecimal("40.00"));
        d.setQuantity(3);
        d.setCategory(category);
        return d;
    }

    private List<String> titles(ProductFilter filter) {
        entityManager.flush();
        return productService.getProducts(0, 50, "id", "asc", filter).getContent().stream()
            .map(ProductListDto::getTitle).toList();
    }

    private static ProductFilter category(String category, boolean inStock) {
        return new ProductFilter(null, null, null, null, category, inStock, Map.of());
    }

    private static ProductFilter options(boolean inStock, Map<String, List<String>> options) {
        return new ProductFilter(null, null, null, null, null, inStock, options);
    }

    // ------------------------------------------------------------ the field

    @Test
    @DisplayName("a category is stored trimmed, and a blank one is none")
    void storedTrimmed() {
        assertThat(productService.createProduct(dto("Vase", "  Vases  ")).getCategory()).isEqualTo("Vases");
        assertThat(productService.createProduct(dto("Mug", "   ")).getCategory()).isNull();
        assertThat(productService.createProduct(dto("Plate", null)).getCategory()).isNull();
    }

    @Test
    @DisplayName("a category longer than 60 characters is refused, not cut")
    void overlongRefused() {
        String sixty = "ა".repeat(Product.CATEGORY_MAX);
        assertThat(productService.createProduct(dto("Vase", sixty)).getCategory()).isEqualTo(sixty);

        assertThatThrownBy(() -> productService.createProduct(dto("Vase", sixty + "ბ")))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    @DisplayName("an update leaves the category alone unless it sends one; blank clears it")
    void updateKeepsUnlessSent() {
        Long id = productService.createProduct(dto("Vase", "Vases")).getId();

        // A client that predates categories sends no field at all.
        assertThat(productService.updateProduct(id, dto("Vase", null)).orElseThrow().getCategory())
            .isEqualTo("Vases");
        assertThat(productService.updateProduct(id, dto("Vase", "Bowls")).orElseThrow().getCategory())
            .isEqualTo("Bowls");
        assertThat(productService.updateProduct(id, dto("Vase", "  ")).orElseThrow().getCategory())
            .isNull();
    }

    @Test
    @DisplayName("the list and the product detail both carry the category")
    void responsesCarryIt() {
        Product vase = product(store, "Vase", "Vases", "95.00", 2);
        assertThat(productService.getProductById(vase.getId()).orElseThrow().getCategory()).isEqualTo("Vases");
        entityManager.flush();
        assertThat(productService.getProducts(0, 10, "id", "asc", category(null, false))
            .getContent().get(0).getCategory()).isEqualTo("Vases");
    }

    // ---------------------------------------------------------- the filters

    @Test
    @DisplayName("the category filter is an exact match that ignores case, within the store")
    void categoryFilter() {
        product(store, "Tall vase", "Vases", "120.00", 2);
        product(store, "Small vase", "vases", "48.00", 0);
        product(store, "Vase-ish mug", "Vase", "38.00", 5);
        product(store, "Loose", null, "10.00", 1);
        product(other, "Their vase", "Vases", "90.00", 9);

        assertThat(titles(category("VASES", false))).containsExactly("Tall vase", "Small vase");
        // Exact, not a prefix: "Vase" is a category of its own.
        assertThat(titles(category("Vase", false))).containsExactly("Vase-ish mug");
        assertThat(titles(category("Nothing", false))).isEmpty();
    }

    @Test
    @DisplayName("in stock leaves out what is sold out, and combines with price and category")
    void inStockFilter() {
        product(store, "Tall vase", "Vases", "120.00", 2);
        product(store, "Small vase", "Vases", "48.00", 0);
        product(store, "Wide vase", "Vases", "150.00", 4);

        assertThat(titles(category("Vases", true))).containsExactly("Tall vase", "Wide vase");
        assertThat(titles(new ProductFilter(null, new BigDecimal("40"), new BigDecimal("130"), null,
            "Vases", true, Map.of()))).containsExactly("Tall vase");
    }

    @Test
    @DisplayName("sorting by price keeps products of one price in one order")
    void priceSortIsStable() {
        Product a = product(store, "A", "Vases", "50.00", 1);
        Product b = product(store, "B", "Vases", "50.00", 1);
        Product c = product(store, "C", "Vases", "20.00", 1);
        entityManager.flush();

        List<Long> desc = productService.getProducts(0, 10, "price", "desc", category("Vases", false))
            .getContent().stream().map(ProductListDto::getId).toList();
        assertThat(desc).containsExactly(b.getId(), a.getId(), c.getId());
    }

    @Test
    @DisplayName("a title search treats % and _ as characters, not wildcards")
    void titleSearchEscapesWildcards() {
        product(store, "100% linen", null, "50.00", 1);
        product(store, "Linen apron", null, "40.00", 1);

        assertThat(titles(ProductFilter.byTitle("0% L"))).containsExactly("100% linen");
        assertThat(titles(ProductFilter.byTitle("%"))).containsExactly("100% linen");
        assertThat(titles(ProductFilter.byTitle("LINEN"))).containsExactly("100% linen", "Linen apron");
    }

    @Test
    @DisplayName("quotes in a category or an option value are data, not SQL")
    void quotesAreData() {
        product(store, "Toy", "Kid's room", "15.00", 1);
        Product hat = product(store, "Hat", "Kid's room", "25.00", 0);
        variantService.replace(hat, Map.of(
            "axes", List.of(axis("Fit", "O'Neil", "Plain")),
            "rows", List.of(row(List.of("O'Neil"), 2))));

        assertThat(titles(category("kid's room", false))).containsExactly("Toy", "Hat");
        assertThat(titles(category("kid' OR '1'='1", false))).isEmpty();
        assertThat(titles(options(true, Map.of("Fit", List.of("o'neil"))))).containsExactly("Hat");
        assertThat(titles(ProductFilter.byTitle("'"))).isEmpty();
    }

    // ---------------------------------------------------------- categories

    @Test
    @DisplayName("categories are counted ignoring case, most products first, store by store")
    void categoriesCounted() {
        product(store, "1", "Vases", "10.00", 1);
        product(store, "2", "Vases", "10.00", 1);
        product(store, "3", "vases", "10.00", 0);
        product(store, "4", "Mugs", "10.00", 1);
        product(store, "5", "Mugs", "10.00", 1);
        product(store, "6", "Plates", "10.00", 1);
        product(store, "7", null, "10.00", 1);
        product(other, "8", "Bowls", "10.00", 1);
        product(other, "9", "Bowls", "10.00", 1);
        product(other, "10", "Bowls", "10.00", 1);
        product(other, "11", "Bowls", "10.00", 1);
        entityManager.flush();

        List<CategoryCount> counts = productService.getCategories();
        assertThat(counts).hasSize(3);
        assertThat(counts.get(0).name()).isEqualToIgnoringCase("vases");
        assertThat(counts.get(0).count()).isEqualTo(3L);
        assertThat(counts.get(1)).isEqualTo(new CategoryCount("Mugs", 2L));
        assertThat(counts.get(2)).isEqualTo(new CategoryCount("Plates", 1L));
    }

    // -------------------------------------------------------------- options

    /**
     * A vase in Size × Glaze with stock only on M · Sand, and a mug whose axes
     * run the other way round (Glaze first) with stock only on White · M.
     */
    private void variantProducts() {
        Product vase = product(store, "Vase", "Vases", "95.00", 0);
        variantService.replace(vase, Map.of(
            "axes", List.of(axis("Size", "S", "M", "L"), axis("Glaze", "Sea", "Sand")),
            "rows", List.of(row(List.of("M", "Sand"), 3))));
        Product mug = product(store, "Mug", "Vases", "38.00", 0);
        variantService.replace(mug, Map.of(
            "axes", List.of(axis("glaze", "Sea", "White"), axis("size", "M")),
            "rows", List.of(row(List.of("White", "M"), 4))));
        product(store, "Plain bowl", "Vases", "30.00", 7);
        entityManager.flush();
    }

    private static Map<String, Object> axis(String name, String... values) {
        return Map.of("name", name, "values", List.of(values));
    }

    private static Map<String, Object> row(List<String> key, int stock) {
        return Map.of("key", key, "stock", stock);
    }

    @Test
    @DisplayName("an option filter finds the axis by name, wherever it sits on the product")
    void optionFilterByName() {
        variantProducts();

        assertThat(titles(options(false, Map.of("Size", List.of("M"))))).containsExactly("Vase", "Mug");
        assertThat(titles(options(false, Map.of("Size", List.of("S"))))).containsExactly("Vase");
        // Case does not matter on either the axis or the value.
        assertThat(titles(options(false, Map.of("GLAZE", List.of("sand"))))).containsExactly("Vase");
        // Values on one axis are alternatives.
        assertThat(titles(options(false, Map.of("Glaze", List.of("Sand", "White")))))
            .containsExactly("Vase", "Mug");
    }

    @Test
    @DisplayName("two axes must hold on one combination, and in stock means that combination")
    void optionsOnOneCombination() {
        variantProducts();

        assertThat(titles(options(true, Map.of("Size", List.of("M"))))).containsExactly("Vase", "Mug");
        // Both products are made in M · Sea; neither has one to sell.
        assertThat(titles(options(false, Map.of("Size", List.of("M"), "Glaze", List.of("Sea")))))
            .containsExactly("Vase", "Mug");
        assertThat(titles(options(true, Map.of("Size", List.of("M"), "Glaze", List.of("Sea"))))).isEmpty();
        // The vase has stock, just not in S.
        assertThat(titles(options(true, Map.of("Size", List.of("S"))))).isEmpty();
        assertThat(titles(options(true, Map.of("Size", List.of("M"), "Glaze", List.of("White")))))
            .containsExactly("Mug");
    }

    @Test
    @DisplayName("option facets merge axes by name and keep each merchant's order")
    void optionFacets() {
        variantProducts();
        Product cup = product(store, "Cup", "Cups", "20.00", 0);
        variantService.replace(cup, Map.of("axes", List.of(axis("Volume", "200 ml"))));
        entityManager.flush();

        assertThat(productService.getOptionFacets("vases")).containsExactly(
            new OptionFacet("Size", List.of("S", "M", "L")),
            new OptionFacet("Glaze", List.of("Sea", "Sand", "White")));
        assertThat(productService.getOptionFacets(null)).extracting(OptionFacet::name)
            .containsExactly("Size", "Glaze", "Volume");
        assertThat(productService.getOptionFacets("Plates")).isEmpty();
    }
}
