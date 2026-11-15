package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.web.ApiRefusal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Suspension is enforced on the server (review finding H1): a suspended or
 * switched-off store takes no orders, whatever the browser believes.
 */
@SpringBootTest
@Transactional
class SuspendedStoreOrderTest {

    @Autowired OrderService orderService;
    @Autowired ProductRepository productRepository;
    @Autowired TenantRepository tenantRepository;

    @MockBean TenantContextService tenantContextService;

    private static final String SUB = "suspended-order-store";
    private Tenant tenant;
    private Product mug;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Suspended Order Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle("Mug");
        p.setDescription("Mug");
        p.setPrice(new BigDecimal("24.00"));
        p.setQuantity(5);
        mug = productRepository.save(p);
    }

    private CreateOrderRequest oneMug() {
        CreateOrderRequest req = new CreateOrderRequest();
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(mug.getId());
        item.setTitle(mug.getTitle());
        item.setPrice(mug.getPrice());
        item.setQuantity(1);
        req.setItems(List.of(item));
        return req;
    }

    private static String code(Throwable e) {
        return ((ApiRefusal) e).getCode();
    }

    @Test
    @DisplayName("an open store takes the order")
    void openStoreTakesOrders() {
        assertThat(orderService.createOrder(null, tenant, oneMug()).getId()).isNotNull();
    }

    @Test
    @DisplayName("a store the platform suspended refuses the order")
    void suspendedRefuses() {
        tenant.setSuspendedAt(Instant.now());
        assertThatThrownBy(() -> orderService.createOrder(null, tenant, oneMug()))
            .isInstanceOf(ApiRefusal.class)
            .satisfies(e -> assertThat(code(e)).isEqualTo("STORE_SUSPENDED"));
    }

    @Test
    @DisplayName("a store its owner switched off refuses the order")
    void closedRefuses() {
        tenant.setIsActive(false);
        assertThatThrownBy(() -> orderService.createOrder(null, tenant, oneMug()))
            .isInstanceOf(ApiRefusal.class)
            .satisfies(e -> assertThat(code(e)).isEqualTo("STORE_CLOSED"));
    }
}
