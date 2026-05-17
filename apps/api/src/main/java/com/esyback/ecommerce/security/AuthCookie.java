package com.esyback.ecommerce.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

/**
 * The session JWT as a cookie scoped to the registrable domain so one sign-in
 * carries across the apex and every wildcard tenant subdomain
 * (esy.ge + *.esy.ge). HttpOnly: the token is never exposed to tenant-store
 * JS, so an XSS in one store can't lift the shared session.
 *
 * On esy.ge hosts the cookie is Domain=esy.ge (sent to all subdomains). On
 * lvh.me (local dev) it is Domain=lvh.me. On bare localhost/127.0.0.1
 * it is host-only — browsers reject Domain for single-label hostnames.
 */
public final class AuthCookie {

    public static final String NAME = "esy_token";

    private AuthCookie() {}

    public static void add(HttpServletRequest request, HttpServletResponse response,
                           String token, long maxAgeSeconds) {
        write(request, response, token, maxAgeSeconds);
    }

    public static void clear(HttpServletRequest request, HttpServletResponse response) {
        write(request, response, "", 0);
    }

    public static String read(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (jakarta.servlet.http.Cookie c : request.getCookies()) {
            if (NAME.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                return c.getValue();
            }
        }
        return null;
    }

    private static void write(HttpServletRequest request, HttpServletResponse response,
                              String value, long maxAgeSeconds) {
        ResponseCookie.ResponseCookieBuilder b = ResponseCookie.from(NAME, value)
            .httpOnly(true)
            .secure(request.isSecure()) // reflects X-Forwarded-Proto (forward-headers-strategy=framework)
            .path("/")
            .sameSite("Lax")
            .maxAge(maxAgeSeconds);

        String domain = registrableDomain(request.getServerName());
        if (domain != null) {
            b.domain(domain);
        }
        response.addHeader(HttpHeaders.SET_COOKIE, b.build().toString());
    }

    private static String registrableDomain(String host) {
        if (host == null) return null;
        String h = host.toLowerCase();
        if (h.equals("esy.ge") || h.endsWith(".esy.ge")) return "esy.ge";
        if (h.equals("lvh.me") || h.endsWith(".lvh.me")) return "lvh.me";
        return null;
    }
}
