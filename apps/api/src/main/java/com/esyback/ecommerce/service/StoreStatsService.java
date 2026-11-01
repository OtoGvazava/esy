package com.esyback.ecommerce.service;

import com.esyback.ecommerce.config.PlatformProperties;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.OrderItem;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * A store's own numbers over a period: the back office's Analytics screen
 * (X1: a 7, 30 or 90 day window or all time, day by day, with the best
 * sellers) and its Finances screen (X2: month by month, with the commission).
 *
 * <p>Nothing here is a new rule. Revenue, the commission owed and the refund
 * count are {@link OrderService}'s own functions applied to the orders of one
 * window, so a day's bar, a month's row and the admin billing screen's month
 * all come from one calculation and cannot disagree. Like billing, a window is
 * read against {@code Order.createdAt}, the server's local clock the orders
 * were stamped with.
 */
@Service
@RequiredArgsConstructor
public class StoreStatsService {

    /** The windows the Analytics screen offers, in days. No days means all time. */
    public static final List<Integer> PERIODS = List.of(7, 30, 90);

    /** Best sellers listed. */
    static final int TOP = 4;

    /** How far back the Finances table goes at most. */
    public static final int MAX_MONTHS = 24;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PlatformProperties platformProperties;

    @Transactional(readOnly = true)
    public Map<String, Object> period(Tenant tenant, Integer days) {
        return period(tenant, days, LocalDate.now());
    }

    /**
     * One window ending {@code today}, inclusive: {@code days} days, or with
     * no days every day since the store's first order.
     *
     * <ul>
     *   <li><b>revenue, counted, average</b> — revenue is
     *       {@link OrderService#revenueOf}; the average divides it by the orders
     *       it counted (not cancelled, not refunded), so it is null when there
     *       are none rather than a misleading zero.</li>
     *   <li><b>orders</b> — every order placed in the window, whatever became
     *       of it.</li>
     *   <li><b>refundCount, refunded, sales</b> — the orders whose money is
     *       being or has been returned, as billing counts them, the amount sent
     *       back, and the sales it is a share of.</li>
     *   <li><b>previous</b> — the same figures for the window just before, the
     *       same length; null for all time, which has nothing before it.</li>
     *   <li><b>series</b> — revenue per day (per month for all time), every
     *       day present, zero days included, so a chart never invents a gap.</li>
     *   <li><b>top</b> — the best sellers by revenue among the counted orders,
     *       with the quantity sold; the title and photo are the product's
     *       current ones while it exists, the order line's otherwise.</li>
     * </ul>
     */
    @Transactional(readOnly = true)
    public Map<String, Object> period(Tenant tenant, Integer days, LocalDate today) {
        boolean lifetime = days == null || days == 0;
        if (!lifetime && !PERIODS.contains(days)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "days must be one of " + PERIODS + ", or none for all time");
        }
        List<Order> all = orderRepository.findByTenantOrderByCreatedAtDesc(tenant);
        LocalDate first = lifetime ? firstDay(all, today) : today.minusDays(days - 1L);
        LocalDateTime from = first.atStartOfDay();
        LocalDateTime to = today.plusDays(1).atStartOfDay();
        List<Order> in = between(all, from, to);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("days", lifetime ? null : days);
        body.put("from", first.toString());
        body.put("to", today.toString());
        putFigures(body, in);
        if (lifetime) {
            body.put("previous", null);
        } else {
            Map<String, Object> prev = new LinkedHashMap<>();
            putFigures(prev, between(all, from.minusDays(days), from));
            body.put("previous", prev);
        }
        body.put("unit", lifetime ? "month" : "day");
        body.put("series", lifetime
            ? monthly(in, YearMonth.from(first), YearMonth.from(today))
            : daily(in, first, today));
        body.put("top", top(in));
        return body;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> months(Tenant tenant) {
        return months(tenant, YearMonth.now());
    }

    /**
     * Month by month, newest first, from {@code current} back to the month of
     * the store's first order (at most {@link #MAX_MONTHS}); the current month
     * is always there, even before the first sale. Each month's revenue and
     * commission are the billing screen's own figures for that month
     * ({@link OrderService#revenueOf}, {@link OrderService#feesOwedOf}).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> months(Tenant tenant, YearMonth current) {
        List<Order> all = orderRepository.findByTenantOrderByCreatedAtDesc(tenant);
        YearMonth oldest = all.stream()
            .map(Order::getCreatedAt).filter(Objects::nonNull)
            .map(YearMonth::from).min(Comparator.naturalOrder())
            .orElse(current);
        if (oldest.isAfter(current)) oldest = current;
        YearMonth floor = current.minusMonths(MAX_MONTHS - 1L);
        if (oldest.isBefore(floor)) oldest = floor;

        Map<YearMonth, List<Order>> byMonth = all.stream()
            .filter(o -> o.getCreatedAt() != null)
            .collect(Collectors.groupingBy(o -> YearMonth.from(o.getCreatedAt())));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (YearMonth m = current; !m.isBefore(oldest); m = m.minusMonths(1)) {
            List<Order> orders = byMonth.getOrDefault(m, List.of());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", m.toString());
            row.put("orders", orders.size());
            row.put("revenue", OrderService.revenueOf(orders));
            row.put("feesOwed", OrderService.feesOwedOf(orders));
            rows.add(row);
        }
        Map<String, Object> body = new LinkedHashMap<>();
        // The rate new orders are charged today; each order keeps its own, so
        // this labels the screen and computes nothing.
        body.put("serviceFeeRate", platformProperties.getServiceFeeRate());
        body.put("months", rows);
        return body;
    }

    // ------------------------------------------------------------- helpers

    private static LocalDate firstDay(List<Order> orders, LocalDate today) {
        return orders.stream()
            .map(Order::getCreatedAt).filter(Objects::nonNull)
            .map(LocalDateTime::toLocalDate)
            .min(Comparator.naturalOrder())
            .filter(d -> !d.isAfter(today))
            .orElse(today);
    }

    /** Orders placed in [from, to). */
    private static List<Order> between(List<Order> orders, LocalDateTime from, LocalDateTime to) {
        return orders.stream()
            .filter(o -> o.getCreatedAt() != null
                && !o.getCreatedAt().isBefore(from) && o.getCreatedAt().isBefore(to))
            .toList();
    }

    private static void putFigures(Map<String, Object> m, Collection<Order> orders) {
        BigDecimal revenue = OrderService.revenueOf(orders);
        long counted = orders.stream().filter(OrderService::countsAsRevenue).count();
        List<Order> refunds = orders.stream()
            .filter(OrderService::isBillable).filter(OrderService::isBeingRefunded).toList();
        m.put("orders", orders.size());
        m.put("revenue", revenue);
        m.put("counted", counted);
        m.put("average", counted == 0 ? null
            : revenue.divide(BigDecimal.valueOf(counted), 2, RoundingMode.HALF_UP));
        m.put("refundCount", refunds.size());
        m.put("refunded", refunds.stream().map(Order::refundedOrZero).reduce(BigDecimal.ZERO, BigDecimal::add));
        m.put("sales", OrderService.billingFigures(orders).sales());
    }

    private static List<Map<String, Object>> daily(List<Order> orders, LocalDate first, LocalDate last) {
        Map<LocalDate, List<Order>> byDay = orders.stream()
            .collect(Collectors.groupingBy(o -> o.getCreatedAt().toLocalDate()));
        List<Map<String, Object>> points = new ArrayList<>();
        for (LocalDate d = first; !d.isAfter(last); d = d.plusDays(1)) {
            points.add(point(d.toString(), byDay.getOrDefault(d, List.of())));
        }
        return points;
    }

    private static List<Map<String, Object>> monthly(List<Order> orders, YearMonth first, YearMonth last) {
        Map<YearMonth, List<Order>> byMonth = orders.stream()
            .collect(Collectors.groupingBy(o -> YearMonth.from(o.getCreatedAt())));
        List<Map<String, Object>> points = new ArrayList<>();
        for (YearMonth m = first; !m.isAfter(last); m = m.plusMonths(1)) {
            points.add(point(m.toString(), byMonth.getOrDefault(m, List.of())));
        }
        return points;
    }

    private static Map<String, Object> point(String date, List<Order> orders) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("date", date);
        p.put("revenue", OrderService.revenueOf(orders));
        return p;
    }

    /** One product's line in the best sellers, summed over the window. */
    private static final class Seller {
        Long productId;
        String title;
        long quantity;
        BigDecimal revenue = BigDecimal.ZERO;
    }

    private List<Map<String, Object>> top(List<Order> orders) {
        Map<String, Seller> sellers = new HashMap<>();
        for (Order o : orders) {
            if (!OrderService.countsAsRevenue(o)) continue;
            for (OrderItem it : o.getItems()) {
                int qty = it.getQuantity() == null ? 0 : it.getQuantity();
                if (qty <= 0) continue;
                // Lines of a deleted product still name it, so they group by title.
                String key = it.getProductId() != null ? "p" + it.getProductId() : "t" + it.getTitle();
                Seller s = sellers.computeIfAbsent(key, k -> new Seller());
                s.productId = it.getProductId();
                if (s.title == null) s.title = it.getTitle();
                s.quantity += qty;
                BigDecimal price = it.getPrice() == null ? BigDecimal.ZERO : it.getPrice();
                s.revenue = s.revenue.add(price.multiply(BigDecimal.valueOf(qty)));
            }
        }
        List<Seller> best = sellers.values().stream()
            .sorted(Comparator.comparing((Seller s) -> s.revenue).reversed()
                .thenComparing(s -> s.quantity, Comparator.reverseOrder())
                .thenComparing(s -> String.valueOf(s.title)))
            .limit(TOP)
            .toList();
        List<Long> ids = best.stream().map(s -> s.productId).filter(Objects::nonNull).toList();
        Map<Long, Product> products = ids.isEmpty() ? Map.of()
            : productRepository.findAllById(ids).stream().collect(Collectors.toMap(Product::getId, Function.identity()));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Seller s : best) {
            Product p = s.productId == null ? null : products.get(s.productId);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("productId", s.productId);
            row.put("title", p != null && p.getTitle() != null ? p.getTitle() : s.title);
            row.put("imageUrl", p == null ? null : p.getImageUrl());
            row.put("quantity", s.quantity);
            row.put("revenue", s.revenue.setScale(2, RoundingMode.HALF_UP));
            rows.add(row);
        }
        return rows;
    }
}
