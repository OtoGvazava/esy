package com.esyback.ecommerce.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The JWT filter reads the session only where someone asks who is signed in,
 * and checks a token's signature once (review, Low: "The JWT filter costs a DB
 * query and three signature verifications per request, assets included").
 */
class JwtFilterScopeTest {

    @Test
    @DisplayName("API calls and the API reference are authenticated; SPA pages and assets are not")
    void scope() {
        assertThat(JwtAuthenticationFilter.needsIdentity("/api/account")).isTrue();
        assertThat(JwtAuthenticationFilter.needsIdentity("/api/products/1")).isTrue();
        assertThat(JwtAuthenticationFilter.needsIdentity("/docs")).isTrue();
        assertThat(JwtAuthenticationFilter.needsIdentity("/v3/api-docs")).isTrue();
        assertThat(JwtAuthenticationFilter.needsIdentity("/assets/index-abc.js")).isFalse();
        assertThat(JwtAuthenticationFilter.needsIdentity("/account/orders")).isFalse();
        assertThat(JwtAuthenticationFilter.needsIdentity("/")).isFalse();
    }

    private static JwtUtil util(long expirationMs) {
        JwtUtil u = new JwtUtil();
        ReflectionTestUtils.setField(u, "secret", "a-test-secret");
        ReflectionTestUtils.setField(u, "expiration", expirationMs);
        u.init(); // what Spring runs after injection
        return u;
    }

    @Test
    @DisplayName("a valid token yields its subject; a tampered or expired one yields none")
    void verifiedSubject() {
        JwtUtil jwt = util(60_000);
        String token = jwt.generateToken("ann@esy.test");
        assertThat(jwt.verifiedSubject(token)).isEqualTo("ann@esy.test");
        int sig = token.lastIndexOf('.') + 1;
        char flipped = token.charAt(sig) == 'A' ? 'B' : 'A';
        assertThat(jwt.verifiedSubject(token.substring(0, sig) + flipped + token.substring(sig + 1))).isNull();
        assertThat(jwt.verifiedSubject("not-a-token")).isNull();

        JwtUtil expired = util(-1_000);
        assertThat(expired.verifiedSubject(expired.generateToken("ann@esy.test"))).isNull();
    }
}
