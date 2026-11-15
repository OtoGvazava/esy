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

    /**
     * The team, then the invitations still waiting for an answer. A pending
     * row carries only what the owner typed (the address and the role) with
     * {@code pending: true}; who the address belongs to is not the owner's
     * to learn until it accepts (review M36).
     */
    @GetMapping
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public List<Map<String, Object>> list() {
        com.esyback.ecommerce.entity.Tenant tenant = tenantContextService.getCurrentTenant();
        List<Map<String, Object>> rows = new java.util.ArrayList<>(membershipService.staffOf(tenant)
            .stream().map(StoreTeamController::toMap).toList());
        for (com.esyback.ecommerce.entity.StoreInvitation inv : membershipService.invitationsOf(tenant)) {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("email", inv.getEmail());
            out.put("role", inv.getRole());
            out.put("pending", true);
            out.put("invitedAt", inv.getCreatedAt() == null ? null : inv.getCreatedAt().toString());
            rows.add(out);
        }
        return rows;
    }

    /**
     * Body: {"email": "…", "role": "OWNER"|"MANAGER"}. Offers the role; it
     * applies only once accepted (moving an owner down to manager applies at
     * once). Returns the new list, the same whether or not the address has an
     * account.
     */
    @PostMapping
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public List<Map<String, Object>> assign(@RequestBody Map<String, String> body,
                                            org.springframework.security.core.Authentication authentication) {
        String email = body == null ? null : body.get("email");
        String role = body == null ? null : body.get("role");
        String by = authentication == null ? null : authentication.getName();
        try {
            membershipService.invite(tenantContextService.getCurrentTenant(), email, role, by);
        } catch (org.springframework.dao.DataIntegrityViolationException racedTheSameInvite) {
            // Two invitations to one address at once (a double click): the
            // other one inserted first, so this one becomes an update of it.
            membershipService.invite(tenantContextService.getCurrentTenant(), email, role, by);
        }
        return list();
    }

    /**
     * Take someone off the team (which also withdraws any invitation to them),
     * or, with {@code ?invitation=true}, only withdraw the invitation. Two
     * different acts on two different rows: guessing between them let
     * "Remove" withdraw a leftover invitation and leave the member in place.
     */
    @DeleteMapping("/{email}")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<List<Map<String, Object>>> remove(@PathVariable String email,
                                                            @RequestParam(defaultValue = "false") boolean invitation) {
        com.esyback.ecommerce.entity.Tenant tenant = tenantContextService.getCurrentTenant();
        if (invitation) membershipService.cancelInvitation(tenant, email);
        else membershipService.removeStaffQuietly(tenant, email);
        return ResponseEntity.ok(list());
    }

    private static Map<String, Object> toMap(StoreMembership m) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("email", m.getUser() == null ? null : m.getUser().getEmail());
        out.put("name", m.getUser() == null ? null : m.getUser().getUsername());
        // The person's own name from their profile, so the list can say who
        // someone is rather than only which address they signed in with. Null
        // until they have filled the profile in.
        out.put("firstName", m.getUser() == null ? null : m.getUser().getFirstName());
        out.put("lastName", m.getUser() == null ? null : m.getUser().getLastName());
        out.put("role", m.getRole() == null ? null : m.getRole().name());
        return out;
    }
}
