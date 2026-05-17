package com.esyback.ecommerce.security;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.service.MembershipService;
import com.esyback.ecommerce.service.TenantContextService;
import com.esyback.ecommerce.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/**
 * Authorization predicate for store-management endpoints (product CRUD,
 * store-branding edits). True when the caller is a global ADMIN, or the OWNER
 * of the store the request resolves to (Host header -> current tenant). The
 * service layer is already tenant-scoped, so an owner can only ever mutate
 * their own store's data. Referenced from @PreAuthorize as
 * {@code @storeAccess.canManageCurrentStore(authentication)}.
 */
@Component("storeAccess")
@RequiredArgsConstructor
public class StoreAccessGuard {

    private final UserService userService;
    private final MembershipService membershipService;
    private final TenantContextService tenantContextService;

    public boolean canManageCurrentStore(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        User user = userService.findByUsername(authentication.getName()).orElse(null);
        if (user == null) {
            return false;
        }
        boolean admin = user.getRoles().stream()
            .anyMatch(r -> "ADMIN".equals(r.getName()));
        if (admin) {
            return true;
        }
        // Platform front door has no store to manage.
        if (tenantContextService.isPlatformHost()) {
            return false;
        }
        return membershipService.isOwner(user, tenantContextService.getCurrentTenant());
    }
}
