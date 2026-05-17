package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.OrderItem;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final MembershipService membershipService;

    // Platform service fee, fraction of order total (0.02 = 2%). Tunable via
    // PLATFORM_SERVICE_FEE_RATE without a redeploy. Field injection (not the
    // Lombok constructor) so the default applies even in tests.
    @Value("${app.platform.service-fee-rate:0.02}")
    private BigDecimal serviceFeeRate;

    public Order createOrder(User user, Tenant tenant, CreateOrderRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order has no items");
        }
        Order order = new Order();
        order.setUser(user);
        order.setTenant(tenant);
        order.setStatus(Order.Status.PLACED);
        order.setOrderNumber("ESY-" + ThreadLocalRandom.current().nextInt(1000, 9999)
            + "-" + ThreadLocalRandom.current().nextInt(1, 9));

        BigDecimal total = BigDecimal.ZERO;
        for (CreateOrderRequest.Item i : req.getItems()) {
            OrderItem oi = new OrderItem();
            oi.setProductId(i.getProductId());
            oi.setTitle(i.getTitle() == null ? "Item" : i.getTitle());
            BigDecimal price = i.getPrice() == null ? BigDecimal.ZERO : i.getPrice();
            int qty = i.getQuantity() == null || i.getQuantity() < 1 ? 1 : i.getQuantity();
            oi.setPrice(price);
            oi.setQuantity(qty);
            order.addItem(oi);
            total = total.add(price.multiply(BigDecimal.valueOf(qty)));
        }
        order.setTotal(total);
        // 2% platform fee, frozen at order time. Server-side only — never sent
        // to the client and never added to the BOG charge.
        order.setServiceFee(total.multiply(serviceFeeRate).setScale(2, RoundingMode.HALF_UP));

        // Buying makes the account a CUSTOMER of the store (no downgrade of owners).
        if (user != null) membershipService.ensure(user, tenant, StoreMembership.Role.CUSTOMER);
        return orderRepository.save(order);
    }

    /** Mark a freshly created order as awaiting BOG payment + record BOG's id. */
    public Order markBogPending(Order order, String bogOrderId) {
        order.setPaymentStatus(Order.PaymentStatus.PENDING);
        order.setBogOrderId(bogOrderId);
        return orderRepository.save(order);
    }

    public Optional<Order> findByOrderNumber(String orderNumber) {
        return orderNumber == null ? Optional.empty()
            : orderRepository.findByOrderNumber(orderNumber);
    }

    /**
     * Apply a terminal BOG payment outcome. PAID leaves the order PLACED
     * (ready to fulfill); FAILED cancels it so it drops out of the store's
     * actionable queue. Idempotent — repeated callbacks for an already-settled
     * order are a no-op, so BOG retries are safe.
     */
    public Optional<Order> settlePayment(String orderNumber, Order.PaymentStatus outcome) {
        if (outcome == null) return findByOrderNumber(orderNumber);
        return findByOrderNumber(orderNumber).map(order -> {
            if (order.getPaymentStatus() == outcome) return order;
            order.setPaymentStatus(outcome);
            if (outcome == Order.PaymentStatus.FAILED) {
                order.setStatus(Order.Status.CANCELLED);
            }
            return orderRepository.save(order);
        });
    }

    public List<Order> ordersForUser(User user) {
        return orderRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public List<Order> ordersForTenant(Tenant tenant) {
        return orderRepository.findByTenantOrderByCreatedAtDesc(tenant);
    }

    public long orderCount(Tenant tenant) {
        return orderRepository.countByTenant(tenant);
    }

    // "New" = freshly received, not yet acted on (PLACED is the status set on
    // checkout). Drives the owner-bar Orders badge.
    public long newOrderCount(Tenant tenant) {
        return orderRepository.countByTenantAndStatus(tenant, Order.Status.PLACED);
    }

    public BigDecimal revenue(Tenant tenant) {
        return orderRepository.findByTenantOrderByCreatedAtDesc(tenant).stream()
            .map(Order::getTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Platform service fees this store owes (for periodic out-of-band billing).
     * Counts only revenue-bearing orders: not cancelled, and either a paid BOG
     * order or a free-flow order (paymentStatus NONE). Pending/failed/refunded
     * BOG orders are excluded so a store is never billed for money it didn't
     * collect.
     */
    public BigDecimal serviceFeesOwed(Tenant tenant) {
        return orderRepository.findByTenantOrderByCreatedAtDesc(tenant).stream()
            .filter(o -> o.getStatus() != Order.Status.CANCELLED)
            .filter(o -> o.getPaymentStatus() == Order.PaymentStatus.PAID
                || o.getPaymentStatus() == Order.PaymentStatus.NONE)
            .map(Order::getServiceFee)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
