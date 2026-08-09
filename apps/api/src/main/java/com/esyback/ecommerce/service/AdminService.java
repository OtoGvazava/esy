package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.AuditLog;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.PlatformAdmin;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.AuditLogRepository;
import com.esyback.ecommerce.repository.PlatformAdminRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.StoreMembershipRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Platform administration (decision D6): the cross-store view, gated by
 * {@code hasRole('ADMIN')} at the controller.
 *
 * <p><b>Scope rule.</b> Nothing here touches {@link TenantContextService}. Every
 * store this service reads or writes arrives as an explicit subdomain from the
 * caller, because the admin host has no store scope — {@code getCurrentTenant()}
 * there always resolves to the default ("main") store, so a context read would
 * silently serve one merchant's numbers under every store's name. Keeping
 * platform payloads free of merchant-scoped context is the whole point of the
 * split.
 *
 * <p><b>Money.</b> Revenue and fees come from {@link OrderService#revenue} and
 * {@link OrderService#serviceFeesOwed}, which already implement decision D2
 * (refunded money is not revenue, and neither are cancelled orders). They are
 * reused rather than re-derived so the admin totals can never drift from the
 * numbers the merchant sees on their own stats screen.
 *
 * <p><b>Audit.</b> Every state-changing method writes an {@link AuditLog} row in
 * the same transaction as the change, so a suspension that commits without its
 * trail is not a reachable state.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AdminService {

    private final TenantRepository tenantRepository;
    private final ProductRepository productRepository;
    private final StoreMembershipRepository membershipRepository;
    private final AuditLogRepository auditLogRepository;
    private final PlatformAdminRepository platformAdminRepository;
    private final OrderService orderService;
    private final UserService userService;
    // The ADMIN allowlist, read live (Redis override → env ADMIN_EMAILS → ""),
    // exactly as UserService reads it when it grants the role at sign-in.
    private final ConfigStore configStore;

    /** Key the allowlist lives under; must match UserService. */
    private static final String ADMIN_EMAILS_KEY = "app.admin-emails";

    private static final String SOURCE_ENV = "env";
    private static final String SOURCE_DB = "db";

    private static final String TARGET_STORE = "STORE";
    private static final String TARGET_ADMIN = "ADMIN";

    private static final String ACTION_STORE_SUSPENDED = "STORE_SUSPENDED";
    private static final String ACTION_STORE_REACTIVATED = "STORE_REACTIVATED";
    private static final String ACTION_ADMIN_GRANTED = "ADMIN_GRANTED";
    private static final String ACTION_ADMIN_REVOKED = "ADMIN_REVOKED";

    /** How many orders the store detail carries. Bounded: a store's order list grows without limit. */
    private static final int RECENT_ORDERS = 10;

    private static final int DEFAULT_AUDIT_LIMIT = 50;
    private static final int MAX_AUDIT_LIMIT = 500;

    /** "Members" of a store = the people who run it. See the repository note. */
    private static final Set<StoreMembership.Role> STAFF =
        EnumSet.of(StoreMembership.Role.OWNER, StoreMembership.Role.MANAGER);

    // Deliberately loose: this only rejects obvious typos before a row is
    // written. The real gate is that the address must match a Google sign-in.
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    // Newest store first, matching the public directory's ordering.
    private static final Comparator<Tenant> NEWEST_FIRST =
        Comparator.comparing(Tenant::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()));

    // ---------------------------------------------------------------- stores

    /**
     * Every store on the platform — including inactive and suspended ones,
     * which is the reason this view exists at all. {@code q} filters on
     * subdomain / name / display name / owner email, case-insensitively; blank
     * means no filter.
     */
    public List<Map<String, Object>> listStores(String q) {
        String needle = q == null ? "" : q.trim().toLowerCase();
        Map<Long, String> owners = ownerEmailByTenantId();
        return tenantRepository.findAll().stream()
            .filter(t -> matches(t, owners.get(t.getId()), needle))
            .sorted(NEWEST_FIRST)
            .map(t -> storeSummary(t, owners.get(t.getId())))
            .collect(Collectors.toList());
    }

    /** One store's summary plus its staff and its most recent orders. */
    public Map<String, Object> storeDetail(String subdomain) {
        Tenant tenant = requireStore(subdomain);
        List<StoreMembership> staff = membershipRepository.findByTenantAndRoleIn(tenant, STAFF);
        Map<String, Object> body = storeSummary(tenant, ownerEmail(staff));
        body.put("members", members(staff));
        body.put("recentOrders", recentOrders(tenant));
        return body;
    }

    /**
     * Take a store offline. Flips {@code isActive} (what the storefront and the
     * public directory read) and records who did it, when and why on the row
     * itself; the full history is the audit trail.
     *
     * <p>Re-suspending an already-suspended store is allowed and simply
     * re-stamps the reason — an admin correcting the reason text should not
     * have to reactivate the shop to do it. Each attempt is its own audit row.
     */
    @Transactional
    public Map<String, Object> suspend(String subdomain, String reason, String actorEmail) {
        String why = blankToNull(reason);
        if (why == null) {
            throw bad("A suspension reason is required — the store owner is shown it");
        }
        Tenant tenant = requireStore(subdomain);
        tenant.setIsActive(false);
        tenant.setSuspendedAt(Instant.now());
        tenant.setSuspendedBy(actorEmail);
        tenant.setSuspendReason(why);
        tenantRepository.save(tenant);
        audit(actorEmail, ACTION_STORE_SUSPENDED, TARGET_STORE, tenant.getSubdomain(), why);
        return storeSummary(tenant, ownerEmailOf(tenant));
    }

    /** Put a store back online and clear all three suspension fields together. */
    @Transactional
    public Map<String, Object> reactivate(String subdomain, String actorEmail) {
        Tenant tenant = requireStore(subdomain);
        String previous = tenant.getSuspendReason();
        tenant.setIsActive(true);
        tenant.setSuspendedAt(null);
        tenant.setSuspendedBy(null);
        tenant.setSuspendReason(null);
        tenantRepository.save(tenant);
        audit(actorEmail, ACTION_STORE_REACTIVATED, TARGET_STORE, tenant.getSubdomain(),
            previous == null ? null : "was suspended: " + previous);
        return storeSummary(tenant, ownerEmailOf(tenant));
    }

    // --------------------------------------------------------------- billing

    /**
     * What each store owes the platform in service fees, biggest debt first,
     * plus the platform-wide total. Suspended stores are included: taking a
     * shop offline does not cancel fees already accrued.
     */
    public Map<String, Object> billing() {
        List<Map<String, Object>> stores = tenantRepository.findAll().stream()
            .map(t -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("subdomain", t.getSubdomain());
                row.put("name", t.getName());
                row.put("orderCount", orderService.orderCount(t));
                row.put("revenue", orderService.revenue(t));
                row.put("feesOwed", orderService.serviceFeesOwed(t));
                return row;
            })
            .sorted(Comparator
                .comparing((Map<String, Object> row) -> (BigDecimal) row.get("feesOwed"))
                .reversed()
                .thenComparing(row -> String.valueOf(row.get("name"))))
            .collect(Collectors.toList());

        BigDecimal totalAccrued = stores.stream()
            .map(row -> (BigDecimal) row.get("feesOwed"))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("totalAccrued", totalAccrued);
        body.put("stores", stores);
        return body;
    }

    // ---------------------------------------------------------------- admins

    /**
     * The effective ADMIN allowlist: the UNION of {@code app.admin-emails}
     * (source "env") and the {@code platform_admins} table (source "db").
     *
     * <p>The env half is the bootstrap and is why the union exists: if the only
     * source were the table, one bad DELETE — or an empty table on a fresh
     * database — would lock every administrator out of the platform with no way
     * back in short of a redeploy. An address present in both reports "env",
     * because that is the source that decides whether it can be revoked here.
     */
    public List<Map<String, Object>> admins() {
        Map<String, Map<String, Object>> byEmail = new TreeMap<>();
        for (PlatformAdmin row : platformAdminRepository.findAllByOrderByEmailAsc()) {
            String email = PlatformAdmin.normalizeEmail(row.getEmail());
            byEmail.put(email, adminMap(email, SOURCE_DB, row.getGrantedAt(), row.getGrantedBy()));
        }
        for (String email : envAdminEmails()) {
            // Keep any grant metadata a db row carries, but report the source
            // that governs revocation.
            Map<String, Object> existing = byEmail.get(email);
            byEmail.put(email, adminMap(email, SOURCE_ENV,
                existing == null ? null : (Instant) existing.get("grantedAt"),
                existing == null ? null : (String) existing.get("grantedBy")));
        }
        return new ArrayList<>(byEmail.values());
    }

    /** Grant ADMIN to an address at runtime (a "db"-sourced entry). */
    @Transactional
    public Map<String, Object> grantAdmin(String email, String actorEmail) {
        String normalized = PlatformAdmin.normalizeEmail(blankToNull(email));
        if (normalized == null || !EMAIL.matcher(normalized).matches()) {
            throw bad("A valid email address is required");
        }
        if (envAdminEmails().contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                normalized + " is already an admin via configuration (ADMIN_EMAILS)");
        }
        if (platformAdminRepository.existsByEmailIgnoreCase(normalized)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, normalized + " is already an admin");
        }
        PlatformAdmin saved = platformAdminRepository.save(PlatformAdmin.of(normalized, actorEmail));
        audit(actorEmail, ACTION_ADMIN_GRANTED, TARGET_ADMIN, normalized, null);
        return adminMap(saved.getEmail(), SOURCE_DB, saved.getGrantedAt(), saved.getGrantedBy());
    }

    /**
     * Revoke a runtime grant. An env-sourced address is refused with 400: no
     * row exists to delete, so a "success" here would be a lie the UI would
     * show as a removal while the address kept its access on the next sign-in.
     * Removing it means editing ADMIN_EMAILS.
     */
    @Transactional
    public void revokeAdmin(String email, String actorEmail) {
        String normalized = PlatformAdmin.normalizeEmail(blankToNull(email));
        if (normalized == null) {
            throw bad("An email address is required");
        }
        if (envAdminEmails().contains(normalized)) {
            throw bad(normalized + " is granted by configuration (ADMIN_EMAILS) and can't be removed here");
        }
        if (platformAdminRepository.deleteByEmailIgnoreCase(normalized) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, normalized + " is not an admin");
        }
        // Strip the role now rather than leaving it until their next sign-in,
        // where syncAdminRole would catch it. A revoked admin who stays logged
        // in would otherwise keep every platform power indefinitely — sessions
        // here are long-lived and nothing forces a re-authentication.
        userService.revokeAdminRole(normalized);
        audit(actorEmail, ACTION_ADMIN_REVOKED, TARGET_ADMIN, normalized, null);
    }

    // ----------------------------------------------------------------- audit

    /** Newest first, always bounded — this table only grows. */
    public List<Map<String, Object>> audit(int limit) {
        int capped = Math.min(Math.max(limit <= 0 ? DEFAULT_AUDIT_LIMIT : limit, 1), MAX_AUDIT_LIMIT);
        return auditLogRepository.findAllByOrderByAtDescIdDesc(PageRequest.of(0, capped)).stream()
            .map(row -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("at", row.getAt());
                m.put("actorEmail", row.getActorEmail());
                m.put("action", row.getAction());
                m.put("targetType", row.getTargetType());
                m.put("targetId", row.getTargetId());
                m.put("detail", row.getDetail());
                return m;
            })
            .collect(Collectors.toList());
    }

    // --------------------------------------------------------------- helpers

    /**
     * The store object the whole namespace returns. Built here (inside the
     * transaction) rather than handed to Jackson as entities, so lazy
     * associations are resolved while the session is open and no column the
     * contract doesn't name — BOG credentials above all — can leak.
     */
    private Map<String, Object> storeSummary(Tenant t, String ownerEmail) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("subdomain", t.getSubdomain());
        m.put("name", t.getName());
        m.put("displayName", t.getDisplayName());
        m.put("category", t.getCategory());
        // Same reading as the public directory (TenantService.listActiveStores):
        // a NULL is not active. A store must not show as live here while being
        // absent from the directory.
        m.put("active", Boolean.TRUE.equals(t.getIsActive()));
        m.put("suspendedAt", t.getSuspendedAt());
        m.put("suspendReason", t.getSuspendReason());
        m.put("productCount", productRepository.countByTenant(t));
        m.put("orderCount", orderService.orderCount(t));
        m.put("revenue", orderService.revenue(t));
        m.put("feesOwed", orderService.serviceFeesOwed(t));
        m.put("ownerEmail", ownerEmail);
        return m;
    }

    private List<Map<String, Object>> members(List<StoreMembership> staff) {
        return staff.stream()
            .filter(m -> m.getUser() != null)
            .sorted(Comparator
                .comparingInt((StoreMembership m) -> m.getRole() == StoreMembership.Role.OWNER ? 0 : 1)
                .thenComparing(m -> String.valueOf(m.getUser().getEmail())))
            .map(m -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("email", m.getUser().getEmail());
                row.put("role", m.getRole().name());
                return row;
            })
            .collect(Collectors.toList());
    }

    private List<Map<String, Object>> recentOrders(Tenant tenant) {
        return orderService.ordersForTenant(tenant).stream()
            .limit(RECENT_ORDERS)
            .map(o -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("orderNumber", o.getOrderNumber());
                row.put("total", o.getTotal());
                // Raw enum names (PLACED, OUT_FOR_DELIVERY, NONE, …), unlike
                // OrderController.toMap's display-cased strings: the admin
                // screens key i18n labels and tone off these values directly,
                // so they must be the constants, not a prettified rendering of
                // them. Legacy prod rows can hold a NULL payment_status.
                Order.Status status = o.getStatus() == null ? Order.Status.PLACED : o.getStatus();
                Order.PaymentStatus paid = o.getPaymentStatus() == null
                    ? Order.PaymentStatus.NONE : o.getPaymentStatus();
                row.put("status", status.name());
                row.put("paymentStatus", paid.name());
                row.put("createdAt", o.getCreatedAt());
                return row;
            })
            .collect(Collectors.toList());
    }

    /** tenantId → owner email, from one query, for the store list. */
    private Map<Long, String> ownerEmailByTenantId() {
        Map<Long, String> owners = new HashMap<>();
        membershipRepository.findByRole(StoreMembership.Role.OWNER).stream()
            .filter(m -> m.getTenant() != null && m.getUser() != null)
            // A store should have exactly one OWNER; sorting makes the pick
            // deterministic if data ever says otherwise.
            .sorted(Comparator.comparing(m -> String.valueOf(m.getUser().getEmail())))
            .forEach(m -> owners.putIfAbsent(m.getTenant().getId(), m.getUser().getEmail()));
        return owners;
    }

    private String ownerEmailOf(Tenant tenant) {
        return ownerEmail(membershipRepository.findByTenantAndRoleIn(tenant, STAFF));
    }

    private static String ownerEmail(Collection<StoreMembership> staff) {
        return staff.stream()
            .filter(m -> m.getRole() == StoreMembership.Role.OWNER && m.getUser() != null)
            .map(m -> m.getUser().getEmail())
            .sorted()
            .findFirst()
            .orElse(null);
    }

    private boolean matches(Tenant t, String ownerEmail, String needle) {
        if (needle.isEmpty()) return true;
        return contains(t.getSubdomain(), needle)
            || contains(t.getName(), needle)
            || contains(t.getDisplayName(), needle)
            || contains(ownerEmail, needle);
    }

    private static boolean contains(String haystack, String needle) {
        return haystack != null && haystack.toLowerCase().contains(needle);
    }

    private Tenant requireStore(String subdomain) {
        String s = subdomain == null ? "" : subdomain.trim().toLowerCase();
        return tenantRepository.findBySubdomain(s)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found"));
    }

    /** The configured allowlist, normalized the same way UserService reads it. */
    private Set<String> envAdminEmails() {
        String raw = configStore.get(ADMIN_EMAILS_KEY, "");
        if (raw == null || raw.isBlank()) return Set.of();
        return Arrays.stream(raw.split(","))
            .map(s -> s.trim().toLowerCase())
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static Map<String, Object> adminMap(String email, String source, Instant grantedAt, String grantedBy) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("email", email);
        m.put("source", source);
        m.put("grantedAt", grantedAt);
        m.put("grantedBy", grantedBy);
        return m;
    }

    private void audit(String actorEmail, String action, String targetType, String targetId, String detail) {
        auditLogRepository.save(AuditLog.of(actorEmail, action, targetType, targetId, detail));
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
