package com.esyback.ecommerce.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * The OAuth2 request cookie is client-controlled; only a cookie this server
 * signed may ever be deserialized (review finding H13).
 */
class OAuthRequestCookieTest {

    private final HttpCookieOAuth2AuthorizationRequestRepository repo =
            new HttpCookieOAuth2AuthorizationRequestRepository("test-secret");

    private static OAuth2AuthorizationRequest sample() {
        return OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .clientId("client-id")
                .redirectUri("http://lvh.me:8092/login/oauth2/code/google")
                .scopes(Set.of("openid", "profile", "email"))
                .state("state-123")
                .additionalParameters(Map.of("nonce", "n-1"))
                .attributes(Map.of("registration_id", "google", "code_verifier", "v-1"))
                .build();
    }

    @Test
    @DisplayName("a request this server signed round-trips through the class filter")
    void roundTrips() {
        OAuth2AuthorizationRequest back = repo.deserialize(repo.serialize(sample()));
        assertNotNull(back);
        assertEquals("state-123", back.getState());
        assertEquals("v-1", back.getAttribute("code_verifier"));
        assertEquals(Set.of("openid", "profile", "email"), back.getScopes());
    }

    @Test
    @DisplayName("an altered payload or signature is refused")
    void refusesTampering() {
        String v = repo.serialize(sample());
        int dot = v.indexOf('.');
        char c = v.charAt(5);
        String alteredPayload = v.substring(0, 5) + (c == 'A' ? 'B' : 'A') + v.substring(6);
        assertNull(repo.deserialize(alteredPayload));
        assertNull(repo.deserialize(v.substring(0, dot + 1) + "AAAA" + v.substring(dot + 5)));
    }

    @Test
    @DisplayName("a cookie signed with another secret is refused")
    void refusesOtherKey() {
        String v = new HttpCookieOAuth2AuthorizationRequestRepository("other").serialize(sample());
        assertNull(repo.deserialize(v));
    }

    @Test
    @DisplayName("an unsigned serialized object (the old format, or an attack) is never read")
    void refusesUnsigned() throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (ObjectOutputStream oos = new ObjectOutputStream(bos)) {
            oos.writeObject(new ArrayList<>(java.util.List.of("x")));
        }
        assertNull(repo.deserialize(Base64.getUrlEncoder().encodeToString(bos.toByteArray())));
        assertNull(repo.deserialize("garbage"));
        assertNull(repo.deserialize("a.b.c"));
    }
}
