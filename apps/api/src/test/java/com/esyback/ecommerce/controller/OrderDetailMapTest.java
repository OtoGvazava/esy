package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.OrderItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The shopper's one-order view (GET /api/orders/{n}).
 *
 * <p>The order screen names how it travels and what that cost, says how much
 * is on its way back after a refund, and the bank's return page rebuilds a
 * lost bag from the lines — so those facts must be in the body, as frozen on
 * the order.
 */
class OrderDetailMapTest {

    private static Order order() {
        Order o = new Order();
        o.setOrderNumber("ESY-1042-1");
        o.setStatus(Order.Status.CANCELLED);
        o.setPaymentStatus(Order.PaymentStatus.REFUND_PENDING);
        o.setTotal(new BigDecimal("133.00"));
        o.setDeliveryRoute("tbilisi");
        o.setDeliveryFee(BigDecimal.ZERO);
        o.setRefundedAmount(new BigDecimal("133.00"));
        OrderItem vase = new OrderItem();
        vase.setProductId(19L);
        vase.setVariantId(7L);
        vase.setTitle("Vase");
        vase.setVariantLabel("M · sea green");
        vase.setPrice(new BigDecimal("95.00"));
        vase.setQuantity(1);
        o.addItem(vase);
        return o;
    }

    @Test
    @DisplayName("the delivery route, its price and the refunded amount are in the body")
    void deliveryAndRefund() {
        Map<String, Object> m = OrderController.toDetailMap(order());
        assertThat(m.get("deliveryRoute")).isEqualTo("tbilisi");
        assertThat(m.get("deliveryFee")).isEqualTo(BigDecimal.ZERO);
        assertThat(m.get("deliveryExpress")).isEqualTo(false);
        assertThat(m.get("refunded")).isEqualTo(new BigDecimal("133.00"));
        assertThat(m.get("paymentStatus")).isEqualTo("refund_pending");
    }

    @Test
    @DisplayName("nothing refunded reads as zero, never null")
    void noRefundIsZero() {
        Order o = order();
        o.setRefundedAmount(null);
        o.setDeliveryExpress(null);
        Map<String, Object> m = OrderController.toDetailMap(o);
        assertThat(m.get("refunded")).isEqualTo(BigDecimal.ZERO);
        assertThat(m.get("deliveryExpress")).isEqualTo(false);
    }

    @Test
    @DisplayName("each line names its product and combination")
    @SuppressWarnings("unchecked")
    void linesNameTheirProduct() {
        List<Map<String, Object>> lines = (List<Map<String, Object>>) OrderController.toDetailMap(order()).get("lines");
        assertThat(lines).hasSize(1);
        assertThat(lines.get(0).get("productId")).isEqualTo(19L);
        assertThat(lines.get(0).get("variantId")).isEqualTo(7L);
        assertThat(lines.get(0).get("lineTotal")).isEqualTo(new BigDecimal("95.00"));
    }
}
