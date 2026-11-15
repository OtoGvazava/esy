package com.esyback.ecommerce.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A failed sign-in returns a store shopper to their store, and the in-flight
 * cookies cannot steer a later sign-in to the wrong store (review, Low: "OAuth
 * failures ... strand store shoppers on the platform host" and "A leftover
 * ESY_TENANT_ORIGIN cookie redirects the next sign-in to the wrong store").
 */
class OAuthFailureLandingTest {

    private final HttpCookieOAuth2AuthorizationRequestRepository repo =
        new HttpCookieOAuth2AuthorizationRequestRepository("test-secret");

    private static OAuth2AuthorizationRequest sample() {
        return OAuth2AuthorizationRequest.authorizationCode()
            .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
            .clientId("client-id")
            .redirectUri("http://lvh.me:8092/login/oauth2/code/google")
            .scopes(Set.of("openid"))
            .state("state-1")
            .attributes(Map.of("registration_id", "google"))
            .build();
    }

    private static OAuth2AuthenticationFailureHandler handler() {
        OAuth2AuthenticationFailureHandler h = new OAuth2AuthenticationFailureHandler();
        ReflectionTestUtils.setField(h, "redirectBase", "");
        return h;
    }

    @Test
    @DisplayName("a failure goes back to the store the sign-in started on, and drops the cookies")
    void failureReturnsToStore() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setCookies(new Cookie("ESY_TENANT_ORIGIN", "https://studio-form.esy.ge"));
        MockHttpServletResponse res = new MockHttpServletResponse();

        handler().onAuthenticationFailure(req, res,
            new OAuth2AuthenticationException(new OAuth2Error("authorization_request_not_found")));

        assertThat(res.getRedirectedUrl()).isEqualTo("https://studio-form.esy.ge/signin?error=oauth");
        assertThat(res.getHeaders("Set-Cookie"))
            .anyMatch(h -> h.startsWith("ESY_TENANT_ORIGIN=;") && h.contains("Max-Age=0"))
            .anyMatch(h -> h.startsWith("ESY_OAUTH2_AUTH_REQUEST=;") && h.contains("Max-Age=0"));
    }

    @Test
    @DisplayName("without a store origin a failure lands on the platform's sign-in page")
    void failureOnPlatform() throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        handler().onAuthenticationFailure(new MockHttpServletRequest(), res,
            new OAuth2AuthenticationException(new OAuth2Error("access_denied")));
        assertThat(res.getRedirectedUrl()).isEqualTo("/signin?error=oauth");
    }

    @Test
    @DisplayName("a sign-in started on the platform clears an origin left by an abandoned store sign-in")
    void platformSignInClearsLeftoverOrigin() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setCookies(new Cookie("ESY_TENANT_ORIGIN", "https://other-store.esy.ge"));
        MockHttpServletResponse res = new MockHttpServletResponse();

        repo.saveAuthorizationRequest(sample(), req, res);

        assertThat(res.getHeaders("Set-Cookie"))
            .anyMatch(h -> h.startsWith("ESY_TENANT_ORIGIN=;") && h.contains("Max-Age=0"));
    }

    @Test
    @DisplayName("a store sign-in sets its origin, and both cookies outlast a slow sign-in")
    void storeSignInSetsOrigin() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setParameter("tenant_origin", "https://studio-form.esy.ge");
        MockHttpServletResponse res = new MockHttpServletResponse();

        repo.saveAuthorizationRequest(sample(), req, res);

        assertThat(res.getHeaders("Set-Cookie"))
            .anyMatch(h -> h.startsWith("ESY_TENANT_ORIGIN=https://studio-form.esy.ge;") && h.contains("Max-Age=600"))
            .anyMatch(h -> h.startsWith("ESY_OAUTH2_AUTH_REQUEST=") && h.contains("Max-Age=600"));
    }
}
