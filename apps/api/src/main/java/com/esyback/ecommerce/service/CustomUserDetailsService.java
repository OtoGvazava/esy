package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.PlatformAdminRepository;
import com.esyback.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PlatformAdminRepository platformAdminRepository;
    private final ConfigStore configStore;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Global lookup — one account per username across all stores.
        User user = userRepository.findByUsernameWithRoles(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return org.springframework.security.core.userdetails.User.builder()
            .username(user.getUsername())
            .password("") // OAuth users don't have passwords
            .authorities(getAuthorities(user))
            .accountExpired(false)
            // Only an explicit false deactivates: a legacy NULL row is a live
            // account (it used to throw here instead). JwtAuthenticationFilter
            // refuses a session for a disabled or locked account.
            .accountLocked(Boolean.FALSE.equals(user.getIsActive()))
            .credentialsExpired(false)
            .disabled(Boolean.FALSE.equals(user.getIsActive()))
            .build();
    }

    private Collection<? extends GrantedAuthority> getAuthorities(User user) {
        return user.getRoles().stream()
            .map(Role::getName)
            // ADMIN is honoured only while the address is still on the
            // effective allowlist. The stored role is reconciled at sign-in,
            // but sessions are long-lived: an address taken out of
            // ADMIN_EMAILS used to keep every platform power until it next
            // signed in (review M25). Checked per request, it ends at once.
            .filter(name -> !"ADMIN".equals(name) || stillAllowlisted(user.getEmail()))
            .map(name -> new SimpleGrantedAuthority("ROLE_" + name))
            .collect(Collectors.toList());
    }

    private boolean stillAllowlisted(String email) {
        if (email == null || email.isBlank()) return false;
        String normalized = email.trim().toLowerCase();
        // The env list first: it is cached config, so the database is only
        // asked about runtime grants.
        return com.esyback.ecommerce.web.AdminEmails.parse(
                configStore.get(com.esyback.ecommerce.web.AdminEmails.KEY, "")).contains(normalized)
            || platformAdminRepository.existsByEmailIgnoreCase(normalized);
    }
}
