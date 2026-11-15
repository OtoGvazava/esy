package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.StoreMembershipRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Which account a Google sign-in lands in. The identity is (provider, sub);
 * the email links only a verified address to an account that has no identity
 * yet, and never re-binds one that has (review, Low: "Sign-in falls back to an
 * email match and re-binds the account"). Also: a store sign-in records the
 * CUSTOMER membership although the callback runs on the platform host, and a
 * deactivated account gets no session.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SignInIdentityTest {

    @Autowired UserService userService;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired StoreMembershipRepository membershipRepository;
    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;

    private User signIn(String sub, String email, Boolean verified) {
        return userService.findOrCreateUser("google", sub, email, verified, "Ann", "Lee", null, null);
    }

    @Test
    @DisplayName("the same Google subject always reaches the same account")
    void sameSubject() {
        User first = signIn("sub-same", "same@esy.test", true);
        User again = signIn("sub-same", "renamed@esy.test", true);
        assertThat(again.getId()).isEqualTo(first.getId());
    }

    @Test
    @DisplayName("a new account stores its email lowercased")
    void lowercased() {
        assertThat(signIn("sub-case", "Mixed.Case@Esy.Test", true).getEmail()).isEqualTo("mixed.case@esy.test");
    }

    @Test
    @DisplayName("an account bound to another subject is not handed over by email")
    void noRebind() {
        User owner = signIn("sub-original", "reassigned@esy.test", true);

        assertThatThrownBy(() -> signIn("sub-newcomer", "reassigned@esy.test", true))
            .isInstanceOf(UserService.SignInRefused.class);
        assertThat(userRepository.findById(owner.getId()).orElseThrow().getOauthProviderId())
            .isEqualTo("sub-original");
    }

    @Test
    @DisplayName("an account with no identity yet is linked by a verified address only")
    void linkOnlyVerified() {
        User legacy = new User();
        legacy.setUsername("legacy@esy.test");
        legacy.setEmail("Legacy@esy.test");
        legacy.setIsActive(true);
        legacy.addRole(roleRepository.findByName("USER").orElseThrow());
        legacy = userRepository.save(legacy);

        assertThatThrownBy(() -> signIn("sub-legacy", "legacy@esy.test", null))
            .isInstanceOf(UserService.SignInRefused.class);
        assertThatThrownBy(() -> signIn("sub-legacy", "legacy@esy.test", false))
            .isInstanceOf(UserService.SignInRefused.class);

        User linked = signIn("sub-legacy", "legacy@esy.test", true);
        assertThat(linked.getId()).isEqualTo(legacy.getId());
        assertThat(linked.getOauthProviderId()).isEqualTo("sub-legacy");
    }

    @Test
    @DisplayName("an address the provider says is unverified cannot open a new account")
    void unverifiedNewAccount() {
        assertThatThrownBy(() -> signIn("sub-unverified", "unverified@esy.test", false))
            .isInstanceOf(UserService.SignInRefused.class);
        assertThat(userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc("unverified@esy.test")).isEmpty();
    }

    @Test
    @DisplayName("a deactivated account is refused at sign-in")
    void inactiveRefused() {
        User u = signIn("sub-inactive", "inactive@esy.test", true);
        u.setIsActive(false);
        userRepository.save(u);
        assertThatThrownBy(() -> signIn("sub-inactive", "inactive@esy.test", true))
            .isInstanceOf(UserService.SignInRefused.class);
    }

    @Test
    @DisplayName("a deactivated account's existing session is treated as signed out")
    void inactiveSessionRefused() throws Exception {
        User u = signIn("sub-inactive-session", "inactive-session@esy.test", true);
        String token = jwtUtil.generateToken(u.getUsername());

        int live = mvc.perform(get("/api/account").header("Host", "lvh.me")
                .header("Authorization", "Bearer " + token)).andReturn().getResponse().getStatus();
        assertThat(live).isEqualTo(200);

        u.setIsActive(false);
        userRepository.saveAndFlush(u);
        int after = mvc.perform(get("/api/account").header("Host", "lvh.me")
                .header("Authorization", "Bearer " + token)).andReturn().getResponse().getStatus();
        assertThat(after).isNotEqualTo(200);
    }

    @Test
    @DisplayName("signing in from a store records the CUSTOMER membership of that store")
    void storeCustomer() {
        Tenant t = new Tenant();
        t.setName("Sign-in store");
        t.setSubdomain("signin-store");
        t.setIsActive(true);
        t = tenantRepository.save(t);

        User u = userService.findOrCreateUser("google", "sub-shopper", "shopper@esy.test", true,
            "Ann", "Lee", null, "signin-store");

        assertThat(membershipRepository.findByUserAndTenant(u, t))
            .map(StoreMembership::getRole).contains(StoreMembership.Role.CUSTOMER);
    }
}
