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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * A payment outcome only moves an order from a state where that outcome makes
 * sense (review finding H11): a late or replayed "rejected" must not cancel a
 * paid order, and "refunded" must not land on money that was never taken.
 */
@SpringBootTest
class PaymentSettleGuardTest {

    @Autowired OrderService orderService;
    @Autowired ProductRepository productRepository;
    @Autowired TenantRepository tenantRepository;

    @MockitoBean TenantContextService tenantContextService;

    private static final String SUB = "settle-guard-store";
    private Tenant tenant;
    private Product mug;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Settle Guard Store");
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

    private Order cardOrder() {
        CreateOrderRequest req = new CreateOrderRequest();
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(mug.getId());
        item.setTitle(mug.getTitle());
        item.setPrice(mug.getPrice());
        item.setQuantity(1);
        req.setItems(List.of(item));
        Order order = orderService.createOrder(null, tenant, req);
        return orderService.markBogPending(order, "bog-" + order.getOrderNumber());
    }

    @Test
    @Transactional
    @DisplayName("a pending payment can fail, and failing cancels the order")
    void pendingCanFail() {
        Order o = orderService.settlePayment(cardOrder().getOrderNumber(), Order.PaymentStatus.FAILED).orElseThrow();
        assertThat(o.getPaymentStatus()).isEqualTo(Order.PaymentStatus.FAILED);
        assertThat(o.getStatus()).isEqualTo(Order.Status.CANCELLED);
    }

    @Test
    @Transactional
    @DisplayName("a late 'rejected' leaves a paid order paid and open")
    void paidCannotFail() {
        String n = cardOrder().getOrderNumber();
        orderService.settlePayment(n, Order.PaymentStatus.PAID);
        Order o = orderService.settlePayment(n, Order.PaymentStatus.FAILED).orElseThrow();
        assertThat(o.getPaymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
        assertThat(o.getStatus()).isNotEqualTo(Order.Status.CANCELLED);
    }

    @Test
    @Transactional
    @DisplayName("'refunded' lands on a paid order but not on one that was never paid")
    void refundedNeedsMoney() {
        Order pending = orderService.settlePayment(cardOrder().getOrderNumber(), Order.PaymentStatus.REFUNDED).orElseThrow();
        assertThat(pending.getPaymentStatus()).isEqualTo(Order.PaymentStatus.PENDING);

        String n = cardOrder().getOrderNumber();
        orderService.settlePayment(n, Order.PaymentStatus.PAID);
        Order refunded = orderService.settlePayment(n, Order.PaymentStatus.REFUNDED).orElseThrow();
        assertThat(refunded.getPaymentStatus()).isEqualTo(Order.PaymentStatus.REFUNDED);
    }

    @Test
    @Transactional
    @DisplayName("a confirmed partial refund puts the order back to PAID with the rest refundable")
    void partialRefundKeepsTheRest() {
        String n = cardOrder().getOrderNumber();
        orderService.settlePayment(n, Order.PaymentStatus.PAID);
        Order o = orderService.findByOrderNumber(n).orElseThrow();
        // What requestRefund's claim leaves behind: 10 of the 24 pending.
        o.setRefundedAmount(new BigDecimal("10.00"));
        o.setPaymentStatus(Order.PaymentStatus.REFUND_PENDING);

        Order after = orderService.settlePayment(n, Order.PaymentStatus.REFUNDED).orElseThrow();

        assertThat(after.getPaymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
        assertThat(after.refundableAmount()).isEqualByComparingTo("14.00");
    }

    @Test
    @Transactional
    @DisplayName("an order whose card payment is still pending cannot be shipped (it can be cancelled)")
    void noShippingWhilePending() {
        Order o = cardOrder();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.updateStatus(tenant, o.getId(), Order.Status.SHIPPED))
            .isInstanceOf(com.esyback.ecommerce.web.ApiRefusal.class)
            .satisfies(e -> assertThat(((com.esyback.ecommerce.web.ApiRefusal) e).getCode()).isEqualTo("PAYMENT_PENDING"));
        assertThat(orderService.updateStatus(tenant, o.getId(), Order.Status.CANCELLED).getStatus())
            .isEqualTo(Order.Status.CANCELLED);
    }

    @Test
    @Transactional
    @DisplayName("a courier order with no address is refused instead of being charged for delivery to nowhere")
    void courierNeedsAnAddress() {
        CreateOrderRequest req = new CreateOrderRequest();
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(mug.getId());
        item.setQuantity(1);
        req.setItems(List.of(item));
        req.setDeliveryRoute("tbilisi");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createOrder(null, tenant, req))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
}
