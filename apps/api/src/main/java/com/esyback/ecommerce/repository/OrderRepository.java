package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserOrderByCreatedAtDesc(User user);
    List<Order> findByUserAndTenantOrderByCreatedAtDesc(User user, Tenant tenant);
    List<Order> findByTenantOrderByCreatedAtDesc(Tenant tenant);
    long countByTenant(Tenant tenant);
    long countByTenantAndStatus(Tenant tenant, Order.Status status);

    // orderNumber is the external_order_id we hand BOG; the callback echoes it.
    Optional<Order> findByOrderNumber(String orderNumber);

    /**
     * Atomic PENDING→PAID claim. The BOG async callback and the /pay/return
     * status reconcile can settle the same order concurrently; a check-then-act
     * on the loaded entity lets both pass and commit stock twice. This single
     * conditional UPDATE lets exactly one caller win (returns 1) — only the
     * winner runs the stock commit. clearAutomatically so the follow-up entity
     * load sees the new status instead of a stale first-level-cache copy.
     */
    // Enums travel as parameters: Hibernate 6 rejects a fully-qualified
    // nested-enum literal in the SET clause ("Could not interpret path
    // expression"), which fails Spring Data's boot-time query validation.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Order o set o.paymentStatus = :paid "
        + "where o.orderNumber = :orderNumber and o.paymentStatus = :pending")
    int claimPaid(@Param("orderNumber") String orderNumber,
                  @Param("paid") Order.PaymentStatus paid,
                  @Param("pending") Order.PaymentStatus pending);

    default int claimPaid(String orderNumber) {
        return claimPaid(orderNumber, Order.PaymentStatus.PAID, Order.PaymentStatus.PENDING);
    }

    /**
     * Reserves refund headroom before the bank is called.
     *
     * <p>One conditional UPDATE, for the same reason {@code claimPaid} is one:
     * two clicks on Refund arrive as two transactions that would each read
     * {@code refunded_amount = 0} under READ COMMITTED and each decide the full
     * amount was available. Here the database decides, so exactly one caller
     * sees {@code claimed == 1} and exactly one refund is sent.
     *
     * <p>The order must already be PAID or mid-refund, and the running total
     * must not exceed what was charged.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Order o set o.refundedAmount = coalesce(o.refundedAmount, 0) + :amount, "
        + "o.paymentStatus = :refundPending "
        + "where o.id = :id "
        + "and o.paymentStatus in (:paid, :refundPending) "
        + "and coalesce(o.refundedAmount, 0) + :amount <= o.total")
    int claimRefund(@Param("id") Long id,
                    @Param("amount") java.math.BigDecimal amount,
                    @Param("paid") Order.PaymentStatus paid,
                    @Param("refundPending") Order.PaymentStatus refundPending);

    default int claimRefund(Long id, java.math.BigDecimal amount) {
        return claimRefund(id, amount, Order.PaymentStatus.PAID, Order.PaymentStatus.REFUND_PENDING);
    }

    /**
     * Moves an order from one fulfilment status to the next, only if it is
     * still where the caller found it.
     *
     * <p>One conditional UPDATE, for the reason the claims above are: two
     * people cancelling the same order (or one shipping it while the other
     * cancels) arrive as two transactions that each read PLACED. Here exactly
     * one sees {@code 1}; the other is told the order changed. That is what
     * makes it safe for a cancellation to put stock back — it can only happen
     * once.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Order o set o.status = :to where o.id = :id and o.status = :from")
    int claimStatus(@Param("id") Long id,
                    @Param("from") Order.Status from,
                    @Param("to") Order.Status to);

    /**
     * Marks the order's goods as taken, once, and never for an order that is
     * already cancelled — a card payment can still land after the store has
     * cancelled the order, and a cancelled order must hold no stock.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Order o set o.stockCommitted = true where o.id = :id "
        + "and o.status <> :cancelled "
        + "and (o.stockCommitted is null or o.stockCommitted = false)")
    int markStockCommitted(@Param("id") Long id, @Param("cancelled") Order.Status cancelled);

    default int markStockCommitted(Long id) {
        return markStockCommitted(id, Order.Status.CANCELLED);
    }

    /**
     * Claims the right to put a cancelled order's goods back, once. An order
     * from before the flag existed (null) counts as holding stock only when
     * its payment status proves the stock was taken — see
     * OrderService#releaseStock.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Order o set o.stockCommitted = false where o.id = :id "
        + "and (o.stockCommitted = true "
        + "or (o.stockCommitted is null and o.paymentStatus in :held))")
    int releaseStock(@Param("id") Long id,
                     @Param("held") java.util.Collection<Order.PaymentStatus> held);
}
