package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
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

    public void assignAdminRole(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            Role adminRole = roleRepository.findByName("ADMIN")
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setName("ADMIN");
                    role.setDescription("Administrator role");
                    return roleRepository.save(role);
                });
            user.addRole(adminRole);
            userRepository.save(user);
        }
    }
}
