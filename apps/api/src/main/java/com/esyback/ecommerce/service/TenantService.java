package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateTenantRequest;
import com.esyback.ecommerce.dto.UpdateStoreRequest;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.security.SecretCipher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Self-serve tenant (store) creation. Subdomain rules are stricter than the
 * entity's @Pattern on purpose: a subdomain becomes a public DNS label and
 * the tenant's whole identity, so it must be host-safe and not collide with
 * platform-reserved names (auth funnel host, api, www, …).
 */
@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final SecretCipher secretCipher;

    private static final Pattern SUBDOMAIN = Pattern.compile("^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$");

    // Names that must never become a tenant: infra hosts, the OAuth canonical
    // host, common service labels, and the default tenant.
    //
    // "manager"/"manage" are reserved for the back-office surface
    // (manager.esy.ge). TenantContextService strips any <sub>.esy.ge to a
    // subdomain, so a store registered under that name would shadow the whole
    // back office — reserve it before the host exists, not after.
    private static final Set<String> RESERVED = Set.of(
        "main", "www", "api", "auth", "admin", "app", "mail", "smtp", "imap",
        "static", "assets", "cdn", "oauth2", "login", "logout", "esy", "support",
        "help", "status", "blog", "docs", "store", "shop", "account", "accounts",
        "dashboard", "billing", "checkout", "cart", "test", "dev", "staging",
        "internal", "ns", "ns1", "ns2", "ftp", "vpn", "render",
        "manager", "manage"
    );

    /**
     * The reserved list, for the admin config screen to display.
     *
     * <p>Exposed as a read-only accessor rather than copied into the frontend:
     * this set and {@code PlatformHosts} already have to agree, and a third copy
     * in JavaScript would drift the first time a surface is added. {@code Set.of}
     * is immutable, so the caller cannot alter the rule by holding the set.
     */
    public static Set<String> reservedSubdomains() {
        return RESERVED;
    }

    private static final String DEFAULT_PRIMARY = "#6366f1";
    private static final String DEFAULT_SECONDARY = "#8b5cf6";

    // Union of the original set and the design's set — the design introduced
    // "sport" and "wear" while keeping food/home/art, and existing stores are
    // already filed under fashion/electronics. Keeping both avoids migrating
    // live stores into categories their owners did not choose.
    private static final Set<String> CATEGORIES = Set.of(
        "fashion", "electronics", "home", "food", "art", "sport", "wear");

    /**
     * Live subdomain check for the registration wizard.
     * Returns: available | invalid | reserved | taken.
     */
    public String subdomainStatus(String raw) {
        String s = raw == null ? "" : raw.trim().toLowerCase();
        if (!SUBDOMAIN.matcher(s).matches()) return "invalid";
        if (RESERVED.contains(s)) return "reserved";
        if (tenantRepository.existsBySubdomain(s)) return "taken";
        return "available";
    }

    /** Public store directory — active stores only, newest first. */
    public List<Tenant> listActiveStores() {
        return tenantRepository.findAll().stream()
            .filter(t -> Boolean.TRUE.equals(t.getIsActive()))
            .sorted(Comparator.comparing(Tenant::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())))
            .collect(Collectors.toList());
    }

    public Tenant createTenant(CreateTenantRequest req) {
        String name = req.getName() == null ? "" : req.getName().trim();
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Store name is required");
        }

        String subdomain = req.getSubdomain() == null ? "" : req.getSubdomain().trim().toLowerCase();
        if (!SUBDOMAIN.matcher(subdomain).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Subdomain must be 3–30 chars, lowercase letters/numbers/hyphens, and not start or end with a hyphen");
        }
        if (RESERVED.contains(subdomain)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "That subdomain is reserved");
        }
        if (tenantRepository.existsBySubdomain(subdomain)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That subdomain is already taken");
        }
        if (tenantRepository.existsByName(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That store name is already taken");
        }

        Tenant tenant = new Tenant();
        tenant.setName(name);
        tenant.setSubdomain(subdomain);
        tenant.setDisplayName(blankToNull(req.getDisplayName()) == null ? name : req.getDisplayName().trim());
        tenant.setDescription(blankToNull(req.getDescription()));
        tenant.setTagline(clampTagline(req.getTagline()));
        tenant.setLogoUrl(blankToNull(req.getLogoUrl()));
        tenant.setPrimaryColor(normalizeColor(req.getPrimaryColor(), DEFAULT_PRIMARY));
        tenant.setSecondaryColor(normalizeColor(req.getSecondaryColor(), DEFAULT_SECONDARY));
        tenant.setCategory(normalizeCategory(req.getCategory()));
        tenant.setAddressStreet(blankToNull(req.getAddressStreet()));
        tenant.setAddressCity(blankToNull(req.getAddressCity()));
        tenant.setAddressCountry(blankToNull(req.getAddressCountry()));
        tenant.setAddressPostalCode(blankToNull(req.getAddressPostalCode()));
        tenant.setEstablishedYear(parseYear(req.getEstablishedYear()));
        tenant.setIsActive(true);
        return tenantRepository.save(tenant);
    }

    /**
     * Owner-editable branding only. Subdomain + unique name are not touched
     * (routing key / SSO cookie domain / directory identity). Blank fields
     * clear the value; displayName falls back to the store name like signup.
     */
    public Tenant updateBranding(Tenant tenant, UpdateStoreRequest req) {
        if (tenant == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No store in context");
        }
        String displayName = blankToNull(req.getDisplayName());
        tenant.setDisplayName(displayName == null ? tenant.getName() : displayName);
        tenant.setDescription(blankToNull(req.getDescription()));
        tenant.setTagline(clampTagline(req.getTagline()));
        tenant.setLogoUrl(blankToNull(req.getLogoUrl()));
        tenant.setPrimaryColor(normalizeColor(req.getPrimaryColor(), DEFAULT_PRIMARY));
        tenant.setSecondaryColor(normalizeColor(req.getSecondaryColor(), DEFAULT_SECONDARY));
        tenant.setCategory(normalizeCategory(req.getCategory()));
        tenant.setAddressStreet(blankToNull(req.getAddressStreet()));
        tenant.setAddressCity(blankToNull(req.getAddressCity()));
        tenant.setAddressCountry(blankToNull(req.getAddressCountry()));
        tenant.setAddressPostalCode(blankToNull(req.getAddressPostalCode()));
        tenant.setEstablishedYear(parseYear(req.getEstablishedYear()));
        applyBogCredentials(tenant, req);
        return tenantRepository.save(tenant);
    }

    /**
     * Connect / update / disconnect the store's Bank of Georgia merchant
     * account. The field is tri-state on purpose, because neither the clientId
     * nor the secret is ever sent back to the browser:
     *
     * <ul>
     *   <li><b>{@code bogClientId == null}</b> (key omitted) — the request is a
     *       plain branding save that never touched payments; leave BOG as is.
     *   <li><b>{@code bogClientId} blank</b> (explicit "") — disconnect: clear
     *       both fields.
     *   <li><b>{@code bogClientId} present</b> — connect/update: a non-blank
     *       secret is AES-GCM encrypted and stored; a blank secret keeps the
     *       one already on file (so updating just the id doesn't wipe it).
     * </ul>
     */
    private void applyBogCredentials(Tenant tenant, UpdateStoreRequest req) {
        if (req.getBogClientId() == null) {
            return; // not part of this request
        }
        String clientId = blankToNull(req.getBogClientId());
        if (clientId == null) {
            tenant.setBogClientId(null);
            tenant.setBogClientSecret(null);
            return;
        }
        tenant.setBogClientId(clientId);
        String secret = blankToNull(req.getBogClientSecret());
        if (secret != null) {
            tenant.setBogClientSecret(secretCipher.encrypt(secret));
        }
    }

    // Founding year, sanity-bounded. Blank/garbage/out-of-range → null so the
    // storefront hero falls back to its default instead of showing "est 0".
    private static Integer parseYear(String s) {
        String v = blankToNull(s);
        if (v == null) return null;
        try {
            int y = Integer.parseInt(v);
            int max = java.time.Year.now().getValue() + 1;
            return (y >= 1900 && y <= max) ? y : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /**
     * The hero tagline, trimmed to one line and cut to the column width.
     *
     * <p>It is a {@code varchar(255)}, and it renders on one line in the hero
     * and in a directory card, so a pasted paragraph would either be rejected
     * by the database or wreck the layout. Newlines collapse to spaces for the
     * same reason: this field has exactly one line to live on.
     */
    static String clampTagline(String s) {
        String t = blankToNull(s);
        if (t == null) return null;
        t = t.replaceAll("\\s+", " ").trim();
        return t.length() <= TAGLINE_MAX ? t : t.substring(0, TAGLINE_MAX).trim();
    }

    /** Matches the column; the editor counts down to the same number. */
    public static final int TAGLINE_MAX = 160;

    private static String normalizeColor(String color, String fallback) {
        String c = blankToNull(color);
        if (c == null) return fallback;
        return c.matches("^#[0-9a-fA-F]{6}$") ? c : fallback;
    }

    private static String normalizeCategory(String category) {
        String c = blankToNull(category);
        if (c == null) return null;
        c = c.toLowerCase();
        return CATEGORIES.contains(c) ? c : null;
    }
}
