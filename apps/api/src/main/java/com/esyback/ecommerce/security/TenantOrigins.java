package com.esyback.ecommerce.security;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Set;
import java.util.regex.Pattern;

/**
 * Allowlist for the tenant origin carried through the OAuth canonical-host
 * funnel. The success handler redirects the browser (with the JWT) to this
 * origin, so an unvalidated value would be an open redirect / token-leak —
 * never relax this without thinking about that.
 */
public final class TenantOrigins {

    private TenantOrigins() {}

    // https://<tenant>.esy.ge   (subdomain label only — no nested dots)
    private static final Pattern TENANT_HOST =
        Pattern.compile("^https://[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\\.esy\\.ge$");

    private static final Set<String> EXTRA = Set.of(
        "https://esy.ge",
        "https://www.esy.ge",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080"
    );

    public static boolean isAllowed(String origin) {
        if (origin == null || origin.isBlank()) return false;
        return EXTRA.contains(origin) || TENANT_HOST.matcher(origin).matches();
    }

    /**
     * Scheme + host (+ non-default port) for the incoming request. Reflects
     * X-Forwarded-* because the app runs forward-headers-strategy=framework,
     * so behind Render's TLS proxy this is the real external origin.
     */
    public static String of(HttpServletRequest request) {
        String scheme = request.getScheme();
        String host = request.getServerName();
        int port = request.getServerPort();
        boolean defaultPort = ("https".equals(scheme) && port == 443)
            || ("http".equals(scheme) && port == 80);
        return defaultPort ? scheme + "://" + host : scheme + "://" + host + ":" + port;
    }
}
