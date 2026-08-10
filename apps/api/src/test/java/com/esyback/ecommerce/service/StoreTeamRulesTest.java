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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The staff rules as the MERCHANT reaches them (D17).
 *
 * <p>AdminMembershipTest covers the same rules through the platform admin
 * screen. This exercises them at the shared layer both callers now go through,
 * which is the point of the refactor: an owner adding a colleague from their
 * own back office and an admin doing it from admin.esy.ge must be governed by
 * one implementation, not two that agree today and drift tomorrow.
 */
@SpringBootTest
class StoreTeamRulesTest {

    @Autowired MembershipService membershipService;
    @Autowired TenantRepository tenantRepository;
    @Autowired UserRepository userRepository;
    @Autowired StoreMembershipRepository membershipRepository;

    private static final String SUB = "team-rules-store";
    private static final String OWNER = "owner-tr@example.com";
    private static final String SECOND = "second-tr@example.com";

    private Tenant tenant;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Team Rules Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        membershipRepository.deleteAll(membershipRepository.findByTenantAndRoleIn(
            tenant, List.of(StoreMembership.Role.OWNER, StoreMembership.Role.MANAGER,
                StoreMembership.Role.CUSTOMER)));
        for (String e : List.of(OWNER, SECOND)) {
            if (userRepository.findByEmail(e).isEmpty()) {
                User u = new User();
                u.setEmail(e);
                u.setUsername(e);
                u.setIsActive(true);
                userRepository.save(u);
            }
        }
    }

    private String roleOf(String email) {
        return membershipService.staffOf(tenant).stream()
            .filter(m -> email.equals(m.getUser().getEmail()))
            .map(m -> m.getRole().name())
            .findFirst().orElse(null);
    }

    @Test
    @Transactional
    void anOwnerCanPutSomeoneInChargeOfTheirOwnShop() {
        membershipService.assignStaff(tenant, OWNER, "OWNER");
        membershipService.assignStaff(tenant, SECOND, "MANAGER");

        assertThat(roleOf(OWNER)).isEqualTo("OWNER");
        assertThat(roleOf(SECOND)).isEqualTo("MANAGER");
    }

    @Test
    @Transactional
    void theAssignmentReportsWhatItReplaced() {
        membershipService.assignStaff(tenant, OWNER, "OWNER");
        membershipService.assignStaff(tenant, SECOND, "MANAGER");

        // The admin screen turns this into its audit line, so it has to be
        // the role that was actually displaced.
        var done = membershipService.assignStaff(tenant, SECOND, "OWNER");
        assertThat(done.previousRole()).isEqualTo(StoreMembership.Role.MANAGER);
        assertThat(done.membership().getRole()).isEqualTo(StoreMembership.Role.OWNER);
        assertThat(done.email()).isEqualTo(SECOND);
    }

    @Test
    @Transactional
    void theSameLastOwnerGuardAppliesToTheMerchant() {
        membershipService.assignStaff(tenant, OWNER, "OWNER");
        assertThatThrownBy(() -> membershipService.assignStaff(tenant, OWNER, "MANAGER"))
            .hasMessageContaining("only owner");
        assertThatThrownBy(() -> membershipService.removeStaff(tenant, OWNER))
            .hasMessageContaining("only owner");
    }

    @Test
    @Transactional
    void anOwnerCannotInventAnAccount() {
        assertThatThrownBy(() -> membershipService.assignStaff(tenant, "ghost-tr@example.com", "MANAGER"))
            .hasMessageContaining("no account yet");
    }

    @Test
    @Transactional
    void customerIsNotGrantableFromTheBackOfficeEither() {
        assertThatThrownBy(() -> membershipService.assignStaff(tenant, SECOND, "CUSTOMER"))
            .hasMessageContaining("OWNER or MANAGER");
    }

    @Test
    @Transactional
    void staffNeverIncludesTheShopperList() {
        membershipService.assignStaff(tenant, OWNER, "OWNER");
        // Signing in on a storefront records this automatically for everyone
        // who ever bought something; it is not a team member.
        membershipService.ensure(userRepository.findByEmail(SECOND).orElseThrow(),
            tenant, StoreMembership.Role.CUSTOMER);

        assertThat(membershipService.staffOf(tenant)).hasSize(1);
        assertThat(roleOf(SECOND)).isNull();
    }

    @Test
    @Transactional
    void removingAManagerLeavesTheOwner() {
        membershipService.assignStaff(tenant, OWNER, "OWNER");
        membershipService.assignStaff(tenant, SECOND, "MANAGER");

        assertThat(membershipService.removeStaff(tenant, SECOND))
            .isEqualTo(StoreMembership.Role.MANAGER);
        assertThat(roleOf(SECOND)).isNull();
        assertThat(roleOf(OWNER)).isEqualTo("OWNER");
    }
}
