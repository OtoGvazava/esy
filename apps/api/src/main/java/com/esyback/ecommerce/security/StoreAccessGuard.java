package com.esyback.ecommerce.security;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.service.MembershipService;
import com.esyback.ecommerce.service.TenantContextService;
import com.esyback.ecommerce.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Authorization predicates for store-management endpoints. Two tiers
 * (decision D5):
 *
 *  - {@code canManageCurrentStore} — day-to-day running: product CRUD, orders,
 *    statistics. OWNER or MANAGER of the store the request resolves to.
 *  - {@code ownsCurrentStore} — the store itself: settings/branding edits,
 *    user management, integrations. OWNER only.
 *
 * A platform ADMIN passes both — deliberately kept as an explicit early
 * return, not folded into membership, so the two permission axes (platform
 * role vs store role) stay independently auditable. The service layer is
 * already tenant-scoped, so a caller can only ever mutate the resolved
 * store's data.
 */
@Component("storeAccess")
@RequiredArgsConstructor
public class StoreAccessGuard {

    private final UserService userService;
    private final MembershipService membershipService;
    private final TenantContextService tenantContextService;

    public boolean canManageCurrentStore(Authentication authentication) {
        User user = authenticated(authentication);
        if (user == null) return false;
        if (isPlatformAdmin(user)) return true;
        if (noStoreInScope()) return false;
        return membershipService.canManage(user, tenantContextService.getCurrentTenant());
    }

    public boolean ownsCurrentStore(Authentication authentication) {
        User user = authenticated(authentication);
        if (user == null) return false;
        if (isPlatformAdmin(user)) return true;
        if (noStoreInScope()) return false;
        return membershipService.isOwner(user, tenantContextService.getCurrentTenant());
    }

    /**
     * The platform front door has no store to manage — but the manager host is
     * platform-faced AND store-scoped (?tenant=<sub> selects the store there),
     * so it must fall through to the membership check. Without this exception
     * every guarded endpoint 403s for non-ADMIN owners/managers on the back
     * office, the exact audience it exists for (AuthController carries the
     * same exception for the UI's canManageStore flag).
     */
    private boolean noStoreInScope() {
        return tenantContextService.isPlatformHost() && !tenantContextService.isManagerHost();
    }

    private User authenticated(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userService.findByUsername(authentication.getName()).orElse(null);
    }

    private static boolean isPlatformAdmin(User user) {
        return user.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()));
    }
}
