package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.PlatformAdmin;
import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.PlatformAdminRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The ADMIN axis is the one permission in the system with no store scope behind
 * it — a platform admin sees every merchant's revenue — so the grant and the
 * revoke both need to be real, not merely recorded.
 *
 * <p>These tests exist because the original implementation only ever ADDED the
 * role. Removing an address from the allowlist left ROLE_ADMIN in user_roles
 * forever, so the admins screen showed a person as removed while the API went
 * on treating them as an administrator. That failure was invisible to every
 * other check in the build: it compiles, it boots, and the UI looks right.
 */
@SpringBootTest
class AdminRoleRevocationTest {

    @Autowired UserService userService;
    @Autowired AdminService adminService;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired PlatformAdminRepository platformAdminRepository;

    private static final String TARGET = "revoke-me@example.com";
    private static final String ACTOR = "actor@example.com";

    @BeforeEach
    void clean() {
        platformAdminRepository.deleteAll();
        userRepository.findByEmail(TARGET).ifPresent(userRepository::delete);
    }

    private User userWithAdminRole() {
        Role admin = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ADMIN");
            r.setDescription("Administrator role");
            return roleRepository.save(r);
        });
        User u = new User();
        u.setEmail(TARGET);
        u.setUsername(TARGET);
        u.setIsActive(true);
        u.addRole(admin);
        return userRepository.save(u);
    }

    private boolean hasAdminRole(String email) {
        return userRepository.findByEmail(email)
            .map(u -> u.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName())))
            .orElse(false);
    }

    @Test
    @Transactional
    void revokingAnAdminStripsTheRoleAndNotJustTheGrantRow() {
        userWithAdminRole();
        adminService.grantAdmin(TARGET, ACTOR);
        assertThat(hasAdminRole(TARGET)).isTrue();

        adminService.revokeAdmin(TARGET, ACTOR);

        // Both halves matter. The row going away is what the screen renders;
        // the role going away is what actually ends their access.
        assertThat(platformAdminRepository.existsByEmailIgnoreCase(TARGET)).isFalse();
        assertThat(hasAdminRole(TARGET))
            .as("ROLE_ADMIN must be gone, not merely unrecorded")
            .isFalse();
    }

    @Test
    @Transactional
    void revokingSomeoneWhoNeverSignedInDoesNotFail() {
        // A grant may be recorded for an address with no account yet; revoking
        // it must delete the row rather than blow up looking for a user.
        adminService.grantAdmin(TARGET, ACTOR);
        adminService.revokeAdmin(TARGET, ACTOR);
        assertThat(platformAdminRepository.existsByEmailIgnoreCase(TARGET)).isFalse();
    }

    @Test
    @Transactional
    void grantIsCaseInsensitiveSoOneAddressCannotBecomeTwoAdmins() {
        adminService.grantAdmin("Mixed.Case@Example.com", ACTOR);
        assertThatThrownBy(() -> adminService.grantAdmin("mixed.case@example.com", ACTOR))
            .hasMessageContaining("already an admin");
        assertThat(platformAdminRepository.findAllByOrderByEmailAsc()).hasSize(1);
        platformAdminRepository.deleteAll();
    }

    @Test
    @Transactional
    void adminsListReportsBothSourcesAndTheDbGrantIsRevocable() {
        adminService.grantAdmin(TARGET, ACTOR);
        var rows = adminService.admins();
        var row = rows.stream()
            .filter(m -> TARGET.equals(m.get("email")))
            .findFirst().orElseThrow();
        assertThat(row.get("source")).isEqualTo("db");
        assertThat(row.get("grantedBy")).isEqualTo(ACTOR);
        assertThat(row.get("grantedAt")).isNotNull();
    }

    @Test
    @Transactional
    void aPlatformAdminRowIsNormalisedOnTheWayIn() {
        platformAdminRepository.save(PlatformAdmin.of("  UPPER@Example.COM ", ACTOR));
        assertThat(platformAdminRepository.existsByEmailIgnoreCase("upper@example.com")).isTrue();
    }

    @Test
    @Transactional
    void revokingStripsTheRoleFromAnAccountStoredInMixedCase() {
        // Older accounts kept Google's spelling of the address; the revoke is
        // always for the lowercased form.
        User u = userWithAdminRole();
        u.setEmail("Revoke-Me@Example.com");
        userRepository.save(u);
        adminService.grantAdmin(TARGET, ACTOR);

        adminService.revokeAdmin(TARGET, ACTOR);

        assertThat(userRepository.findById(u.getId()).orElseThrow().getRoles())
            .noneMatch(r -> "ADMIN".equals(r.getName()));
        assertThat(userService.findByEmail(TARGET)).map(User::getId).contains(u.getId());
    }

    @Test
    void aGrantThatLosesTheRaceIsAConflictNotAServerError() {
        // Two admins granting the same address at once: both pass the exists
        // check, and the second insert meets the unique index.
        PlatformAdminRepository admins = org.mockito.Mockito.mock(PlatformAdminRepository.class);
        ConfigStore config = org.mockito.Mockito.mock(ConfigStore.class);
        org.mockito.Mockito.when(config.get(org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyString())).thenReturn("");
        org.mockito.Mockito.when(admins.saveAndFlush(org.mockito.ArgumentMatchers.any()))
            .thenThrow(new org.springframework.dao.DataIntegrityViolationException("platform_admins_email_key"));
        AdminService service = new AdminService(null, null, null,
            org.mockito.Mockito.mock(com.esyback.ecommerce.repository.AuditLogRepository.class),
            admins, null, null, null, config, null);

        assertThatThrownBy(() -> service.grantAdmin("race@example.com", ACTOR))
            .isInstanceOfSatisfying(org.springframework.web.server.ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(409));
    }
}
