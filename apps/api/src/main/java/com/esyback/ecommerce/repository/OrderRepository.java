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
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Order o set o.paymentStatus = com.esyback.ecommerce.entity.Order.PaymentStatus.PAID "
        + "where o.orderNumber = :orderNumber "
        + "and o.paymentStatus = com.esyback.ecommerce.entity.Order.PaymentStatus.PENDING")
    int claimPaid(@Param("orderNumber") String orderNumber);
}
