package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.service.MembershipService;
import com.esyback.ecommerce.service.TenantContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Who runs this store, from the merchant's own back office.
 *
 * <p>Until now a store role could only be granted from {@code admin.esy.ge},
 * which meant an owner adding their own colleague had to ask the platform.
 * That was a gap left by removing the "platform ADMIN can do anything"
 * shortcut before its merchant-side replacement existed.
 *
 * <p>The rules — a store always keeps an owner, roles go only to real
 * accounts, CUSTOMER is not grantable — live in {@link MembershipService} and
 * are shared with the admin screen, so the two cannot drift apart on who may
 * run a shop. What differs is scope and audience: this acts on the store the
 * request already resolved to and never names another, while the admin
 * endpoint takes the store as a path parameter and writes an audit row.
 *
 * <p>OWNER-only (D5). A MANAGER runs the shop day to day; who else can run it
 * stays with the owner.
 */
@RestController
@RequestMapping("/api/store/team")
@RequiredArgsConstructor
public class StoreTeamController {

    private final MembershipService membershipService;
    private final TenantContextService tenantContextService;

    @GetMapping
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public List<Map<String, Object>> list() {
        return membershipService.staffOf(tenantContextService.getCurrentTenant())
            .stream().map(StoreTeamController::toMap).toList();
    }

    /** Body: {"email": "…", "role": "OWNER"|"MANAGER"}. Returns the new list. */
    @PostMapping
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public List<Map<String, Object>> assign(@RequestBody Map<String, String> body) {
        String email = body == null ? null : body.get("email");
        String role = body == null ? null : body.get("role");
        membershipService.assignStaff(tenantContextService.getCurrentTenant(), email, role);
        return list();
    }

    @DeleteMapping("/{email}")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<List<Map<String, Object>>> remove(@PathVariable String email) {
        membershipService.removeStaff(tenantContextService.getCurrentTenant(), email);
        return ResponseEntity.ok(list());
    }

    private static Map<String, Object> toMap(StoreMembership m) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("email", m.getUser() == null ? null : m.getUser().getEmail());
        out.put("name", m.getUser() == null ? null : m.getUser().getUsername());
        out.put("role", m.getRole() == null ? null : m.getRole().name());
        return out;
    }
}
