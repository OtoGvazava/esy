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
}
