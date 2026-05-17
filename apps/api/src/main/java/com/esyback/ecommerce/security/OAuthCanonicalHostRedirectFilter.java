package com.esyback.ecommerce.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Funnels every OAuth2 authorization start onto a single canonical host.
 *
 * Why: Google authorized redirect URIs are exact-match (no wildcards), but the
 * storefront is wildcard multi-tenant (anything.esy.ge). If the handshake ran
 * on the tenant host, every new tenant would need a Google console change.
 * Instead the whole authorize↔callback round-trip happens on the canonical
 * host (only that one redirect URI is registered); the originating tenant
 * origin rides along in `tenant_origin` so the success handler can send the
 * user back to their store with the JWT.
 *
 * No-op when app.oauth2.canonical-origin is unset (local/dev = single host).
 * Must run before Spring's OAuth2AuthorizationRequestRedirectFilter.
 */
@Component
public class OAuthCanonicalHostRedirectFilter extends OncePerRequestFilter {

    @Value("${app.oauth2.canonical-origin:}")
    private String canonicalOrigin;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (canonicalOrigin == null || canonicalOrigin.isBlank()
                || !request.getRequestURI().startsWith("/oauth2/authorization/")) {
            chain.doFilter(request, response);
            return;
        }

        String currentOrigin = TenantOrigins.of(request);
        if (canonicalOrigin.equals(currentOrigin)) {
            // Already on the canonical host — the cookie repo stashes
            // tenant_origin from here.
            chain.doFilter(request, response);
            return;
        }

        // Where the user should land back after auth. Trust an explicit,
        // allowlisted tenant_origin; otherwise fall back to the host they
        // started on (if that itself is allowlisted).
        String requested = request.getParameter("tenant_origin");
        String tenantOrigin = TenantOrigins.isAllowed(requested) ? requested
            : (TenantOrigins.isAllowed(currentOrigin) ? currentOrigin : null);

        StringBuilder target = new StringBuilder(canonicalOrigin)
            .append(request.getRequestURI());
        if (tenantOrigin != null) {
            target.append("?tenant_origin=")
                .append(URLEncoder.encode(tenantOrigin, StandardCharsets.UTF_8));
        }
        response.sendRedirect(target.toString());
    }
}
