package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Order;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * What a store is paid out, from the fee frozen on the order (review M20),
 * and which orders are revenue at all (review M3, M4).
 */
class OrderPayoutTest {

    private static Order order(String total, String fee, Order.Status status, Order.PaymentStatus ps, String refunded) {
        Order o = new Order();
        o.setTotal(new BigDecimal(total));
        o.setServiceFee(new BigDecimal(fee));
        o.setStatus(status);
        o.setPaymentStatus(ps);
        if (refunded != null) o.setRefundedAmount(new BigDecimal(refunded));
        return o;
    }

    @Test
    @DisplayName("charged less the frozen fee, delivery included: 110 with a 2.00 fee pays 108")
    void plainPayout() {
        assertThat(OrderService.payoutOf(order("110.00", "2.00", Order.Status.DELIVERED, Order.PaymentStatus.PAID, null)))
            .isEqualByComparingTo("108.00");
    }

    @Test
    @DisplayName("a partial refund comes off, with only its share of the fee")
    void partialRefund() {
        // Kept 60 of 100: fee 2.00 × 0.6 = 1.20; 60 − 1.20.
        assertThat(OrderService.payoutOf(order("100.00", "2.00", Order.Status.DELIVERED, Order.PaymentStatus.PAID, "40.00")))
            .isEqualByComparingTo("58.80");
    }

    @Test
    @DisplayName("nothing taken, nothing paid out; a full refund pays out nothing")
    void noMoney() {
        assertThat(OrderService.payoutOf(order("100.00", "2.00", Order.Status.PLACED, Order.PaymentStatus.PENDING, null))).isNull();
        assertThat(OrderService.payoutOf(order("100.00", "2.00", Order.Status.DELIVERED, Order.PaymentStatus.REFUNDED, "100.00")))
            .isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("an abandoned card checkout is no sale; a paid order cancelled without a refund is one")
    void revenueRules() {
        assertThat(OrderService.countsAsRevenue(order("300.00", "6.00", Order.Status.PLACED, Order.PaymentStatus.PENDING, null))).isFalse();
        assertThat(OrderService.countsAsRevenue(order("40.00", "0.80", Order.Status.CANCELLED, Order.PaymentStatus.PAID, null))).isTrue();
        assertThat(OrderService.countsAsRevenue(order("40.00", "0.80", Order.Status.CANCELLED, Order.PaymentStatus.NONE, null))).isFalse();
    }
}
