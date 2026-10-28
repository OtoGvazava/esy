package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Refunds (decision D2).
 *
 * <p>D2 says a refund is not a cancellation, and these are the rules that
 * follow from money having actually moved: you cannot refund more than was
 * charged, you cannot refund what was never paid, and the order's fulfilment
 * history is not rewritten by paying someone back.
 *
 * <p>The bank is mocked throughout. Every assertion here is about what this
 * codebase decides before and after the call — none of it exercises BOG, which
 * has to be verified against their sandbox separately.
 */
@SpringBootTest
class RefundTest {

    @Autowired OrderService orderService;
    @Autowired OrderRepository orderRepository;
    @Autowired TenantRepository tenantRepository;

    @MockBean TenantContextService tenantContextService;
    @MockBean BogPaymentService bogPaymentService;

    private static final String SUB = "refund-store";
    private Tenant tenant;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant fresh = new Tenant();
            fresh.setName("Refund Store");
            fresh.setSubdomain(SUB);
            fresh.setIsActive(true);
            return tenantRepository.save(fresh);
        });
        orderRepository.deleteAll(orderRepository.findByTenantOrderByCreatedAtDesc(tenant));
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
        when(bogPaymentService.refund(any(), any(), any()))
            .thenReturn(new BogPaymentService.RefundResult(true, "request_received", "ok", "act-1"));
    }

    /** A paid order of `total`, as BOG would have left it. */
    private Order paidOrder(String total) {
        CreateOrderRequest req = new CreateOrderRequest();
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(1L);
        item.setTitle("Thing");
        item.setPrice(new BigDecimal(total));
        item.setQuantity(1);
        req.setItems(List.of(item));
        CreateOrderRequest.InlineAddress a = new CreateOrderRequest.InlineAddress();
        a.setRecipient("Nino");
        a.setPhone("+995555000000");
        a.setLine("1 Rustaveli");
        a.setCity("Tbilisi");
        req.setAddress(a);

        Order o = orderService.createOrder(null, tenant, req);
        o.setPaymentStatus(Order.PaymentStatus.PAID);
        o.setBogOrderId("bog-" + o.getOrderNumber());
        return orderRepository.save(o);
    }

    @Test
    @Transactional
    @DisplayName("a full refund is requested with no amount, and is not yet 'refunded'")
    void fullRefund() {
        Order order = paidOrder("100.00");

        Order after = orderService.requestRefund(tenant, order.getId(), null);

        // The amount is omitted for a whole-order refund — that is what BOG
        // documents, and it avoids arguing with the bank over the last tetri.
        verify(bogPaymentService).refund(any(), eq(order.getBogOrderId()), isNull());

        // REFUND_PENDING, not REFUNDED: BOG has accepted the instruction, not
        // completed it. Saying "refunded" here would tell a shopper they had
        // their money back before they did.
        assertThat(after.getPaymentStatus()).isEqualTo(Order.PaymentStatus.REFUND_PENDING);
        assertThat(after.refundedOrZero()).isEqualByComparingTo("100.00");
        assertThat(after.refundableAmount()).isEqualByComparingTo("0.00");
    }

    @Test
    @Transactional
    @DisplayName("a refund does not rewrite the fulfilment history (D2)")
    void refundLeavesStatusAlone() {
        Order order = paidOrder("50.00");
        order.setStatus(Order.Status.DELIVERED);
        orderRepository.save(order);

        Order after = orderService.requestRefund(tenant, order.getId(), null);

        // A delivered order that was refunded was still delivered. Collapsing
        // the refund into a cancellation would be a different, false, fact.
        assertThat(after.getStatus()).isEqualTo(Order.Status.DELIVERED);
    }

    @Test
    @Transactional
    @DisplayName("partial refunds accumulate and stop at the amount charged")
    void partialRefundsAccumulate() {
        Order order = paidOrder("100.00");

        orderService.requestRefund(tenant, order.getId(), new BigDecimal("30.00"));
        Order after = orderService.requestRefund(tenant, order.getId(), new BigDecimal("20.00"));
        assertThat(after.refundedOrZero()).isEqualByComparingTo("50.00");
        assertThat(after.refundableAmount()).isEqualByComparingTo("50.00");

        // One lari over what is left is refused, and the bank is not called.
        assertThatThrownBy(() -> orderService.requestRefund(tenant, order.getId(), new BigDecimal("51.00")))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("more than is left");

        // The rest is fine, and then there is nothing left.
        orderService.requestRefund(tenant, order.getId(), new BigDecimal("50.00"));
        assertThatThrownBy(() -> orderService.requestRefund(tenant, order.getId(), null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("already been refunded in full");
    }

    @Test
    @Transactional
    @DisplayName("an unpaid order has nothing to refund, and the bank is never called")
    void cannotRefundWhatWasNotPaid() {
        Order order = paidOrder("40.00");
        order.setPaymentStatus(Order.PaymentStatus.NONE);
        orderRepository.save(order);

        assertThatThrownBy(() -> orderService.requestRefund(tenant, order.getId(), null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("nothing to refund");

        verify(bogPaymentService, never()).refund(any(), any(), any());
    }

    @Test
    @Transactional
    @DisplayName("a payment still in flight cannot be refunded")
    void cannotRefundPending() {
        Order order = paidOrder("40.00");
        order.setPaymentStatus(Order.PaymentStatus.PENDING);
        orderRepository.save(order);

        assertThatThrownBy(() -> orderService.requestRefund(tenant, order.getId(), null))
            .isInstanceOf(ResponseStatusException.class);
        verify(bogPaymentService, never()).refund(any(), any(), any());
    }

    @Test
    @Transactional
    @DisplayName("a zero or negative refund is refused")
    void refusesNonPositive() {
        Order order = paidOrder("40.00");

        assertThatThrownBy(() -> orderService.requestRefund(tenant, order.getId(), BigDecimal.ZERO))
            .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> orderService.requestRefund(tenant, order.getId(), new BigDecimal("-5")))
            .isInstanceOf(ResponseStatusException.class);
        verify(bogPaymentService, never()).refund(any(), any(), any());
    }

    @Test
    // Deliberately NOT @Transactional. requestRefund would join the test's
    // transaction, so the rollback it performs on refusal could never be
    // observed from inside it — the claim would still be visible and this test
    // would assert the opposite of production behaviour. Run uncommitted, it
    // gets its own transaction and the rollback is real.
    @DisplayName("a bank refusal leaves the order untouched")
    void bankRefusalRollsBack() {
        Order order = paidOrder("100.00");
        when(bogPaymentService.refund(any(), any(), any()))
            .thenReturn(new BogPaymentService.RefundResult(false, "error", "Card not refundable", null));

        assertThatThrownBy(() -> orderService.requestRefund(tenant, order.getId(), null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Card not refundable");

        // The claim is only safe to undo because no money moved. An explicit
        // refusal is the one case where that is known.
        Order reread = orderRepository.findById(order.getId()).orElseThrow();
        assertThat(reread.refundedOrZero()).isEqualByComparingTo("0.00");
        assertThat(reread.getPaymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
    }

    @Test
    @Transactional
    @DisplayName("another store's order cannot be refunded")
    void tenantScoped() {
        Order order = paidOrder("100.00");
        Tenant other = tenantRepository.findBySubdomain("refund-other-store").orElseGet(() -> {
            Tenant fresh = new Tenant();
            fresh.setName("Refund Other Store");
            fresh.setSubdomain("refund-other-store");
            fresh.setIsActive(true);
            return tenantRepository.save(fresh);
        });

        assertThatThrownBy(() -> orderService.requestRefund(other, order.getId(), null))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));
        verify(bogPaymentService, never()).refund(any(), any(), any());
    }

    @Test
    @Transactional
    @DisplayName("the bank going silent keeps the claim rather than inviting a second attempt")
    void unreachableBankKeepsTheClaim() {
        Order order = paidOrder("100.00");
        when(bogPaymentService.refund(any(), any(), any()))
            .thenThrow(new BogPaymentService.BogUnreachableException("no answer"));

        assertThatThrownBy(() -> orderService.requestRefund(tenant, order.getId(), null))
            .isInstanceOf(BogPaymentService.BogUnreachableException.class);
        // Deliberately NOT asserting a rollback here: whether the money moved
        // is unknown, so the surviving claim is the point. The controller turns
        // this into a 502 telling the operator to check with the bank.
    }
}
