package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Tenant;

import java.math.BigDecimal;

/**
 * The few columns of an order that revenue and fee figures read, for the
 * platform-wide admin screens. Loading every order on the platform as a full
 * entity (with its store) on each store-list load grew with the whole
 * platform's history; this reads just the money.
 *
 * <p>{@link #toOrder()} gives a detached, unsaved Order carrying only these
 * fields, so the money rules stay in OrderService's static helpers rather than
 * being rewritten here, where they could drift from the merchant's own stats.
 */
public record OrderMoney(Long tenantId, BigDecimal total, BigDecimal deliveryFee, BigDecimal serviceFee,
                         BigDecimal refundedAmount, Order.Status status, Order.PaymentStatus paymentStatus) {

    public Order toOrder() {
        Order o = new Order();
        Tenant t = new Tenant();
        t.setId(tenantId);
        o.setTenant(t);
        o.setTotal(total);
        o.setDeliveryFee(deliveryFee);
        o.setServiceFee(serviceFee);
        o.setRefundedAmount(refundedAmount);
        o.setStatus(status);
        o.setPaymentStatus(paymentStatus);
        return o;
    }
}
