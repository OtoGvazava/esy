package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Whose orders {@code GET /api/orders} lists.
 *
 * <p>One account buys at two stores. Each store's "my orders" is that store's
 * alone; the esy account, on a host that is no store, lists both. Before this
 * was pinned the list ignored the host, so a store showed another store's
 * orders under its own name.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrderScopeTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired OrderRepository orderRepository;

    private static final String EMAIL = "order-scope@esy.test";
    private static final String CLAY = "order-scope-clay";
    private static final String LINEN = "order-scope-linen";

    private User account(String email) {
        User u = new User();
        u.setUsername(email);
        u.setEmail(email);
        u.setIsActive(true);
        // The JWT filter loads the account with its roles; none reads as signed out.
        u.addRole(roleRepository.findByName("USER").orElseThrow());
        return userRepository.save(u);
    }

    private Tenant store(String sub) {
        Tenant t = new Tenant();
        t.setName("Order Scope " + sub);
        t.setSubdomain(sub);
        t.setIsActive(true);
        return tenantRepository.save(t);
    }

    private void order(String number, User buyer, Tenant t) {
        Order o = new Order();
        o.setOrderNumber(number);
        o.setUser(buyer);
        o.setTenant(t);
        o.setStatus(Order.Status.PLACED);
        o.setTotal(new BigDecimal("40.00"));
        o.setServiceFee(new BigDecimal("0.80"));
        o.setPaymentStatus(Order.PaymentStatus.NONE);
        orderRepository.saveAndFlush(o);
    }

    /** One buyer with two orders at the clay store and one at the linen store. */
    private void twoStores() {
        User me = account(EMAIL);
        Tenant clay = store(CLAY);
        Tenant linen = store(LINEN);
        order("SCOPE-CLAY-1", me, clay);
        order("SCOPE-CLAY-2", me, clay);
        order("SCOPE-LINEN-1", me, linen);
        // Someone else's order at the clay store is never mine, on any host.
        order("SCOPE-CLAY-OTHER", account("order-scope-other@esy.test"), clay);
    }

    private String session() {
        return "Bearer " + jwtUtil.generateToken(EMAIL);
    }

    @Test
    @DisplayName("on a store, my orders are the ones I placed at that store")
    void storeHostListsItsOwn() throws Exception {
        twoStores();

        mvc.perform(get("/api/orders").header("Host", CLAY + ".lvh.me").header("Authorization", session()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[*].orderNumber", containsInAnyOrder("SCOPE-CLAY-1", "SCOPE-CLAY-2")));

        mvc.perform(get("/api/orders").header("Host", LINEN + ".lvh.me:8092").header("Authorization", session()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].orderNumber").value("SCOPE-LINEN-1"))
            .andExpect(jsonPath("$[0].store.subdomain").value(LINEN));
    }

    @Test
    @DisplayName("on esy.ge, my orders are the ones I placed anywhere")
    void platformHostListsAll() throws Exception {
        twoStores();

        mvc.perform(get("/api/orders").header("Host", "lvh.me").header("Authorization", session()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(3)))
            .andExpect(jsonPath("$[*].orderNumber",
                containsInAnyOrder("SCOPE-CLAY-1", "SCOPE-CLAY-2", "SCOPE-LINEN-1")));
    }

    @Test
    @DisplayName("the back office never narrows my own orders to the store it has open")
    void managerHostListsAll() throws Exception {
        twoStores();

        mvc.perform(get("/api/orders").param("tenant", CLAY)
                .header("Host", "manager.lvh.me").header("Authorization", session()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(3)));
    }

    @Test
    @DisplayName("the local store simulation (localhost with ?tenant=) is a store too")
    void localhostTenantParamIsAStore() throws Exception {
        twoStores();

        mvc.perform(get("/api/orders").param("tenant", LINEN)
                .header("Host", "localhost:8092").header("Authorization", session()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].orderNumber").value("SCOPE-LINEN-1"));
    }
}
