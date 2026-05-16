package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TenantContextService tenantContextService;
    
    public User findOrCreateUser(String oauthProvider, String oauthProviderId, String email, 
                                 String firstName, String lastName, String profileImageUrl) {
        
        Tenant currentTenant = tenantContextService.getCurrentTenant();
        
        // Try to find existing user by OAuth provider and ID within tenant
        Optional<User> existingUser = userRepository.findByOauthProviderAndOauthProviderIdAndTenant(oauthProvider, oauthProviderId, currentTenant);
        if (existingUser.isPresent()) {
            return existingUser.get();
        }
        
        // Try to find existing user by email within tenant
        Optional<User> userByEmail = userRepository.findByEmailAndTenant(email, currentTenant);
        if (userByEmail.isPresent()) {
            User user = userByEmail.get();
            // Update OAuth information for existing user
            user.setOauthProvider(oauthProvider);
            user.setOauthProviderId(oauthProviderId);
            user.setProfileImageUrl(profileImageUrl);
            return userRepository.save(user);
        }
        
        // Create new user
        User newUser = new User();
        newUser.setUsername(email); // Use email as username initially
        newUser.setEmail(email);
        newUser.setFirstName(firstName);
        newUser.setLastName(lastName);
        newUser.setProfileImageUrl(profileImageUrl);
        newUser.setOauthProvider(oauthProvider);
        newUser.setOauthProviderId(oauthProviderId);
        newUser.setIsActive(true);
        newUser.setTenant(currentTenant);
        
        // Assign default role (USER)
        Role userRole = roleRepository.findByName("USER")
            .orElseGet(() -> {
                Role role = new Role();
                role.setName("USER");
                role.setDescription("Regular user role");
                return roleRepository.save(role);
            });
        newUser.addRole(userRole);
        
        return userRepository.save(newUser);
    }
    
    public Optional<User> findByUsername(String username) {
        Tenant currentTenant = tenantContextService.getCurrentTenant();
        return userRepository.findByUsernameAndTenant(username, currentTenant);
    }
    
    public Optional<User> findByEmail(String email) {
        Tenant currentTenant = tenantContextService.getCurrentTenant();
        return userRepository.findByEmailAndTenant(email, currentTenant);
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
