package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Card payments that never came back (review M31).
 *
 * <p>Settlement used to depend on BOG's callback reaching us or the shopper
 * returning to /pay/return. An order whose shopper closed the tab, with the
 * callback lost, stayed PENDING for ever: staff could ship it, and an
 * abandoned one never left the list. Every quarter hour this asks BOG for the
 * receipt of each card payment pending for more than half an hour and
 * settles it. One that BOG itself still reports as unfinished after a day is
 * marked FAILED, which cancels it (no stock was taken, so none is returned);
 * one BOG could not be asked about is never given up on, and a payment that
 * completes after all is still recorded (claimPaid accepts FAILED).
 *
 * <p>The bank is called outside any transaction, so a slow BOG holds no
 * database connection; each order settles in its own.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.payments.sweep.enabled", havingValue = "true", matchIfMissing = true)
public class PendingPaymentSweeper {

    static final long LOOK_AFTER_MINUTES = 30;
    static final long GIVE_UP_AFTER_HOURS = 24;

    private final OrderRepository orders;
    private final OrderService orderService;
    private final BogPaymentService bog;
    private final TransactionTemplate tx;

    private record Pending(String orderNumber, com.esyback.ecommerce.entity.Tenant tenant,
                           String bogOrderId, LocalDateTime createdAt) {}

    @Scheduled(initialDelayString = "PT5M", fixedDelayString = "PT15M")
    public void sweep() {
        sweep(LocalDateTime.now());
    }

    /** One pass, as of {@code now}. Returns how many orders it settled or gave up on. */
    public int sweep(LocalDateTime now) {
        List<Pending> due = tx.execute(s -> orders
            .findPendingWithTenant(Order.PaymentStatus.PENDING, now.minusMinutes(LOOK_AFTER_MINUTES)).stream()
            .map(o -> new Pending(o.getOrderNumber(), o.getTenant(), o.getBogOrderId(), o.getCreatedAt()))
            .toList());
        if (due == null || due.isEmpty()) return 0;

        int moved = 0;
        for (Pending p : due) {
            try {
                // Empty means BOG could not be asked: that is no evidence the
                // shopper did not pay, so it never ends an order.
                Optional<String> key = p.bogOrderId() == null ? Optional.empty()
                    : bog.fetchReceiptKey(p.tenant(), p.bogOrderId());
                if (key.isEmpty()) continue;
                Order.PaymentStatus outcome = bog.mapStatus(key.get());
                // Paid and fully refunded before we ever heard: no money stays,
                // so the order closes as a failed payment rather than sitting
                // PENDING for ever (settlePayment takes no REFUNDED on PENDING).
                if (outcome == Order.PaymentStatus.REFUNDED) outcome = Order.PaymentStatus.FAILED;
                if (outcome == null && p.createdAt() != null
                        && p.createdAt().isBefore(now.minusHours(GIVE_UP_AFTER_HOURS))) {
                    log.info("Card payment for order {} still \"{}\" at BOG after {}h; marking it FAILED",
                        p.orderNumber(), key.get(), GIVE_UP_AFTER_HOURS);
                    outcome = Order.PaymentStatus.FAILED;
                }
                if (outcome == null) continue;
                Order after = orderService.settlePayment(p.orderNumber(), outcome).orElse(null);
                if (after != null && after.getPaymentStatus() != Order.PaymentStatus.PENDING) moved++;
            } catch (RuntimeException e) {
                log.warn("Could not reconcile card payment for order {}: {}", p.orderNumber(), e.getMessage());
            }
        }
        return moved;
    }
}
