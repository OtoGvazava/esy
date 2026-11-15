package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductVariant;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.ProductVariantRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Stock taken by orders at the same moment is all taken (review M29), and a
 * variant row recreated by a grid save still gives its stock (review M30).
 *
 * <p>Not @Transactional: each order's stock must commit in its own
 * transaction for the race to be real.
 */
@SpringBootTest
class ConcurrentStockTest {

    @Autowired OrderService orderService;
    @Autowired ProductVariantService variantService;
    @Autowired ProductRepository productRepository;
    @Autowired ProductVariantRepository variantRepository;
    @Autowired TenantRepository tenantRepository;

    @MockitoBean TenantContextService tenantContextService;

    private Tenant tenant;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain("concurrent-stock-store").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Concurrent Stock Store");
            t.setSubdomain("concurrent-stock-store");
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
    }

    private Product product(String title, int stock) {
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle(title);
        p.setDescription(title);
        p.setPrice(new BigDecimal("10.00"));
        p.setQuantity(stock);
        return productRepository.save(p);
    }

    private CreateOrderRequest bag(Product p, Long variantId, int qty) {
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(p.getId());
        item.setVariantId(variantId);
        item.setQuantity(qty);
        CreateOrderRequest req = new CreateOrderRequest();
        req.setItems(List.of(item));
        return req;
    }

    @Test
    @DisplayName("eight orders committing stock at once each take theirs: none of the decrements is lost")
    void parallelCommitsAllLand() throws Exception {
        Product mug = product("Race mug", 40);
        List<Order> orders = new ArrayList<>();
        for (int i = 0; i < 8; i++) orders.add(orderService.createOrder(null, tenant, bag(mug, null, 3)));

        ExecutorService pool = Executors.newFixedThreadPool(8);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<?>> all = new ArrayList<>();
        for (Order o : orders) {
            all.add(pool.submit(() -> {
                go.await();
                orderService.commitFreeOrderStock(o);
                return null;
            }));
        }
        go.countDown();
        for (Future<?> f : all) f.get();
        pool.shutdown();

        assertThat(productRepository.findById(mug.getId()).orElseThrow().getQuantity()).isEqualTo(40 - 8 * 3);
    }

    @Test
    @DisplayName("a grid save between order and payment still takes the stock, from the same combination")
    void recreatedRowStillGivesStock() {
        Product boots = product("Race boots", 0);
        Map<String, Object> grid = Map.of(
            "axes", List.of(Map.of("name", "Size", "values", List.of("38", "40"))),
            "rows", List.of(
                Map.of("key", List.of("38"), "stock", 4),
                Map.of("key", List.of("40"), "stock", 5)));
        variantService.replace(boots, grid);
        boots = productRepository.findById(boots.getId()).orElseThrow();
        ProductVariant size38 = variantRepository.findByProductOrderByIdAsc(boots).stream()
            .filter(v -> "38".equals(v.getValue1())).findFirst().orElseThrow();

        Order order = orderService.createOrder(null, tenant, bag(boots, size38.getId(), 1));
        // The merchant saves the grid again before the payment lands.
        variantService.replace(productRepository.findById(boots.getId()).orElseThrow(), grid);

        orderService.commitFreeOrderStock(order);

        Product after = productRepository.findById(boots.getId()).orElseThrow();
        ProductVariant now38 = variantRepository.findByProductOrderByIdAsc(after).stream()
            .filter(v -> "38".equals(v.getValue1())).findFirst().orElseThrow();
        assertThat(now38.getQuantity()).isEqualTo(3);
    }
}
