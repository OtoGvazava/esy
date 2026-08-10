package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.StoreMembershipRepository;
import com.esyback.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class MembershipService {

    private final StoreMembershipRepository membershipRepository;
    // A repository rather than UserService: UserService already depends on this
    // class, and going back through it would close the cycle.
    private final UserRepository userRepository;

    /** The roles that mean "runs this shop", as opposed to "shops here". */
    public static final List<StoreMembership.Role> STAFF =
        List.of(StoreMembership.Role.OWNER, StoreMembership.Role.MANAGER);

    /**
     * Upsert a (user, tenant) membership. A higher role is never downgraded by
     * a later lower-role touch (rank: OWNER > MANAGER > CUSTOMER) — buying from
     * a store you manage must not strip your management rights.
     */
    public StoreMembership ensure(User user, Tenant tenant, StoreMembership.Role role) {
        if (user == null || tenant == null) return null;
        return membershipRepository.findByUserAndTenant(user, tenant)
            .map(m -> {
                if (rank(role) > rank(m.getRole())) {
                    m.setRole(role);
                    return membershipRepository.save(m);
                }
                return m;
            })
            .orElseGet(() -> {
                StoreMembership m = new StoreMembership();
                m.setUser(user);
                m.setTenant(tenant);
                m.setRole(role);
                return membershipRepository.save(m);
            });
    }

    /**
     * Set a membership to exactly this role, creating it if absent. The
     * difference from {@link #ensure} is the demotion: ensure exists for
     * incidental touches — shopping at a store you manage must not cost you
     * your management rights — whereas this is a deliberate act by a platform
     * admin, where "make this owner a manager" has to mean what it says.
     */
    public StoreMembership assign(User user, Tenant tenant, StoreMembership.Role role) {
        if (user == null || tenant == null || role == null) return null;
        StoreMembership m = membershipRepository.findByUserAndTenant(user, tenant)
            .orElseGet(() -> {
                StoreMembership fresh = new StoreMembership();
                fresh.setUser(user);
                fresh.setTenant(tenant);
                return fresh;
            });
        m.setRole(role);
        return membershipRepository.save(m);
    }

    /**
     * Drop a membership entirely. Signing in on the storefront recreates it as
     * CUSTOMER, so this removes the management relationship rather than banning
     * the person from shopping.
     */
    public void remove(User user, Tenant tenant) {
        if (user == null || tenant == null) return;
        membershipRepository.findByUserAndTenant(user, tenant)
            .ifPresent(membershipRepository::delete);
    }

    // ─── Staff management (D17) ─────────────────────────────────────────────
    // These carry the rules, so the platform admin screen and the merchant's
    // own Team screen enforce them identically. Two callers with the same
    // rules and different audiences: admin names the store by path parameter
    // and writes an audit row, the owner acts on the store they are already
    // scoped to. Only the guards live here.

    /** Who runs this store — OWNER and MANAGER, never the shopper list. */
    @Transactional(readOnly = true)
    public List<StoreMembership> staffOf(Tenant tenant) {
        return membershipRepository.findByTenantAndRoleIn(tenant, STAFF);
    }

    /**
     * Put someone in charge of a store, or change the role they hold.
     *
     * @return the membership, and the role it replaced (null when new), so a
     *         caller that audits can say what actually changed.
     */
    public Assignment assignStaff(Tenant tenant, String email, String roleName) {
        String normalized = normalizeEmail(email);
        if (normalized == null || !normalized.contains("@")) {
            throw bad("A valid email address is required");
        }

        StoreMembership.Role target;
        try {
            target = StoreMembership.Role.valueOf(String.valueOf(roleName).trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw bad("Role must be OWNER or MANAGER");
        }
        if (!STAFF.contains(target)) {
            throw bad("Role must be OWNER or MANAGER — CUSTOMER is recorded automatically, not granted");
        }

        // Identities come from Google, so a row invented for an address nobody
        // has signed in with would never match the person who eventually does.
        User user = userRepository.findByEmail(normalized).orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            normalized + " has no account yet — they must sign in once before they can be given a role"));

        StoreMembership existing = membershipRepository.findByUserAndTenant(user, tenant).orElse(null);
        StoreMembership.Role was = existing == null ? null : existing.getRole();
        if (was == target) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                normalized + " is already " + target + " of this store");
        }
        // Demoting the last owner leaves a shop nobody can configure.
        if (was == StoreMembership.Role.OWNER && ownerCount(tenant) <= 1) {
            throw bad("This is the store's only owner — give someone else OWNER before changing this one");
        }

        return new Assignment(assign(user, tenant, target), was, normalized);
    }

    /** Take away a store role. Shopping history is untouched. */
    public StoreMembership.Role removeStaff(Tenant tenant, String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null) throw bad("An email address is required");

        User user = userRepository.findByEmail(normalized).orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, normalized + " has no account"));

        StoreMembership existing = membershipRepository.findByUserAndTenant(user, tenant)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                normalized + " holds no role in this store"));
        if (!STAFF.contains(existing.getRole())) {
            throw bad(normalized + " is a customer of this store, not staff — there is no role to remove");
        }
        if (existing.getRole() == StoreMembership.Role.OWNER && ownerCount(tenant) <= 1) {
            throw bad("This is the store's only owner — a store cannot be left with nobody who can run it");
        }

        StoreMembership.Role was = existing.getRole();
        remove(user, tenant);
        return was;
    }

    /** What an assignment did, for the caller's audit line. */
    public record Assignment(StoreMembership membership, StoreMembership.Role previousRole, String email) {}

    public static String normalizeEmail(String email) {
        if (email == null) return null;
        String s = email.trim().toLowerCase();
        return s.isEmpty() ? null : s;
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    /** How many people currently hold OWNER of this store. */
    @Transactional(readOnly = true)
    public long ownerCount(Tenant tenant) {
        if (tenant == null) return 0;
        return membershipRepository
            .findByTenantAndRoleIn(tenant, java.util.List.of(StoreMembership.Role.OWNER))
            .size();
    }

    private static int rank(StoreMembership.Role r) {
        return switch (r) {
            case OWNER -> 2;
            case MANAGER -> 1;
            case CUSTOMER -> 0;
        };
    }

    /** True when this account is the OWNER of the given store. */
    @Transactional(readOnly = true)
    public boolean isOwner(User user, Tenant tenant) {
        if (user == null || tenant == null) return false;
        return membershipRepository.findByUserAndTenant(user, tenant)
            .map(m -> m.getRole() == StoreMembership.Role.OWNER)
            .orElse(false);
    }

    /**
     * True when this account may run the store day-to-day: OWNER or MANAGER
     * (decision D5). MANAGER covers products, orders and statistics; store
     * settings, users and integrations stay OWNER-only via {@link #isOwner}.
     */
    @Transactional(readOnly = true)
    public boolean canManage(User user, Tenant tenant) {
        if (user == null || tenant == null) return false;
        return membershipRepository.findByUserAndTenant(user, tenant)
            .map(m -> m.getRole() == StoreMembership.Role.OWNER
                || m.getRole() == StoreMembership.Role.MANAGER)
            .orElse(false);
    }
}
