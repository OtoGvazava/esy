package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * An order is charged from the store's catalogue, never from the browser.
 *
 * <p>The bag sends a title and a price for each line, because it draws them;
 * the server must not believe either. Otherwise a shopper could edit the
 * request and pay one tetri for anything, or order another store's product
 * through this one.
 */
@SpringBootTest
class OrderPricingTest {

    @Autowired OrderService orderService;
    @Autowired TenantRepository tenantRepository;
    @Autowired ProductRepository productRepository;

    @MockBean TenantContextService tenantContextService;

    private Tenant tenant;
    private Tenant other;

    @BeforeEach
    void setUp() {
        tenant = store("order-pricing-store");
        other = store("order-pricing-other");
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
    }

    private Tenant store(String sub) {
        return tenantRepository.findBySubdomain(sub).orElseGet(() -> {
            Tenant fresh = new Tenant();
            fresh.setName(sub);
            fresh.setSubdomain(sub);
            fresh.setIsActive(true);
            return tenantRepository.save(fresh);
        });
    }

    private Product product(Tenant owner, String title, String price) {
        Product p = new Product();
        p.setTenant(owner);
        p.setTitle(title);
        p.setDescription(title);
        p.setPrice(new BigDecimal(price));
        p.setQuantity(10);
        return productRepository.save(p);
    }

    private CreateOrderRequest bag(Long productId, String claimedTitle, String claimedPrice, int qty) {
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(productId);
        item.setTitle(claimedTitle);
        item.setPrice(claimedPrice == null ? null : new BigDecimal(claimedPrice));
        item.setQuantity(qty);
        CreateOrderRequest req = new CreateOrderRequest();
        req.setItems(List.of(item));
        req.setDeliveryRoute("pickup");
        return req;
    }

    @Test
    @Transactional
    @DisplayName("the line is priced and named from the product, whatever the browser sent")
    void browserPriceIsIgnored() {
        Product vase = product(tenant, "Clay vase", "95.00");

        Order order = orderService.createOrder(null, tenant, bag(vase.getId(), "Anything", "0.01", 2));

        assertThat(order.getItems()).hasSize(1);
        assertThat(order.getItems().get(0).getPrice()).isEqualByComparingTo("95.00");
        assertThat(order.getItems().get(0).getTitle()).isEqualTo("Clay vase");
        assertThat(order.getTotal()).isEqualByComparingTo("190.00");
    }

    @Test
    @Transactional
    @DisplayName("another store's product cannot be ordered through this one")
    void otherStoresProductIsRefused() {
        Product theirs = product(other, "Their mug", "40.00");

        assertThatThrownBy(() -> orderService.createOrder(null, tenant, bag(theirs.getId(), "Their mug", "40.00", 1)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("400");
    }

    @Test
    @Transactional
    @DisplayName("a line that names no product, or a missing one, is refused")
    void unknownProductIsRefused() {
        assertThatThrownBy(() -> orderService.createOrder(null, tenant, bag(null, "Free thing", "1.00", 1)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("400");
        assertThatThrownBy(() -> orderService.createOrder(null, tenant, bag(987654321L, "Ghost", "1.00", 1)))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("400");
    }
}
