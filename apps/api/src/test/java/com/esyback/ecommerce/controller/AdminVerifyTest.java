package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.AuditLog;
import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.AuditLogRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.service.AdminService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verified stores: an admin vouches for a store and the storefront draws a
 * tick from {@code verifiedAt} on {@code GET /api/tenant/current}.
 *
 * <p>Two things matter beyond "the flag flips". Only an admin may flip it —
 * a tick a merchant could award themselves would mean nothing — and the
 * public field must be exactly {@code verifiedAt}, an ISO string or null,
 * because another surface reads it by that name.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminVerifyTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired AdminService adminService;
    @Autowired TenantRepository tenantRepository;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired AuditLogRepository auditLogRepository;
    @Autowired EntityManager entityManager;

    private static final String SUB = "verify-test-store";
    private static final String STORE_HOST = SUB + ".lvh.me";
    private static final String ADMIN = "admin-verify@esy.test";
    private static final String SHOPPER = "shopper-verify@esy.test";

    private static final String VERIFY = "/api/admin/stores/" + SUB + "/verify";

    // An ISO-8601 instant as Instant.toString() writes it, e.g.
    // 2026-10-31T12:34:56.789Z — what a browser's Date can parse.
    private static final String ISO = "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?Z$";

    @BeforeEach
    void setUp() {
        tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Verify Test Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        account(ADMIN, "ADMIN");
        account(SHOPPER, null);
    }

    /** A signed-up account (phone verified, so its writes pass PhoneRequiredFilter). */
    private User account(String email, String extraRole) {
        return userRepository.findByUsername(email).orElseGet(() -> {
            User u = new User();
            u.setUsername(email);
            u.setEmail(email);
            u.setIsActive(true);
            u.setPhoneVerified(true);
            u.addRole(role("USER"));
            if (extraRole != null) u.addRole(role(extraRole));
            return userRepository.save(u);
        });
    }

    private Role role(String name) {
        return roleRepository.findByName(name).orElseGet(() -> {
            Role r = new Role();
            r.setName(name);
            r.setDescription(name);
            return roleRepository.save(r);
        });
    }

    private MockHttpServletRequestBuilder as(String email, MockHttpServletRequestBuilder request) {
        return request.header("Host", "admin.lvh.me")
            .header("Authorization", "Bearer " + jwtUtil.generateToken(email));
    }

    private Tenant stored() {
        entityManager.flush();
        entityManager.clear();
        return tenantRepository.findBySubdomain(SUB).orElseThrow();
    }

    private List<AuditLog> auditFor(String action) {
        return auditLogRepository.findAllByOrderByAtDescIdDesc(PageRequest.of(0, 500)).stream()
            .filter(a -> SUB.equals(a.getTargetId()) && action.equals(a.getAction()))
            .toList();
    }

    @Test
    @DisplayName("verify stamps the store once, writes one audit row, and unverify clears it")
    void verifyAndUnverify() {
        Map<String, Object> first = adminService.verify(SUB, ADMIN);
        Instant at = (Instant) first.get("verifiedAt");
        assertThat(at).isNotNull();
        assertThat(stored().getVerifiedAt()).isEqualTo(at);

        // Pressing it again changes nothing: same date, no second audit row.
        Map<String, Object> again = adminService.verify(SUB, ADMIN);
        assertThat(again.get("verifiedAt")).isEqualTo(at);
        assertThat(auditFor("STORE_VERIFIED")).hasSize(1);
        assertThat(auditFor("STORE_VERIFIED").get(0).getActorEmail()).isEqualTo(ADMIN);

        Map<String, Object> cleared = adminService.unverify(SUB, ADMIN);
        assertThat(cleared.get("verifiedAt")).isNull();
        assertThat(stored().getVerifiedAt()).isNull();
        assertThat(auditFor("STORE_UNVERIFIED")).hasSize(1);

        // Clearing an unverified store is a no-op, not an error.
        adminService.unverify(SUB, ADMIN);
        assertThat(auditFor("STORE_UNVERIFIED")).hasSize(1);
    }

    @Test
    @DisplayName("an unknown store is a 404")
    void unknownStore() {
        assertThatThrownBy(() -> adminService.verify("no-such-store-here", ADMIN))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    @DisplayName("over HTTP: an admin sets and clears it, and the store object carries verifiedAt")
    void adminOverHttp() throws Exception {
        mvc.perform(as(ADMIN, post(VERIFY)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.subdomain").value(SUB))
            .andExpect(jsonPath("$.verifiedAt").value(matchesPattern(ISO)));

        // The admin list and the store detail say so too.
        mvc.perform(as(ADMIN, get("/api/admin/stores/" + SUB)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verifiedAt").value(matchesPattern(ISO)));

        mvc.perform(as(ADMIN, delete(VERIFY)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verifiedAt").value(nullValue()));
        assertThat(stored().getVerifiedAt()).isNull();
    }

    @Test
    @DisplayName("a signed-in non-admin gets 403 and the store is untouched; signed out never succeeds")
    void onlyAnAdmin() throws Exception {
        mvc.perform(as(SHOPPER, post(VERIFY))).andExpect(status().isForbidden());
        mvc.perform(as(SHOPPER, delete(VERIFY))).andExpect(status().isForbidden());
        assertThat(stored().getVerifiedAt()).isNull();

        int code = mvc.perform(post(VERIFY).header("Host", "admin.lvh.me"))
            .andReturn().getResponse().getStatus();
        assertThat(code).isGreaterThanOrEqualTo(300);
        assertThat(stored().getVerifiedAt()).isNull();
    }

    @Test
    @DisplayName("GET /api/tenant/current carries verifiedAt: null until verified, then an ISO string")
    void publicField() throws Exception {
        mvc.perform(get("/api/tenant/current").header("Host", STORE_HOST))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.subdomain").value(SUB))
            .andExpect(jsonPath("$.verifiedAt").value(nullValue()));

        Instant at = (Instant) adminService.verify(SUB, ADMIN).get("verifiedAt");
        entityManager.flush();

        mvc.perform(get("/api/tenant/current").header("Host", STORE_HOST))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verifiedAt").value(at.toString()))
            .andExpect(jsonPath("$.verifiedAt").value(matchesPattern(ISO)));
    }
}
