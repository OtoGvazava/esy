package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.PlatformAdminRepository;
import com.esyback.ecommerce.repository.RoleRepository;
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

    public User findOrCreateUser(String oauthProvider, String oauthProviderId, String email,
                                 String firstName, String lastName, String profileImageUrl) {

        User user = userRepository.findByOauthProviderAndOauthProviderId(oauthProvider, oauthProviderId)
            .or(() -> userRepository.findByEmail(email))
            .map(existing -> {
                existing.setOauthProvider(oauthProvider);
                existing.setOauthProviderId(oauthProviderId);
                if (profileImageUrl != null) existing.setProfileImageUrl(profileImageUrl);
                return userRepository.save(existing);
            })
            .orElseGet(() -> {
                User u = new User();
                u.setUsername(email); // email is the stable global handle
                u.setEmail(email);
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

        // Reconcile ADMIN against the allowlist on every sign-in. This is the
        // only place the role is assigned or removed.
        syncAdminRole(user);

        // Signing in on an actual storefront makes you a CUSTOMER of it.
        if (!tenantContextService.isPlatformHost()) {
            Tenant tenant = tenantContextService.getCurrentTenant();
            if (user.getTenant() == null) user.setTenant(tenant); // home pointer
            membershipService.ensure(user, tenant, StoreMembership.Role.CUSTOMER);
        }
        return user;
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
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
        String raw = configStore.get("app.admin-emails", "");
        if (raw == null || raw.isBlank()) return java.util.Set.of();
        return java.util.Arrays.stream(raw.split(","))
            .map(s -> s.trim().toLowerCase())
            .filter(s -> !s.isEmpty())
            .collect(java.util.stream.Collectors.toSet());
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
        User user = userRepository.findByEmail(email.trim().toLowerCase()).orElse(null);
        if (user == null) return false;
        Role adminRole = user.getRoles().stream()
            .filter(r -> "ADMIN".equals(r.getName())).findFirst().orElse(null);
        if (adminRole == null) return false;
        user.removeRole(adminRole);
        userRepository.save(user);
        return true;
    }

}
