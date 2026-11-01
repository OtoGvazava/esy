package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.OrderItem;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The back office's Analytics (X1) and Finances (X2) figures: a window of
 * days with the one before it, revenue per day, the best sellers, and the
 * month-by-month table. Dated in 2032, which nothing else in the test
 * database touches, against a store of its own.
 */
@SpringBootTest
@Transactional
class StoreStatsServiceTest {

    @Autowired StoreStatsService stats;
    @Autowired OrderService orderService;
    @Autowired OrderRepository orderRepository;
    @Autowired TenantRepository tenantRepository;

    private static final LocalDate TODAY = LocalDate.of(2032, 5, 31);

    private Tenant store;

    @BeforeEach
    void setUp() {
        store = tenantRepository.findBySubdomain("stats-window").orElseGet(() -> {
            Tenant fresh = new Tenant();
            fresh.setName("Stats Window");
            fresh.setSubdomain("stats-window");
            fresh.setIsActive(true);
            return tenantRepository.save(fresh);
        });
        orderRepository.deleteAll(orderRepository.findByTenantOrderByCreatedAtDesc(store));
    }

    /** An order as checkout leaves it, with one line per {title, price, qty}, placed at {@code at}. */
    private Order order(String delivery, Order.Status status, Order.PaymentStatus paid, LocalDateTime at,
                        Object[]... lines) {
        Order o = new Order();
        o.setOrderNumber("STAT-" + UUID.randomUUID());
        o.setTenant(store);
        BigDecimal goods = BigDecimal.ZERO;
        for (Object[] l : lines) {
            OrderItem it = new OrderItem();
            it.setProductId((Long) l[0]);
            it.setTitle((String) l[1]);
            it.setPrice(new BigDecimal((String) l[2]));
            it.setQuantity((Integer) l[3]);
            o.addItem(it);
            goods = goods.add(it.getPrice().multiply(BigDecimal.valueOf(it.getQuantity())));
        }
        BigDecimal fee = delivery == null ? BigDecimal.ZERO : new BigDecimal(delivery);
        o.setTotal(goods.add(fee));
        o.setDeliveryFee(delivery == null ? null : fee);
        o.setServiceFee(goods.multiply(new BigDecimal("0.02")));
        o.setStatus(status);
        o.setPaymentStatus(paid);
        Order saved = orderRepository.saveAndFlush(o);
        // @PrePersist stamps "now"; the windows read the date, so move it.
        saved.setCreatedAt(at);
        return orderRepository.saveAndFlush(saved);
    }

    private static Object[] line(Long productId, String title, String price, int qty) {
        return new Object[] {productId, title, price, qty};
    }

    private static LocalDateTime on(int month, int day) {
        return LocalDateTime.of(2032, month, day, 12, 0);
    }

    private static BigDecimal money(Map<String, Object> m, String key) {
        return (BigDecimal) m.get(key);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> list(Map<String, Object> m, String key) {
        return (List<Map<String, Object>>) m.get(key);
    }

    /** May: four orders that count, one refunded, one cancelled; April: one; March: one. */
    private void seed() {
        order("5.00", Order.Status.DELIVERED, Order.PaymentStatus.PAID, on(5, 31),
            line(901L, "Vase", "90.00", 2));
        order(null, Order.Status.PLACED, Order.PaymentStatus.NONE, on(5, 20),
            line(902L, "Mug", "20.00", 3), line(901L, "Vase", "90.00", 1));
        order(null, Order.Status.SHIPPED, Order.PaymentStatus.PAID, on(5, 2),
            line(903L, "Cloth", "15.00", 4));
        order(null, Order.Status.DELIVERED, Order.PaymentStatus.REFUNDED, on(5, 10),
            line(902L, "Mug", "20.00", 1));
        order(null, Order.Status.CANCELLED, Order.PaymentStatus.NONE, on(5, 11),
            line(904L, "Bowl", "40.00", 1));
        // Outside the 30 days, inside the 30 before them.
        order(null, Order.Status.DELIVERED, Order.PaymentStatus.PAID, on(4, 15),
            line(901L, "Vase", "90.00", 1));
        order(null, Order.Status.DELIVERED, Order.PaymentStatus.PAID, on(3, 3),
            line(903L, "Cloth", "15.00", 2));
    }

    @Test
    @DisplayName("30 days: revenue without delivery or refunds, the average over the orders counted, the window before")
    void thirtyDays() {
        seed();
        Map<String, Object> body = stats.period(store, 30, TODAY);

        assertThat(body.get("from")).isEqualTo("2032-05-02");
        assertThat(body.get("to")).isEqualTo("2032-05-31");
        assertThat(body.get("orders")).isEqualTo(5);
        // 180 + 150 + 60: the 5 of delivery is the courier's.
        assertThat(money(body, "revenue")).isEqualByComparingTo("390.00");
        assertThat(body.get("counted")).isEqualTo(3L);
        assertThat(money(body, "average")).isEqualByComparingTo("130.00");
        assertThat(body.get("refundCount")).isEqualTo(1);
        // The revenue is exactly what OrderService says over the same orders.
        assertThat(money(body, "revenue")).isEqualByComparingTo(OrderService.revenueOf(
            orderRepository.findByTenantOrderByCreatedAtDesc(store).stream()
                .filter(o -> !o.getCreatedAt().toLocalDate().isBefore(LocalDate.of(2032, 5, 2))).toList()));

        @SuppressWarnings("unchecked")
        Map<String, Object> prev = (Map<String, Object>) body.get("previous");
        assertThat(prev.get("orders")).isEqualTo(1);
        assertThat(money(prev, "revenue")).isEqualByComparingTo("90.00");
        assertThat(money(prev, "average")).isEqualByComparingTo("90.00");
    }

    @Test
    @DisplayName("the day series has every day of the window, zero days included")
    void dailySeries() {
        seed();
        Map<String, Object> body = stats.period(store, 30, TODAY);
        List<Map<String, Object>> series = list(body, "series");

        assertThat(body.get("unit")).isEqualTo("day");
        assertThat(series).hasSize(30);
        assertThat(series.get(0).get("date")).isEqualTo("2032-05-02");
        assertThat(money(series.get(0), "revenue")).isEqualByComparingTo("60.00");
        assertThat(series.get(29).get("date")).isEqualTo("2032-05-31");
        assertThat(money(series.get(29), "revenue")).isEqualByComparingTo("180.00");
        // The refunded and the cancelled day earn nothing.
        assertThat(money(series.get(8), "revenue")).isEqualByComparingTo("0");
        assertThat(money(series.get(9), "revenue")).isEqualByComparingTo("0");
        BigDecimal sum = series.stream().map(p -> money(p, "revenue")).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(sum).isEqualByComparingTo(money(body, "revenue"));
    }

    @Test
    @DisplayName("best sellers by revenue over the counted orders, with the quantity sold")
    void bestSellers() {
        seed();
        List<Map<String, Object>> top = list(stats.period(store, 30, TODAY), "top");

        // Cloth and Mug both took 60; the one that sold more units goes first.
        assertThat(top).extracting(r -> r.get("title")).containsExactly("Vase", "Cloth", "Mug");
        assertThat(top.get(0).get("quantity")).isEqualTo(3L);
        assertThat(money(top.get(0), "revenue")).isEqualByComparingTo("270.00");
        assertThat(top.get(1).get("quantity")).isEqualTo(4L);
        // The refunded mug is not a sale, and the cancelled bowl is not listed.
        assertThat(top.get(2).get("quantity")).isEqualTo(3L);
    }

    @Test
    @DisplayName("all time runs from the first order, by month, with nothing before it")
    void allTime() {
        seed();
        Map<String, Object> body = stats.period(store, null, TODAY);

        assertThat(body.get("days")).isNull();
        assertThat(body.get("from")).isEqualTo("2032-03-03");
        assertThat(body.get("previous")).isNull();
        assertThat(body.get("unit")).isEqualTo("month");
        assertThat(list(body, "series")).extracting(p -> p.get("date")).containsExactly("2032-03", "2032-04", "2032-05");
        assertThat(money(body, "revenue")).isEqualByComparingTo("510.00");
    }

    @Test
    @DisplayName("a store with no orders: zeros, no average, and a window that still has its days")
    void empty() {
        Map<String, Object> body = stats.period(store, 7, TODAY);
        assertThat(money(body, "revenue")).isEqualByComparingTo("0");
        assertThat(body.get("average")).isNull();
        assertThat(list(body, "series")).hasSize(7);
        assertThat(list(body, "top")).isEmpty();
    }

    @Test
    @DisplayName("any window but 7, 30 or 90 days is a 400")
    void badWindow() {
        assertThatThrownBy(() -> stats.period(store, 14, TODAY))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    @DisplayName("months, newest first, back to the first order, each with the billing screen's commission")
    void months() {
        seed();
        Map<String, Object> body = stats.months(store, YearMonth.of(2032, 6));
        List<Map<String, Object>> rows = list(body, "months");

        assertThat(rows).extracting(r -> r.get("month")).containsExactly("2032-06", "2032-05", "2032-04", "2032-03");
        assertThat(money(rows.get(0), "revenue")).isEqualByComparingTo("0");
        assertThat(money(rows.get(1), "revenue")).isEqualByComparingTo("390.00");
        // Commission on the paid and the free-flow orders only: 2% of 180 + 150 + 60.
        assertThat(money(rows.get(1), "feesOwed")).isEqualByComparingTo("7.80");
        assertThat(money(body, "serviceFeeRate")).isNotNull();
    }
}
