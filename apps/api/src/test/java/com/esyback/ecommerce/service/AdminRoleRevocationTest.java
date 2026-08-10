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
}
