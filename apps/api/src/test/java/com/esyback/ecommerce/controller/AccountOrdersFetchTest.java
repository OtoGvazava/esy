package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.OrderItem;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The account hub reads every order with its store and its lines. Those come
 * in the same query now, instead of two lazy queries per order (review, Low:
 * "The account hub loads every order ever placed with per-order lazy queries").
 */
@SpringBootTest
@Transactional
class AccountOrdersFetchTest {

    @Autowired OrderRepository orderRepository;
    @Autowired UserRepository userRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired EntityManager em;

    @Test
    @DisplayName("a shopper's orders arrive with their store and lines already loaded")
    void storeAndLinesAreFetched() {
        User u = new User();
        u.setUsername("orders-fetch@esy.test");
        u.setEmail("orders-fetch@esy.test");
        u.setIsActive(true);
        u = userRepository.save(u);
        Tenant t = new Tenant();
        t.setName("Fetch store");
        t.setSubdomain("orders-fetch");
        t.setIsActive(true);
        t = tenantRepository.save(t);
        for (int i = 0; i < 3; i++) {
            Order o = new Order();
            o.setOrderNumber("FETCH-" + UUID.randomUUID());
            o.setUser(u);
            o.setTenant(t);
            o.setStatus(Order.Status.PLACED);
            o.setTotal(new BigDecimal("10.00"));
            o.setPaymentStatus(Order.PaymentStatus.NONE);
            OrderItem item = new OrderItem();
            item.setTitle("Line " + i);
            item.setPrice(new BigDecimal("10.00"));
            item.setQuantity(1);
            o.addItem(item);
            orderRepository.save(o);
        }
        em.flush();
        em.clear();

        List<Order> orders = orderRepository.findByUserOrderByCreatedAtDesc(userRepository.findById(u.getId()).orElseThrow());

        assertThat(orders).hasSize(3);
        assertThat(orders).allSatisfy(o -> {
            assertThat(Hibernate.isInitialized(o.getTenant())).isTrue();
            assertThat(Hibernate.isInitialized(o.getItems())).isTrue();
        });
    }
}
