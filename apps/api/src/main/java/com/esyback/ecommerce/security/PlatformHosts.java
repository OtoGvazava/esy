package com.esyback.ecommerce.security;

import java.util.List;

/**
 * The single source of truth for which hosts are platform-owned rather than
 * tenant storefronts.
 *
 * <p>Before this class the host rules were copied across TenantContextService,
 * TenantOrigins, AuthCookie, SecurityConfig and two web helpers, and a code
 * review flagged that adding a host meant editing every copy — with each
 * half-update failing differently and silently. Adding a base domain (a staging
 * apex, say) is now one entry in {@link #BASE_DOMAINS}.
 *
 * <p>Every platform subdomain here MUST also be in TenantService's RESERVED
 * list, or a merchant could register the name and shadow the real host.
 */
public final class PlatformHosts {

    private PlatformHosts() {}

    /** Registrable domains esy serves. Storefronts are {@code <sub>.<domain>}. */
    private static final List<String> BASE_DOMAINS = List.of("esy.ge", "lvh.me", "localhost");

    /** Subdomains reserved for platform surfaces, never for a store. */
    public static final String MANAGER = "manager";
    public static final String ADMIN = "admin";

    /** manager.esy.ge / manager.lvh.me / manager.localhost — the back office. */
    public static boolean isManager(String bareHost) {
        return matches(bareHost, MANAGER);
    }

    /** admin.esy.ge / admin.lvh.me / admin.localhost — platform administration. */
    public static boolean isAdmin(String bareHost) {
        return matches(bareHost, ADMIN);
    }

    /** The apex or www of any base domain — the public front door. */
    public static boolean isApex(String bareHost) {
        if (bareHost == null) return false;
        String h = bareHost.toLowerCase();
        for (String d : BASE_DOMAINS) {
            if (h.equals(d) || h.equals("www." + d)) return true;
        }
        return false;
    }

    /**
     * True when the host is a platform surface of any kind — apex, back office
     * or administration. These never resolve to a tenant from the Host header.
     */
    public static boolean isPlatformSurface(String bareHost) {
        return isApex(bareHost) || isManager(bareHost) || isAdmin(bareHost);
    }

    /**
     * The storefront subdomain for {@code <sub>.<base domain>}, or null when the
     * host is not a tenant storefront (apex, a platform surface, or a host esy
     * does not serve).
     */
    public static String storefrontSubdomain(String bareHost) {
        if (bareHost == null) return null;
        String h = bareHost.toLowerCase();
        if (isPlatformSurface(h)) return null;
        for (String d : BASE_DOMAINS) {
            String suffix = "." + d;
            if (h.endsWith(suffix)) {
                String label = h.substring(0, h.length() - suffix.length());
                return label.isEmpty() ? null : label;
            }
        }
        return null;
    }

    private static boolean matches(String bareHost, String prefix) {
        if (bareHost == null) return false;
        String h = bareHost.toLowerCase();
        for (String d : BASE_DOMAINS) {
            if (h.equals(prefix + "." + d)) return true;
        }
        return false;
    }
}
