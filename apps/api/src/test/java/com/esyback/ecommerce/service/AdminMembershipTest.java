package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.StoreMembershipRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Granting a store membership is the sanctioned replacement for the "platform
 * ADMIN can do anything" shortcut that was removed. The rules worth pinning
 * down are the ones that keep a shop reachable: a store must never be left
 * without an owner, and an admin's deliberate demotion must actually demote —
 * unlike {@code MembershipService.ensure}, which refuses to lower a role on
 * purpose so that shopping at a store you manage cannot cost you your rights.
 */
@SpringBootTest
class AdminMembershipTest {

    @Autowired AdminService adminService;
    @Autowired TenantRepository tenantRepository;
    @Autowired UserRepository userRepository;
    @Autowired StoreMembershipRepository membershipRepository;

    private static final String SUB = "membership-test-store";
    private static final String OWNER = "owner-mt@example.com";
    private static final String SECOND = "second-mt@example.com";
    private static final String ACTOR = "actor-mt@example.com";

    private Tenant tenant;

    @BeforeEach
    void setUp() {
        tenantRepository.findBySubdomain(SUB).ifPresent(t -> {
            membershipRepository.deleteAll(membershipRepository.findByTenantAndRoleIn(
                t, List.of(StoreMembership.Role.OWNER, StoreMembership.Role.MANAGER,
                    StoreMembership.Role.CUSTOMER)));
            tenantRepository.delete(t);
        });
        for (String e : List.of(OWNER, SECOND)) {
            userRepository.findByEmail(e).ifPresent(userRepository::delete);
        }

        Tenant t = new Tenant();
        t.setName("Membership Test Store");
        t.setSubdomain(SUB);
        t.setIsActive(true);
        tenant = tenantRepository.save(t);

        user(OWNER);
        user(SECOND);
    }

    private User user(String email) {
        User u = new User();
        u.setEmail(email);
        u.setUsername(email);
        u.setIsActive(true);
        return userRepository.save(u);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> membersOf(Map<String, Object> detail) {
        return (List<Map<String, Object>>) detail.get("members");
    }

    private String roleOf(Map<String, Object> detail, String email) {
        return membersOf(detail).stream()
            .filter(m -> email.equals(m.get("email")))
            .map(m -> String.valueOf(m.get("role")))
            .findFirst().orElse(null);
    }

    @Test
    @Transactional
    void assigningAnOwnerMakesTheStoreManageable() {
        Map<String, Object> detail = adminService.assignMember(SUB, OWNER, "OWNER", ACTOR);
        assertThat(roleOf(detail, OWNER)).isEqualTo("OWNER");
    }

    @Test
    @Transactional
    void aDeliberateDemotionActuallyDemotes() {
        adminService.assignMember(SUB, OWNER, "OWNER", ACTOR);
        adminService.assignMember(SUB, SECOND, "OWNER", ACTOR);

        // ensure() would refuse to lower this; assign() must not.
        Map<String, Object> detail = adminService.assignMember(SUB, OWNER, "MANAGER", ACTOR);
        assertThat(roleOf(detail, OWNER)).isEqualTo("MANAGER");
        assertThat(roleOf(detail, SECOND)).isEqualTo("OWNER");
    }

    @Test
    @Transactional
    void theLastOwnerCannotBeDemoted() {
        adminService.assignMember(SUB, OWNER, "OWNER", ACTOR);
        assertThatThrownBy(() -> adminService.assignMember(SUB, OWNER, "MANAGER", ACTOR))
            .hasMessageContaining("only owner");
    }

    @Test
    @Transactional
    void theLastOwnerCannotBeRemoved() {
        adminService.assignMember(SUB, OWNER, "OWNER", ACTOR);
        assertThatThrownBy(() -> adminService.removeMember(SUB, OWNER, ACTOR))
            .hasMessageContaining("only owner");
    }

    @Test
    @Transactional
    void removingAManagerLeavesTheOwnerInPlace() {
        adminService.assignMember(SUB, OWNER, "OWNER", ACTOR);
        adminService.assignMember(SUB, SECOND, "MANAGER", ACTOR);

        Map<String, Object> detail = adminService.removeMember(SUB, SECOND, ACTOR);
        assertThat(roleOf(detail, SECOND)).isNull();
        assertThat(roleOf(detail, OWNER)).isEqualTo("OWNER");
    }

    @Test
    @Transactional
    void anAddressWithNoAccountCannotBeGivenARole() {
        // Identities come from Google; inventing a row here would never match
        // the person who eventually signs in with that address.
        assertThatThrownBy(() -> adminService.assignMember(SUB, "nobody-mt@example.com", "OWNER", ACTOR))
            .hasMessageContaining("no account yet");
    }

    @Test
    @Transactional
    void customerIsNotAGrantableRole() {
        assertThatThrownBy(() -> adminService.assignMember(SUB, OWNER, "CUSTOMER", ACTOR))
            .hasMessageContaining("OWNER or MANAGER");
    }
}
