package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.service.MembershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The back office's analytics and finances over HTTP: {@code GET
 * /api/tenant/stats/period} and {@code /months}, through the real chain (a
 * signed JWT, the Host header choosing the store, the {@code @storeAccess}
 * gate). The figures themselves are {@code StoreStatsServiceTest}'s.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StoreStatsControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired TenantRepository tenantRepository;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired MembershipService membershipService;

    private static final String SUB = "stats-http-store";
    private static final String STORE = SUB + ".lvh.me";
    private static final String OWNER = "owner-stats@esy.test";
    private static final String MANAGER = "manager-stats@esy.test";
    private static final String SHOPPER = "shopper-stats@esy.test";

    @BeforeEach
    void setUp() {
        Tenant tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Stats Http Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        membershipService.ensure(account(OWNER), tenant, StoreMembership.Role.OWNER);
        membershipService.ensure(account(MANAGER), tenant, StoreMembership.Role.MANAGER);
        membershipService.ensure(account(SHOPPER), tenant, StoreMembership.Role.CUSTOMER);
    }

    private User account(String email) {
        return userRepository.findByUsername(email).orElseGet(() -> {
            User u = new User();
            u.setUsername(email);
            u.setEmail(email);
            u.setIsActive(true);
            u.setPhoneVerified(true);
            u.addRole(roleRepository.findByName("USER").orElseThrow());
            return userRepository.save(u);
        });
    }

    private MockHttpServletRequestBuilder as(String email, MockHttpServletRequestBuilder request) {
        return request.header("Host", STORE).header("Authorization", "Bearer " + jwtUtil.generateToken(email));
    }

    @Test
    @DisplayName("the owner and a manager read a window: its days, the window before, the series and the best sellers")
    void window() throws Exception {
        for (String who : new String[] {OWNER, MANAGER}) {
            mvc.perform(as(who, get("/api/tenant/stats/period").param("days", "30")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days").value(30))
                .andExpect(jsonPath("$.unit").value("day"))
                .andExpect(jsonPath("$.series", hasSize(30)))
                .andExpect(jsonPath("$.revenue").value(0))
                .andExpect(jsonPath("$.previous.revenue").value(0))
                .andExpect(jsonPath("$.top", hasSize(0)));
        }
    }

    @Test
    @DisplayName("no days is all time, by month; a window the screen does not offer is a 400")
    void allTimeAndBadWindow() throws Exception {
        mvc.perform(as(OWNER, get("/api/tenant/stats/period")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.unit").value("month"));
        mvc.perform(as(OWNER, get("/api/tenant/stats/period").param("days", "14")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("months: the current one at least, with the rate new orders are charged")
    void months() throws Exception {
        mvc.perform(as(MANAGER, get("/api/tenant/stats/months")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.months", hasSize(1)))
            .andExpect(jsonPath("$.serviceFeeRate").exists());
    }

    @Test
    @DisplayName("a shopper and a stranger are refused, like the lifetime stats")
    void gate() throws Exception {
        mvc.perform(as(SHOPPER, get("/api/tenant/stats/period").param("days", "7")))
            .andExpect(status().isForbidden());
        // Signed out: sent to sign in (the chain's 302), never the figures.
        mvc.perform(get("/api/tenant/stats/months").header("Host", STORE))
            .andExpect(r -> assertThat(r.getResponse().getStatus()).isNotEqualTo(200));
    }
}
