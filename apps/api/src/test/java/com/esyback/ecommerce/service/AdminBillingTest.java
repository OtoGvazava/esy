package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The platform billing screen (admin.esy.ge/billing): sales and commission per
 * store over one month, and what is left owed once refunds are written off.
 *
 * <p>The orders here are dated in March 2031, a month nothing else in the test
 * database touches, so the platform totals are exactly these orders and can be
 * asserted to the tetri.
 */
@SpringBootTest
@Transactional
class AdminBillingTest {

    @Autowired AdminService adminService;
    @Autowired OrderService orderService;
    @Autowired OrderRepository orderRepository;
    @Autowired TenantRepository tenantRepository;

    private static final String MONTH = "2031-03";
    private static final LocalDateTime IN_MONTH = LocalDateTime.of(2031, 3, 14, 12, 0);
    private static final LocalDateTime NEXT_MONTH = LocalDateTime.of(2031, 4, 1, 0, 0);
    private static final LocalDateTime LAST_MOMENT = LocalDateTime.of(2031, 3, 31, 23, 59, 59);

    private Tenant small;
    private Tenant big;
    private Tenant quiet;

    @BeforeEach
    void setUp() {
        small = store("billing-small", "Billing Small");
        big = store("billing-big", "Billing Big");
        quiet = store("billing-quiet", "Billing Quiet");
    }

    private Tenant store(String sub, String name) {
        Tenant t = tenantRepository.findBySubdomain(sub).orElseGet(() -> {
            Tenant fresh = new Tenant();
            fresh.setName(name);
            fresh.setSubdomain(sub);
            fresh.setIsActive(true);
            return tenantRepository.save(fresh);
        });
        orderRepository.deleteAll(orderRepository.findByTenantOrderByCreatedAtDesc(t));
        return t;
    }

    /** An order as checkout leaves it: total charged, delivery inside it, fee frozen on the goods. */
    private Order order(Tenant t, String total, String delivery, String fee,
                        Order.Status status, Order.PaymentStatus paid, LocalDateTime at) {
        Order o = new Order();
        o.setOrderNumber("BILL-" + UUID.randomUUID());
        o.setTenant(t);
        o.setTotal(new BigDecimal(total));
        o.setDeliveryFee(delivery == null ? null : new BigDecimal(delivery));
        o.setServiceFee(new BigDecimal(fee));
        o.setStatus(status);
        o.setPaymentStatus(paid);
        Order saved = orderRepository.saveAndFlush(o);
        // @PrePersist stamps "now"; billing reads the month, so move it.
        saved.setCreatedAt(at);
        return orderRepository.saveAndFlush(saved);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> rows(Map<String, Object> body) {
        return (List<Map<String, Object>>) body.get("stores");
    }

    private static Map<String, Object> row(Map<String, Object> body, String sub) {
        return rows(body).stream().filter(r -> sub.equals(r.get("subdomain"))).findFirst().orElse(null);
    }

    private static BigDecimal money(Map<String, Object> m, String key) {
        return (BigDecimal) m.get(key);
    }

    /** The small store's March: every payment state once, plus one order with delivery. */
    private void smallStoresMarch() {
        order(small, "100.00", null, "2.00", Order.Status.DELIVERED, Order.PaymentStatus.PAID, IN_MONTH);
        order(small, "50.00", null, "1.00", Order.Status.PLACED, Order.PaymentStatus.NONE, IN_MONTH);
        order(small, "30.00", null, "0.60", Order.Status.DELIVERED, Order.PaymentStatus.REFUNDED, IN_MONTH);
        order(small, "20.00", null, "0.40", Order.Status.SHIPPED, Order.PaymentStatus.REFUND_PENDING, LAST_MOMENT);
        // Delivery is the courier's money: 5 of the 105 charged is not a sale.
        order(small, "105.00", "5.00", "2.00", Order.Status.PLACED, Order.PaymentStatus.PAID, IN_MONTH);
        // Never billable: cancelled (even though paid), and still at the bank.
        order(small, "40.00", null, "0.80", Order.Status.CANCELLED, Order.PaymentStatus.PAID, IN_MONTH);
        order(small, "10.00", null, "0.20", Order.Status.PLACED, Order.PaymentStatus.PENDING, IN_MONTH);
    }

    @Test
    @DisplayName("a store's month: sales and commission before refunds, refunds written off, the rest owed")
    void oneStoresFigures() {
        smallStoresMarch();

        Map<String, Object> body = adminService.billing(MONTH);
        Map<String, Object> r = row(body, "billing-small");

        assertThat(r).isNotNull();
        assertThat(r.get("orderCount")).isEqualTo(7L);
        assertThat(money(r, "sales")).isEqualByComparingTo("300.00");
        assertThat(money(r, "feesAccrued")).isEqualByComparingTo("6.00");
        assertThat(money(r, "feesWrittenOff")).isEqualByComparingTo("1.00");
        assertThat(r.get("refundCount")).isEqualTo(2L);
        assertThat(money(r, "feesOwed")).isEqualByComparingTo("5.00");
        // What is owed is what accrued less what refunds wrote off — computed
        // independently, so this is a check and not a tautology.
        assertThat(money(r, "feesOwed"))
            .isEqualByComparingTo(money(r, "feesAccrued").subtract(money(r, "feesWrittenOff")));
        assertThat(body.get("month")).isEqualTo(MONTH);
    }

    @Test
    @DisplayName("only that month counts; stores with nothing billable are left out; biggest commission first")
    void monthScopeAndOrder() {
        smallStoresMarch();
        order(big, "500.00", null, "10.00", Order.Status.DELIVERED, Order.PaymentStatus.PAID, IN_MONTH);
        // April is another month's bill.
        order(big, "900.00", null, "18.00", Order.Status.DELIVERED, Order.PaymentStatus.PAID, NEXT_MONTH);
        // The quiet store only has an order that never paid.
        order(quiet, "70.00", null, "1.40", Order.Status.PLACED, Order.PaymentStatus.PENDING, IN_MONTH);

        Map<String, Object> body = adminService.billing(MONTH);

        assertThat(rows(body)).extracting(r -> r.get("subdomain"))
            .containsExactly("billing-big", "billing-small");
        assertThat(money(row(body, "billing-big"), "sales")).isEqualByComparingTo("500.00");

        @SuppressWarnings("unchecked")
        Map<String, Object> totals = (Map<String, Object>) body.get("totals");
        assertThat(totals.get("storeCount")).isEqualTo(2);
        assertThat(money(totals, "sales")).isEqualByComparingTo("800.00");
        assertThat(money(totals, "feesAccrued")).isEqualByComparingTo("16.00");
        assertThat(money(totals, "feesWrittenOff")).isEqualByComparingTo("1.00");
        assertThat(totals.get("refundCount")).isEqualTo(2L);
        assertThat(money(totals, "feesOwed")).isEqualByComparingTo("15.00");
        // The original field keeps its meaning: owed after refunds.
        assertThat(money(body, "totalAccrued")).isEqualByComparingTo("15.00");
        assertThat(money(body, "serviceFeeRate")).isNotNull();
    }

    @Test
    @DisplayName("all time agrees with the figures the merchant's own screens use")
    void allTimeMatchesTheMerchantScreens() {
        smallStoresMarch();
        order(small, "80.00", null, "1.60", Order.Status.DELIVERED, Order.PaymentStatus.PAID, NEXT_MONTH);

        Map<String, Object> r = row(adminService.billing(null), "billing-small");

        assertThat(r).isNotNull();
        assertThat(money(r, "feesOwed")).isEqualByComparingTo(orderService.serviceFeesOwed(small));
        assertThat(money(r, "revenue")).isEqualByComparingTo(orderService.revenue(small));
        assertThat(r.get("orderCount")).isEqualTo(orderService.orderCount(small));
        assertThat(money(r, "sales")).isEqualByComparingTo("380.00");
    }

    @Test
    @DisplayName("a month that is not YYYY-MM is a 400, not a silent all-time answer")
    void badMonth() {
        assertThatThrownBy(() -> adminService.billing("October"))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
