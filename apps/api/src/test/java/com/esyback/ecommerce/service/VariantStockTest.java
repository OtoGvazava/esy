package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductVariant;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.ProductVariantRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Where stock goes when a variant product sells (D11).
 *
 * <p>This is the semantics most likely to be implemented wrongly and least
 * likely to be noticed: decrementing the product instead of the combination
 * looks correct on the stats screen — the total falls — while the size the
 * shopper actually bought stays "in stock" forever.
 */
@SpringBootTest
class VariantStockTest {

    @Autowired OrderService orderService;
    @Autowired ProductService productService;
    @Autowired ProductVariantService variantService;
    @Autowired ProductRepository productRepository;
    @Autowired ProductVariantRepository variantRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired OrderRepository orderRepository;

    @MockBean TenantContextService tenantContextService;

    private static final String SUB = "variant-stock-store";
    private Tenant tenant;
    private Product product;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Variant Stock Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);

        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle("Boots");
        p.setDescription("Boots");
        p.setPrice(new BigDecimal("180.00"));
        p.setQuantity(0);
        product = productRepository.save(p);

        variantService.replace(product, Map.of(
            "axes", List.of(Map.of("name", "Size", "values", List.of("38", "40"))),
            "rows", List.of(
                Map.of("key", List.of("38"), "stock", 2),
                Map.of("key", List.of("40"), "stock", 5, "price", "195.00"))));
        product = productRepository.findById(product.getId()).orElseThrow();
    }

    private ProductVariant variant(String value) {
        return variantRepository.findByProductOrderByIdAsc(product).stream()
            .filter(v -> value.equals(v.getValue1())).findFirst().orElseThrow();
    }

    private Order buy(ProductVariant v, int qty) {
        CreateOrderRequest req = new CreateOrderRequest();
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(product.getId());
        item.setVariantId(v.getId());
        item.setQuantity(qty);
        // A price the browser made up — the server must ignore it.
        item.setPrice(new BigDecimal("1.00"));
        req.setItems(List.of(item));
        req.setDeliveryRoute("pickup");
        return orderService.createOrder(null, tenant, req);
    }

    @Test
    @Transactional
    void theChosenCombinationIsFrozenOntoTheLine() {
        Order order = buy(variant("38"), 1);
        assertThat(order.getItems().get(0).getVariantLabel()).isEqualTo("38");
        assertThat(order.getItems().get(0).getVariantId()).isEqualTo(variant("38").getId());
    }

    @Test
    @Transactional
    void theVariantPriceWinsOverAnythingTheBrowserSent() {
        // 40 carries its own price; 38 falls back to the product's base.
        assertThat(buy(variant("40"), 1).getTotal()).isEqualByComparingTo("195.00");
        assertThat(buy(variant("38"), 1).getTotal()).isEqualByComparingTo("180.00");
    }

    @Test
    @Transactional
    void stockLeavesTheCombinationNotTheProduct() {
        Order order = buy(variant("38"), 2);
        productService.commitStock(order);

        assertThat(variant("38").getQuantity()).isZero();
        // The other size is untouched...
        assertThat(variant("40").getQuantity()).isEqualTo(5);
        // ...and the product's cached total follows its rows.
        assertThat(productRepository.findById(product.getId()).orElseThrow().getQuantity())
            .isEqualTo(5);
    }

    @Test
    @Transactional
    void oversellingOneSizeFloorsThatRowAlone() {
        Order order = buy(variant("38"), 9);
        productService.commitStock(order);

        assertThat(variant("38").getQuantity()).isZero();
        assertThat(variant("40").getQuantity()).isEqualTo(5);
    }
}
