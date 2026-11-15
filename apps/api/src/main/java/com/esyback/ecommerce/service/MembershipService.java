package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.StoreMembershipRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.web.ApiRefusal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
public class MembershipService {

    private final StoreMembershipRepository membershipRepository;
    // A repository rather than UserService: UserService already depends on this
    // class, and going back through it would close the cycle.
    private final UserRepository userRepository;
    private final com.esyback.ecommerce.repository.StoreInvitationRepository invitationRepository;

    /** The roles that mean "runs this shop", as opposed to "shops here". */
    public static final List<StoreMembership.Role> STAFF =
        List.of(StoreMembership.Role.OWNER, StoreMembership.Role.MANAGER);

    // Which staff rule a refusal hit, beside its English sentence, so the
    // Team screen can say it in Georgian (ApiRefusal). The admin screen,
    // which shares these rules, still reads the sentence.
    public static final String TEAM_BAD_EMAIL = "TEAM_BAD_EMAIL";
    public static final String TEAM_BAD_ROLE = "TEAM_BAD_ROLE";
    public static final String TEAM_NO_ACCOUNT = "TEAM_NO_ACCOUNT";
    public static final String TEAM_ALREADY = "TEAM_ALREADY";
    public static final String TEAM_LAST_OWNER = "TEAM_LAST_OWNER";
    public static final String TEAM_NOT_STAFF = "TEAM_NOT_STAFF";
    public static final String INVITE_GONE = "INVITE_GONE";

    /** How long an invitation stays open. */
    public static final java.time.Duration INVITE_TTL = java.time.Duration.ofDays(14);

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
        String normalized = validEmail(email);
        StoreMembership.Role target = staffRole(roleName);

        // Identities come from Google, so a row invented for an address nobody
        // has signed in with would never match the person who eventually does.
        User user = userRepository.findByEmail(normalized).orElseThrow(() -> new ApiRefusal(
            HttpStatus.NOT_FOUND, TEAM_NO_ACCOUNT,
            normalized + " has no account yet — they must sign in once before they can be given a role",
            Map.of("email", normalized)));

        StoreMembership existing = membershipRepository.findByUserAndTenant(user, tenant).orElse(null);
        StoreMembership.Role was = existing == null ? null : existing.getRole();
        if (was == target) {
            throw new ApiRefusal(HttpStatus.CONFLICT, TEAM_ALREADY,
                normalized + " is already " + target + " of this store",
                Map.of("email", normalized, "role", target.name()));
        }
        // Demoting the last owner leaves a shop nobody can configure.
        if (was == StoreMembership.Role.OWNER && lockedOwnerCount(tenant) <= 1) {
            throw bad(TEAM_LAST_OWNER,
                "This is the store's only owner — give someone else OWNER before changing this one", Map.of());
        }

        return new Assignment(assign(user, tenant, target), was, normalized);
    }

    /** Take away a store role. Shopping history is untouched. */
    public StoreMembership.Role removeStaff(Tenant tenant, String email) {
        return removeStaff(tenant, email, false);
    }

    /**
     * @param quiet an owner's removal: an address with no account answers
     *              like one that is simply not on the team, so removal cannot
     *              be used to learn which addresses have accounts. The admin
     *              screen keeps the more precise answer.
     */
    private StoreMembership.Role removeStaff(Tenant tenant, String email, boolean quiet) {
        String normalized = normalizeEmail(email);
        if (normalized == null) throw bad(TEAM_BAD_EMAIL, "An email address is required", Map.of());

        User user = userRepository.findByEmail(normalized).orElseThrow(() -> quiet
            ? new ApiRefusal(HttpStatus.NOT_FOUND, TEAM_NOT_STAFF,
                normalized + " holds no role in this store", Map.of("email", normalized))
            : new ApiRefusal(HttpStatus.NOT_FOUND, TEAM_NO_ACCOUNT,
                normalized + " has no account", Map.of("email", normalized)));

        StoreMembership existing = membershipRepository.findByUserAndTenant(user, tenant)
            .orElseThrow(() -> new ApiRefusal(HttpStatus.NOT_FOUND, TEAM_NOT_STAFF,
                normalized + " holds no role in this store", Map.of("email", normalized)));
        if (!STAFF.contains(existing.getRole())) {
            throw bad(TEAM_NOT_STAFF,
                normalized + " is a customer of this store, not staff — there is no role to remove",
                Map.of("email", normalized));
        }
        if (existing.getRole() == StoreMembership.Role.OWNER && lockedOwnerCount(tenant) <= 1) {
            throw bad(TEAM_LAST_OWNER,
                "This is the store's only owner — a store cannot be left with nobody who can run it", Map.of());
        }

        StoreMembership.Role was = existing.getRole();
        remove(user, tenant);
        // Someone taken off the team must not walk back in through an offer
        // still open from before.
        invitationRepository.findByTenantAndEmail(tenant, normalized).ifPresent(invitationRepository::delete);
        return was;
    }

    // ─── Invitations (review M36) ───────────────────────────────────────────
    // What a store OWNER does from the Team screen. A role is offered, never
    // imposed: nothing is granted until the person, signed in with that very
    // address, accepts. And nothing is learned about the address: the answer
    // is the same whether it has an account or not, and no name is shown
    // until it accepts. (Platform admins still assign directly, with an audit
    // row, through assignStaff.)

    /** What an owner's "give a role" did. */
    public enum InviteOutcome { INVITED, CHANGED }

    /**
     * Offer {@code roleName} at this store to {@code email}. Lowering an
     * existing owner to manager is not an offer, it takes effect at once
     * (CHANGED), within the last-owner rule; any role the person does not
     * already hold is an invitation (INVITED), replacing an earlier one.
     */
    public InviteOutcome invite(Tenant tenant, String email, String roleName, String invitedBy) {
        String normalized = validEmail(email);
        StoreMembership.Role target = staffRole(roleName);

        // Someone already on this store's team: their role is on the owner's
        // own list, so saying so reveals nothing new.
        StoreMembership current = userRepository.findByEmail(normalized)
            .flatMap(u -> membershipRepository.findByUserAndTenant(u, tenant))
            .filter(m -> STAFF.contains(m.getRole()))
            .orElse(null);
        if (current != null) {
            if (current.getRole() == target) {
                throw new ApiRefusal(HttpStatus.CONFLICT, TEAM_ALREADY,
                    normalized + " is already " + target + " of this store",
                    Map.of("email", normalized, "role", target.name()));
            }
            if (target == StoreMembership.Role.MANAGER) {
                if (lockedOwnerCount(tenant) <= 1) {
                    throw bad(TEAM_LAST_OWNER,
                        "This is the store's only owner — give someone else OWNER before changing this one", Map.of());
                }
                current.setRole(target);
                membershipRepository.save(current);
                invitationRepository.findByTenantAndEmail(tenant, normalized).ifPresent(invitationRepository::delete);
                return InviteOutcome.CHANGED;
            }
        }

        com.esyback.ecommerce.entity.StoreInvitation inv = invitationRepository
            .findByTenantAndEmail(tenant, normalized)
            .orElseGet(com.esyback.ecommerce.entity.StoreInvitation::new);
        inv.setTenant(tenant);
        inv.setEmail(normalized);
        inv.setRole(target.name());
        inv.setInvitedBy(normalizeEmail(invitedBy));
        inv.setCreatedAt(java.time.Instant.now());
        invitationRepository.save(inv);
        return InviteOutcome.INVITED;
    }

    /** The store's open invitations, oldest first. */
    @Transactional(readOnly = true)
    public List<com.esyback.ecommerce.entity.StoreInvitation> invitationsOf(Tenant tenant) {
        return invitationRepository.findByTenantAndCreatedAtAfterOrderByCreatedAtAsc(tenant, openSince());
    }

    /** Withdraw an invitation. True when there was one. */
    public boolean cancelInvitation(Tenant tenant, String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null) return false;
        return invitationRepository.findByTenantAndEmail(tenant, normalized).map(inv -> {
            invitationRepository.delete(inv);
            return true;
        }).orElse(false);
    }

    /** The open invitations addressed to this account's sign-in email. */
    @Transactional(readOnly = true)
    public List<com.esyback.ecommerce.entity.StoreInvitation> invitationsFor(User user) {
        String email = user == null ? null : normalizeEmail(user.getEmail());
        if (email == null) return List.of();
        return invitationRepository.findOpenFor(email, openSince());
    }

    /**
     * Accept: the role is granted now, to this account. Only an invitation
     * addressed to the account's own email can be accepted; anything else is
     * the same "no such invitation", so ids cannot be probed. An owner
     * accepting a manager invitation keeps owning.
     */
    public StoreMembership acceptInvitation(User user, Long invitationId) {
        com.esyback.ecommerce.entity.StoreInvitation inv = mine(user, invitationId);
        // An offer is only as good as the owner who made it: one sent by an
        // owner since removed or moved down must not hand out their power.
        boolean inviterStillOwns = inv.getInvitedBy() != null && userRepository.findByEmail(inv.getInvitedBy())
            .flatMap(u -> membershipRepository.findByUserAndTenant(u, inv.getTenant()))
            .map(m -> m.getRole() == StoreMembership.Role.OWNER)
            .orElse(false);
        if (!inviterStillOwns) {
            invitationRepository.delete(inv);
            throw new ApiRefusal(HttpStatus.NOT_FOUND, INVITE_GONE, "This invitation is no longer open", Map.of());
        }
        StoreMembership.Role offered = inv.roleValue();
        StoreMembership m = membershipRepository.findByUserAndTenant(user, inv.getTenant())
            .filter(existing -> rank(existing.getRole()) >= rank(offered))
            .orElseGet(() -> assign(user, inv.getTenant(), offered));
        invitationRepository.delete(inv);
        return m;
    }

    /** Decline: the invitation goes, nothing is granted. */
    public void declineInvitation(User user, Long invitationId) {
        invitationRepository.delete(mine(user, invitationId));
    }

    private com.esyback.ecommerce.entity.StoreInvitation mine(User user, Long id) {
        String email = user == null ? null : normalizeEmail(user.getEmail());
        return (id == null || email == null ? java.util.Optional.<com.esyback.ecommerce.entity.StoreInvitation>empty()
                : invitationRepository.findById(id))
            .filter(i -> email.equals(i.getEmail()))
            .filter(i -> i.getCreatedAt() != null && i.getCreatedAt().isAfter(openSince()))
            .orElseThrow(() -> new ApiRefusal(HttpStatus.NOT_FOUND, INVITE_GONE,
                "This invitation is no longer open", Map.of()));
    }

    private static java.time.Instant openSince() {
        return java.time.Instant.now().minus(INVITE_TTL);
    }

    private static String validEmail(String email) {
        String normalized = normalizeEmail(email);
        if (normalized == null || !normalized.contains("@")) {
            throw bad(TEAM_BAD_EMAIL, "A valid email address is required", Map.of());
        }
        return normalized;
    }

    /** Clears invitations past their time; nothing reads them, they only pile up. */
    @org.springframework.scheduling.annotation.Scheduled(initialDelayString = "PT10M", fixedDelayString = "PT6H")
    public void purgeExpiredInvitations() {
        invitationRepository.deleteByCreatedAtBefore(openSince());
    }

    private static StoreMembership.Role staffRole(String roleName) {
        StoreMembership.Role target;
        try {
            target = StoreMembership.Role.valueOf(String.valueOf(roleName).trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw bad(TEAM_BAD_ROLE, "Role must be OWNER or MANAGER", Map.of());
        }
        if (!STAFF.contains(target)) {
            throw bad(TEAM_BAD_ROLE,
                "Role must be OWNER or MANAGER — CUSTOMER is recorded automatically, not granted", Map.of());
        }
        return target;
    }

    /** An owner taking someone off the team (see {@link #removeStaff(Tenant, String, boolean)}). */
    public StoreMembership.Role removeStaffQuietly(Tenant tenant, String email) {
        return removeStaff(tenant, email, true);
    }

    /** What an assignment did, for the caller's audit line. */
    public record Assignment(StoreMembership membership, StoreMembership.Role previousRole, String email) {}

    public static String normalizeEmail(String email) {
        if (email == null) return null;
        String s = email.trim().toLowerCase();
        return s.isEmpty() ? null : s;
    }

    private static ResponseStatusException bad(String code, String message, Map<String, Object> details) {
        return new ApiRefusal(HttpStatus.BAD_REQUEST, code, message, details);
    }

    /** How many people currently hold OWNER of this store. */
    @Transactional(readOnly = true)
    public long ownerCount(Tenant tenant) {
        if (tenant == null) return 0;
        return membershipRepository
            .findByTenantAndRoleIn(tenant, java.util.List.of(StoreMembership.Role.OWNER))
            .size();
    }

    /**
     * {@link #ownerCount}, for the last-owner rule: the owner rows are locked
     * until the change commits, so two owners demoting or removing each other
     * at once cannot both see "there is another owner" and leave none.
     */
    private long lockedOwnerCount(Tenant tenant) {
        if (tenant == null) return 0;
        return membershipRepository.lockByTenantAndRole(tenant, StoreMembership.Role.OWNER).size();
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
