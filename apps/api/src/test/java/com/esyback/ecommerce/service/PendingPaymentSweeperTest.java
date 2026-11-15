package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/** Card payments that never came back are settled from BOG's receipt, or given up on (review M31). */
@SpringBootTest
class PendingPaymentSweeperTest {

    @Autowired PendingPaymentSweeper sweeper;
    @Autowired OrderService orderService;
    @Autowired OrderRepository orderRepository;
    @Autowired ProductRepository productRepository;
    @Autowired TenantRepository tenantRepository;

    @MockitoBean BogPaymentService bog;
    @MockitoBean TenantContextService tenantContextService;

    private Tenant tenant;
    private Product mug;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain("sweeper-store").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Sweeper Store");
            t.setSubdomain("sweeper-store");
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle("Mug");
        p.setDescription("Mug");
        p.setPrice(new BigDecimal("24.00"));
        p.setQuantity(50);
        mug = productRepository.save(p);
        // Unless a test says otherwise BOG answers, and the payment is unfinished.
        when(bog.fetchReceiptKey(any(), any())).thenReturn(Optional.of("created"));
        when(bog.mapStatus(any())).thenCallRealMethod();
    }

    private Order pending(LocalDateTime placed) {
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(mug.getId());
        item.setQuantity(1);
        CreateOrderRequest req = new CreateOrderRequest();
        req.setItems(List.of(item));
        Order o = orderService.markBogPending(orderService.createOrder(null, tenant, req), "bog-" + placed);
        Order stored = orderRepository.findById(o.getId()).orElseThrow();
        stored.setCreatedAt(placed);
        return orderRepository.save(stored);
    }

    private Order reload(Order o) {
        return orderRepository.findById(o.getId()).orElseThrow();
    }

    @Test
    @DisplayName("a lost payment settles from the receipt; one BOG still calls unfinished after a day fails; a fresh one is left alone")
    void sweeps() {
        LocalDateTime now = LocalDateTime.now();
        Order paid = pending(now.minusHours(2));
        Order abandoned = pending(now.minusHours(25));
        Order unreachable = pending(now.minusHours(26));
        Order refunded = pending(now.minusHours(3));
        Order waiting = pending(now.minusHours(2).minusMinutes(1));
        Order fresh = pending(now.minusMinutes(5));
        when(bog.fetchReceiptKey(any(), eq(paid.getBogOrderId()))).thenReturn(Optional.of("completed"));
        when(bog.fetchReceiptKey(any(), eq(unreachable.getBogOrderId()))).thenReturn(Optional.empty());
        when(bog.fetchReceiptKey(any(), eq(refunded.getBogOrderId()))).thenReturn(Optional.of("refunded"));

        sweeper.sweep(now);

        assertThat(reload(paid).getPaymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
        assertThat(reload(abandoned).getPaymentStatus()).isEqualTo(Order.PaymentStatus.FAILED);
        assertThat(reload(abandoned).getStatus()).isEqualTo(Order.Status.CANCELLED);
        // BOG could not be asked: no evidence it was not paid, so not given up on.
        assertThat(reload(unreachable).getPaymentStatus()).isEqualTo(Order.PaymentStatus.PENDING);
        // Paid and refunded before we heard: closed, not left PENDING for ever.
        assertThat(reload(refunded).getPaymentStatus()).isEqualTo(Order.PaymentStatus.FAILED);
        assertThat(reload(waiting).getPaymentStatus()).isEqualTo(Order.PaymentStatus.PENDING);
        assertThat(reload(fresh).getPaymentStatus()).isEqualTo(Order.PaymentStatus.PENDING);
    }

    @Test
    @DisplayName("a payment that completes after it was given up on is still recorded as PAID")
    void lateCompletionIsRecorded() {
        Order o = pending(LocalDateTime.now().minusHours(30));
        sweeper.sweep(LocalDateTime.now());
        assertThat(reload(o).getPaymentStatus()).isEqualTo(Order.PaymentStatus.FAILED);

        Order after = orderService.settlePayment(o.getOrderNumber(), Order.PaymentStatus.PAID).orElseThrow();

        assertThat(after.getPaymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
        // Still cancelled, holding no stock: the owner refunds it.
        assertThat(after.getStatus()).isEqualTo(Order.Status.CANCELLED);
    }

    @Test
    @DisplayName("a checkout whose bank call failed is closed as a failed payment, not left looking like a sale")
    void failedStartIsClosed() {
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(mug.getId());
        item.setQuantity(1);
        CreateOrderRequest req = new CreateOrderRequest();
        req.setItems(List.of(item));
        Order o = orderService.createOrder(null, tenant, req);

        orderService.failUnstartedPayment(o);

        assertThat(reload(o).getPaymentStatus()).isEqualTo(Order.PaymentStatus.FAILED);
        assertThat(reload(o).getStatus()).isEqualTo(Order.Status.CANCELLED);
        assertThat(OrderService.countsAsRevenue(reload(o))).isFalse();
    }
}
