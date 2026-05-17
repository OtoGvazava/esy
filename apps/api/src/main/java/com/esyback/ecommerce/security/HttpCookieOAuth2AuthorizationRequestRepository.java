package com.esyback.ecommerce.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.util.Base64;

/**
 * Stores the in-flight OAuth2 authorization request in a short-lived cookie
 * instead of the HttpSession. Required because the app runs SESSION-STATELESS
 * (JWT) — the default session-backed repository would lose the state/PKCE
 * between the redirect to Google and the callback.
 */
@Component
public class HttpCookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    private static final String COOKIE = "ESY_OAUTH2_AUTH_REQUEST";
    // Where to send the browser (with the JWT) once auth completes on the
    // canonical host — see OAuthCanonicalHostRedirectFilter.
    private static final String TENANT_ORIGIN_COOKIE = "ESY_TENANT_ORIGIN";
    private static final int MAX_AGE_SECONDS = 180;

    /** The allowlisted tenant origin saved alongside the in-flight request, or null. */
    public static String readTenantOrigin(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie c : request.getCookies()) {
            if (TENANT_ORIGIN_COOKIE.equals(c.getName())) {
                return TenantOrigins.isAllowed(c.getValue()) ? c.getValue() : null;
            }
        }
        return null;
    }

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        Cookie c = read(request);
        return c == null ? null : deserialize(c.getValue());
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest,
                                         HttpServletRequest request, HttpServletResponse response) {
        if (authorizationRequest == null) {
            expire(response, request);
            return;
        }
        String value = serialize(authorizationRequest);
        // request.isSecure() reflects X-Forwarded-Proto (forward-headers-strategy),
        // so Secure is set on Render (https) and omitted on localhost (http).
        StringBuilder sb = new StringBuilder();
        sb.append(COOKIE).append('=').append(value)
          .append("; Path=/; Max-Age=").append(MAX_AGE_SECONDS)
          .append("; HttpOnly; SameSite=Lax");
        if (request.isSecure()) sb.append("; Secure");
        response.addHeader("Set-Cookie", sb.toString());

        // Stash the originating tenant origin (set by the canonical-host
        // funnel) so the success handler can return the user to their store.
        String tenantOrigin = request.getParameter("tenant_origin");
        if (TenantOrigins.isAllowed(tenantOrigin)) {
            StringBuilder ts = new StringBuilder();
            ts.append(TENANT_ORIGIN_COOKIE).append('=').append(tenantOrigin)
              .append("; Path=/; Max-Age=").append(MAX_AGE_SECONDS)
              .append("; HttpOnly; SameSite=Lax");
            if (request.isSecure()) ts.append("; Secure");
            response.addHeader("Set-Cookie", ts.toString());
        }
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request,
                                                                 HttpServletResponse response) {
        OAuth2AuthorizationRequest loaded = loadAuthorizationRequest(request);
        if (loaded != null) expire(response, request);
        return loaded;
    }

    private void expire(HttpServletResponse response, HttpServletRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append(COOKIE).append("=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
        if (request.isSecure()) sb.append("; Secure");
        response.addHeader("Set-Cookie", sb.toString());

        StringBuilder ts = new StringBuilder();
        ts.append(TENANT_ORIGIN_COOKIE).append("=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
        if (request.isSecure()) ts.append("; Secure");
        response.addHeader("Set-Cookie", ts.toString());
    }

    private Cookie read(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie c : request.getCookies()) {
            if (COOKIE.equals(c.getName())) return c;
        }
        return null;
    }

    private String serialize(OAuth2AuthorizationRequest obj) {
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
             ObjectOutputStream oos = new ObjectOutputStream(bos)) {
            oos.writeObject(obj);
            return Base64.getUrlEncoder().encodeToString(bos.toByteArray());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize OAuth2 authorization request", e);
        }
    }

    private OAuth2AuthorizationRequest deserialize(String value) {
        try (ObjectInputStream ois = new ObjectInputStream(
                new ByteArrayInputStream(Base64.getUrlDecoder().decode(value)))) {
            return (OAuth2AuthorizationRequest) ois.readObject();
        } catch (Exception e) {
            return null; // tampered/expired cookie -> treat as no request
        }
    }
}
