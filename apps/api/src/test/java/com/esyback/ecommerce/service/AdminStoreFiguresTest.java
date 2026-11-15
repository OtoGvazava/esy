package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The admin store list reads every order once for all stores, and the store
 * detail only the newest ten (review, Low: "The admin store list and billing
 * load every order on the platform, several times per request"). The figures
 * must still be the merchant's own: OrderService's per-store answers.
 */
@SpringBootTest
@Transactional
class AdminStoreFiguresTest {

    @Autowired AdminService adminService;
    @Autowired OrderService orderService;
    @Autowired OrderRepository orderRepository;
    @Autowired TenantRepository tenantRepository;

    private Tenant store(String sub) {
        Tenant t = new Tenant();
        t.setName("Figures " + sub);
        t.setSubdomain(sub);
        t.setIsActive(true);
        return tenantRepository.save(t);
    }

    private void order(Tenant t, String total, String fee, Order.PaymentStatus paid, LocalDateTime at) {
        Order o = new Order();
        o.setOrderNumber("FIG-" + UUID.randomUUID());
        o.setTenant(t);
        o.setTotal(new BigDecimal(total));
        o.setServiceFee(new BigDecimal(fee));
        o.setStatus(Order.Status.DELIVERED);
        o.setPaymentStatus(paid);
        Order saved = orderRepository.saveAndFlush(o);
        saved.setCreatedAt(at);
        orderRepository.saveAndFlush(saved);
    }

    @Test
    @DisplayName("the store list's order count, revenue and fees match the store's own figures")
    void listMatchesPerStoreFigures() {
        Tenant a = store("figures-a");
        Tenant b = store("figures-b");
        LocalDateTime when = LocalDateTime.of(2032, 5, 1, 12, 0);
        order(a, "100.00", "2.00", Order.PaymentStatus.PAID, when);
        order(a, "40.00", "0.80", Order.PaymentStatus.REFUNDED, when);
        order(a, "10.00", "0.20", Order.PaymentStatus.NONE, when);
        order(b, "70.00", "1.40", Order.PaymentStatus.PAID, when);

        for (Tenant t : List.of(a, b)) {
            Map<String, Object> row = adminService.listStores(t.getSubdomain()).stream()
                .filter(r -> t.getSubdomain().equals(r.get("subdomain"))).findFirst().orElseThrow();
            assertThat(row.get("orderCount")).isEqualTo(orderService.orderCount(t));
            assertThat((BigDecimal) row.get("revenue")).isEqualByComparingTo(orderService.revenue(t));
            assertThat((BigDecimal) row.get("feesOwed")).isEqualByComparingTo(orderService.serviceFeesOwed(t));
        }
    }

    @Test
    @DisplayName("the store detail carries the ten newest orders")
    @SuppressWarnings("unchecked")
    void recentOrdersAreTheNewestTen() {
        Tenant t = store("figures-recent");
        LocalDateTime start = LocalDateTime.of(2032, 1, 1, 0, 0);
        for (int i = 0; i < 12; i++) {
            order(t, String.valueOf(10 + i) + ".00", "0.10", Order.PaymentStatus.PAID, start.plusDays(i));
        }

        List<Map<String, Object>> recent =
            (List<Map<String, Object>>) adminService.storeDetail("figures-recent").get("recentOrders");

        assertThat(recent).hasSize(10);
        assertThat((BigDecimal) recent.get(0).get("total")).isEqualByComparingTo("21.00");
        assertThat((BigDecimal) recent.get(9).get("total")).isEqualByComparingTo("12.00");
    }
}
