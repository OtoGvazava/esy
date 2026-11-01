package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.OrderItem;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.service.MembershipService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The platform account's summary (the design's L4): beside each store you run,
 * how many orders are waiting on you, and on each order you placed, what it
 * was — {@code GET /api/account} over HTTP with a signed session.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AccountSummaryTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired OrderRepository orderRepository;
    @Autowired MembershipService membershipService;

    private static final String EMAIL = "account-summary@esy.test";

    private User account() {
        User u = new User();
        u.setUsername(EMAIL);
        u.setEmail(EMAIL);
        u.setIsActive(true);
        // The JWT filter loads the account with its roles; none reads as signed out.
        u.addRole(roleRepository.findByName("USER").orElseThrow());
        return userRepository.save(u);
    }

    private Tenant store(String sub) {
        Tenant t = new Tenant();
        t.setName("Account Summary " + sub);
        t.setSubdomain(sub);
        t.setIsActive(true);
        return tenantRepository.save(t);
    }

    private Order order(User buyer, Tenant t, Order.Status status, String... titles) {
        Order o = new Order();
        o.setOrderNumber("SUM-" + UUID.randomUUID());
        o.setUser(buyer);
        o.setTenant(t);
        o.setStatus(status);
        o.setTotal(new BigDecimal("120.00"));
        o.setServiceFee(new BigDecimal("2.40"));
        o.setPaymentStatus(Order.PaymentStatus.NONE);
        for (String title : titles) {
            OrderItem item = new OrderItem();
            item.setTitle(title);
            item.setPrice(new BigDecimal("60.00"));
            item.setQuantity(1);
            o.addItem(item);
        }
        return orderRepository.saveAndFlush(o);
    }

    @Test
    @DisplayName("each store carries its placed, not yet handled orders as newOrders; each order its first item")
    void newOrdersAndFirstItem() throws Exception {
        User me = account();
        Tenant mine = store("account-summary-own");
        Tenant run = store("account-summary-run");
        membershipService.ensure(me, mine, StoreMembership.Role.OWNER);
        membershipService.ensure(me, run, StoreMembership.Role.MANAGER);

        // Two waiting in my store, one already shipped; none in the one I manage.
        order(null, mine, Order.Status.PLACED, "Mug");
        order(null, mine, Order.Status.PLACED, "Bowl");
        order(null, mine, Order.Status.SHIPPED, "Plate");
        // What I bought myself, elsewhere: a shirt and a scarf.
        order(me, run, Order.Status.DELIVERED, "Linen shirt", "Scarf");

        mvc.perform(get("/api/account")
                .header("Host", "lvh.me")
                .header("Authorization", "Bearer " + jwtUtil.generateToken(EMAIL)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ownedStores[0].subdomain").value("account-summary-own"))
            .andExpect(jsonPath("$.ownedStores[0].newOrders").value(2))
            .andExpect(jsonPath("$.managedStores[0].subdomain").value("account-summary-run"))
            .andExpect(jsonPath("$.managedStores[0].newOrders").value(0))
            .andExpect(jsonPath("$.orders[0].firstItem").value("Linen shirt"))
            .andExpect(jsonPath("$.orders[0].items").value(2));
    }

    @Test
    @DisplayName("an order with no lines has no first item rather than failing")
    void orderWithoutLines() throws Exception {
        User me = account();
        order(me, store("account-summary-empty"), Order.Status.PLACED);

        mvc.perform(get("/api/account")
                .header("Host", "lvh.me")
                .header("Authorization", "Bearer " + jwtUtil.generateToken(EMAIL)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.orders[0].firstItem").value(nullValue()))
            .andExpect(jsonPath("$.orders[0].items").value(0));
    }
}
