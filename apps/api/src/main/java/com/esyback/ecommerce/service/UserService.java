package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.PlatformAdminRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * One global account per identity. email/username are globally unique, so
 * lookups are global (the old tenant-scoped variants were effectively buggy
 * for multi-tenant). Store relationships live in StoreMembership: signing in
 * on a storefront records a CUSTOMER membership; creating a store records an
 * OWNER one (see TenantController).
 */
@Service
@Transactional
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TenantContextService tenantContextService;
    private final MembershipService membershipService;
    private final ConfigStore configStore;
    private final PlatformAdminRepository platformAdminRepository;
    private final TenantRepository tenantRepository;

    /**
     * A sign-in the account rules refuse. The success handler turns it into the
     * same "sign-in failed" page an OAuth error lands on, with no session.
     */
    public static class SignInRefused extends RuntimeException {
        public SignInRefused(String message) {
            super(message);
        }
    }

    /**
     * The account for a completed OAuth sign-in.
     *
     * <p><b>The identity is (provider, subject)</b>, not the email address. An
     * address can be reassigned or lapse and be registered again by someone
     * else, so the email only links a sign-in to an existing account when the
     * provider vouches for it ({@code email_verified}) and the account has no
     * provider identity yet. An account already bound to a different identity
     * is never re-bound: that sign-in is refused, rather than silently handing
     * the account to whoever now holds the address.
     *
     * @param emailVerified the provider's {@code email_verified} claim; null
     *                      when it sent none
     * @param storeSubdomain the store the sign-in started on (the funnel's
     *                       {@code tenant_origin}), or null; the callback itself
     *                       always runs on the platform host
     * @throws SignInRefused when the account rules refuse the sign-in
     */
    public User findOrCreateUser(String oauthProvider, String oauthProviderId, String email,
                                 Boolean emailVerified, String firstName, String lastName,
                                 String profileImageUrl, String storeSubdomain) {
        if (oauthProviderId == null || oauthProviderId.isBlank()) {
            throw new SignInRefused("The provider sent no account identifier");
        }

        User user = userRepository.findByOauthProviderAndOauthProviderId(oauthProvider, oauthProviderId)
            .map(existing -> {
                if (profileImageUrl != null) existing.setProfileImageUrl(profileImageUrl);
                return userRepository.save(existing);
            })
            .or(() -> email == null || email.isBlank() ? Optional.empty()
                : userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(email.trim())
                    .map(existing -> {
                        if (existing.getOauthProviderId() != null && !existing.getOauthProviderId().isBlank()) {
                            throw new SignInRefused("That address belongs to an account bound to another sign-in");
                        }
                        if (!Boolean.TRUE.equals(emailVerified)) {
                            throw new SignInRefused("An unverified address cannot be linked to an existing account");
                        }
                        existing.setOauthProvider(oauthProvider);
                        existing.setOauthProviderId(oauthProviderId);
                        if (profileImageUrl != null) existing.setProfileImageUrl(profileImageUrl);
                        return userRepository.save(existing);
                    }))
            .orElseGet(() -> {
                if (email == null || email.isBlank()) {
                    throw new SignInRefused("The provider sent no email address");
                }
                if (Boolean.FALSE.equals(emailVerified)) {
                    // Creating it would let an unverified sign-in claim the
                    // address before its real owner ever arrives.
                    throw new SignInRefused("The provider has not verified this email address");
                }
                User u = new User();
                // Stored lowercased, so every exact-match lookup elsewhere
                // (team, invitations, admin checks) agrees with this row.
                String stored = email == null ? null : email.trim().toLowerCase();
                u.setUsername(stored); // email is the stable global handle
                u.setEmail(stored);
                u.setFirstName(firstName);
                u.setLastName(lastName);
                u.setProfileImageUrl(profileImageUrl);
                u.setOauthProvider(oauthProvider);
                u.setOauthProviderId(oauthProviderId);
                u.setIsActive(true);
                Role userRole = roleRepository.findByName("USER")
                    .orElseGet(() -> {
                        Role role = new Role();
                        role.setName("USER");
                        role.setDescription("Regular user role");
                        return roleRepository.save(role);
                    });
                u.addRole(userRole);
                return userRepository.save(u);
            });

        // A deactivated account does not get a new session. (The JWT filter
        // refuses the sessions it already has.)
        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new SignInRefused("This account is deactivated");
        }

        // Reconcile ADMIN against the allowlist on every sign-in. This is the
        // only place the role is assigned or removed.
        syncAdminRole(user);

        // Signing in on an actual storefront makes you a CUSTOMER of it. The
        // callback runs on the platform host, so the store is the one the
        // sign-in started on; a callback served on the store's own host (no
        // funnel) still counts.
        Tenant store = storeSubdomain == null ? null
            : tenantRepository.findBySubdomain(storeSubdomain.toLowerCase()).orElse(null);
        if (store == null && !tenantContextService.isPlatformHost()) {
            store = tenantContextService.getCurrentTenant();
        }
        if (store != null) {
            if (user.getTenant() == null) user.setTenant(store); // home pointer
            membershipService.ensure(user, store, StoreMembership.Role.CUSTOMER);
        }
        return user;
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /** Case-insensitive: stored addresses keep whatever case they were created with. */
    public Optional<User> findByEmail(String email) {
        if (email == null) return Optional.empty();
        return userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(email.trim());
    }

    /**
     * Locks the account's row until the caller's transaction ends, so writes
     * that read-then-change something one per account (the default address)
     * cannot interleave. Must be called inside the caller's transaction.
     */
    public void lockForUpdate(User user) {
        userRepository.lockById(user.getId());
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    /**
     * Reconcile the ADMIN role against the effective allowlist — the union of
     * {@code app.admin-emails} (env, overridable live via the config store) and
     * the {@code platform_admins} table written by the admin UI.
     *
     * <p>It syncs in BOTH directions, which the grant-only version it replaced
     * did not: an address that has left the allowlist has the role stripped.
     * Without that, removing someone was purely cosmetic — the admins screen
     * would show them gone while ADMIN stayed in {@code users_roles} forever,
     * and they kept every platform power on their next sign-in.
     *
     * <p>Reconciling here means a change lands at the target's next sign-in;
     * revocation additionally strips the role immediately (AdminService), so an
     * admin removed mid-session does not keep access until they log out.
     *
     * <p>An empty allowlist therefore means no admins at all, by definition.
     * That is not a lockout hazard because the env half cannot be emptied
     * through the UI — DELETE refuses env-sourced entries — so the deployment's
     * ADMIN_EMAILS is always a floor you can return to.
     */
    private void syncAdminRole(User user) {
        if (user == null || user.getEmail() == null) return;
        String email = user.getEmail().trim().toLowerCase();

        boolean allowed = allowlistedEmails().contains(email)
            || platformAdminRepository.existsByEmailIgnoreCase(email);

        Role adminRole = user.getRoles().stream()
            .filter(r -> "ADMIN".equals(r.getName())).findFirst().orElse(null);

        if (allowed && adminRole == null) {
            user.addRole(adminRole());
            userRepository.save(user);
        } else if (!allowed && adminRole != null) {
            user.removeRole(adminRole);
            userRepository.save(user);
        }
    }

    /** The env/config half of the allowlist, trimmed + lowercased. */
    private java.util.Set<String> allowlistedEmails() {
        return com.esyback.ecommerce.web.AdminEmails.parse(
            configStore.get(com.esyback.ecommerce.web.AdminEmails.KEY, ""));
    }

    private Role adminRole() {
        return roleRepository.findByName("ADMIN")
            .orElseGet(() -> {
                Role role = new Role();
                role.setName("ADMIN");
                role.setDescription("Administrator role");
                return roleRepository.save(role);
            });
    }

    /**
     * Strip ADMIN from an account now rather than at its next sign-in. Returns
     * false when the address has no account yet — a grant recorded for someone
     * who has never signed in is still valid and applies when they do.
     */
    public boolean revokeAdminRole(String email) {
        if (email == null) return false;
        // Case-insensitive: an account created as "Ann@Example.com" must lose
        // the role when "ann@example.com" is revoked. An exact match used to
        // report success and leave ADMIN in place until the next sign-in.
        boolean stripped = false;
        for (User user : userRepository.findAllByEmailIgnoreCase(email.trim())) {
            Role adminRole = user.getRoles().stream()
                .filter(r -> "ADMIN".equals(r.getName())).findFirst().orElse(null);
            if (adminRole == null) continue;
            user.removeRole(adminRole);
            userRepository.save(user);
            stripped = true;
        }
        return stripped;
    }

}
