package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
