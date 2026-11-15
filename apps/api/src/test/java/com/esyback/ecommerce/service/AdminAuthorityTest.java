package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.PlatformAdminRepository;
import com.esyback.ecommerce.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * ADMIN is honoured per request only while the address is still allowlisted
 * (review M25), so taking someone out of ADMIN_EMAILS ends a live session's
 * admin power at once instead of at their next sign-in.
 */
class AdminAuthorityTest {

    private final UserRepository users = mock(UserRepository.class);
    private final PlatformAdminRepository admins = mock(PlatformAdminRepository.class);
    private final ConfigStore config = mock(ConfigStore.class);
    private final CustomUserDetailsService service = new CustomUserDetailsService(users, admins, config);

    private void account(String email) {
        User u = new User();
        u.setUsername("u-" + email);
        u.setEmail(email);
        u.setIsActive(true);
        long id = 1;
        for (String name : new String[] {"USER", "ADMIN"}) {
            Role r = new Role();
            r.setId(id++); // Role is id-identified: two unsaved roles would collapse in the Set
            r.setName(name);
            u.addRole(r);
        }
        when(users.findByUsernameWithRoles("u-" + email)).thenReturn(Optional.of(u));
    }

    private Set<String> roles(String email) {
        return service.loadUserByUsername("u-" + email).getAuthorities().stream()
            .map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
    }

    @Test
    @DisplayName("an address still in ADMIN_EMAILS keeps ROLE_ADMIN")
    void listedKeepsAdmin() {
        when(config.get(eq("app.admin-emails"), anyString())).thenReturn("boss@esy.ge, other@esy.ge");
        account("Boss@esy.ge");
        assertThat(roles("Boss@esy.ge")).contains("ROLE_ADMIN", "ROLE_USER");
    }

    @Test
    @DisplayName("an address taken out of the list loses ROLE_ADMIN on its next request")
    void removedLosesAdmin() {
        when(config.get(eq("app.admin-emails"), anyString())).thenReturn("other@esy.ge");
        account("gone@esy.ge");
        assertThat(roles("gone@esy.ge")).containsExactly("ROLE_USER");
    }

    @Test
    @DisplayName("a runtime grant (platform_admins) counts as allowlisted")
    void runtimeGrantKeepsAdmin() {
        when(config.get(eq("app.admin-emails"), anyString())).thenReturn("");
        when(admins.existsByEmailIgnoreCase("granted@esy.ge")).thenReturn(true);
        account("granted@esy.ge");
        assertThat(roles("granted@esy.ge")).contains("ROLE_ADMIN");
    }
}
