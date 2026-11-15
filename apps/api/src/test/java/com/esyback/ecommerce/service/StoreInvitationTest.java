package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.StoreInvitation;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.StoreInvitationRepository;
import com.esyback.ecommerce.repository.StoreMembershipRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.web.ApiRefusal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * A store role is offered, never imposed (review M36): nothing is granted
 * until the person the invitation names accepts it, and an owner learns
 * nothing about an address by inviting it.
 */
@SpringBootTest
@Transactional
class StoreInvitationTest {

    @Autowired MembershipService membership;
    @Autowired StoreInvitationRepository invitations;
    @Autowired StoreMembershipRepository memberships;
    @Autowired TenantRepository tenants;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;

    private Tenant store;
    private User owner;

    @BeforeEach
    void setUp() {
        store = tenants.findBySubdomain("invite-store").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Invite Store");
            t.setSubdomain("invite-store");
            t.setIsActive(true);
            return tenants.save(t);
        });
        owner = account("owner@invite.test");
        membership.assign(owner, store, StoreMembership.Role.OWNER);
    }

    private User account(String email) {
        return users.findByEmail(email).orElseGet(() -> {
            User u = new User();
            u.setUsername(email);
            u.setEmail(email);
            u.setIsActive(true);
            u.addRole(roles.findByName("USER").orElseGet(() -> {
                Role r = new Role();
                r.setName("USER");
                return roles.save(r);
            }));
            return users.save(u);
        });
    }

    private StoreMembership.Role roleOf(User u) {
        return memberships.findByUserAndTenant(u, store).map(StoreMembership::getRole).orElse(null);
    }

    @Test
    @DisplayName("inviting grants nothing, and an address with no account is answered the same")
    void invitingGrantsNothing() {
        User target = account("target@invite.test");

        assertThat(membership.invite(store, "Target@Invite.test", "OWNER", owner.getEmail()))
            .isEqualTo(MembershipService.InviteOutcome.INVITED);
        assertThat(membership.invite(store, "nobody@invite.test", "MANAGER", owner.getEmail()))
            .isEqualTo(MembershipService.InviteOutcome.INVITED);

        assertThat(roleOf(target)).isNull();
        assertThat(membership.invitationsOf(store)).extracting(StoreInvitation::getEmail)
            .containsExactlyInAnyOrder("target@invite.test", "nobody@invite.test");
    }

    @Test
    @DisplayName("only the account the invitation names can accept it, and accepting grants the role")
    void acceptGrants() {
        User target = account("accept@invite.test");
        User stranger = account("stranger@invite.test");
        membership.invite(store, "accept@invite.test", "MANAGER", owner.getEmail());
        Long id = membership.invitationsFor(target).get(0).getId();

        assertThatThrownBy(() -> membership.acceptInvitation(stranger, id))
            .isInstanceOf(ApiRefusal.class)
            .satisfies(e -> assertThat(((ApiRefusal) e).getCode()).isEqualTo(MembershipService.INVITE_GONE));
        assertThat(roleOf(stranger)).isNull();

        membership.acceptInvitation(target, id);

        assertThat(roleOf(target)).isEqualTo(StoreMembership.Role.MANAGER);
        assertThat(membership.invitationsFor(target)).isEmpty();
    }

    @Test
    @DisplayName("declining and withdrawing both leave nothing granted")
    void declineAndCancel() {
        User a = account("decline@invite.test");
        membership.invite(store, a.getEmail(), "OWNER", owner.getEmail());
        membership.declineInvitation(a, membership.invitationsFor(a).get(0).getId());
        assertThat(roleOf(a)).isNull();

        membership.invite(store, a.getEmail(), "OWNER", owner.getEmail());
        assertThat(membership.cancelInvitation(store, a.getEmail())).isTrue();
        assertThat(membership.invitationsFor(a)).isEmpty();
    }

    @Test
    @DisplayName("moving an owner down to manager applies at once; it is not an offer")
    void demotionIsDirect() {
        User second = account("second@invite.test");
        membership.assign(second, store, StoreMembership.Role.OWNER);

        assertThat(membership.invite(store, second.getEmail(), "MANAGER", owner.getEmail()))
            .isEqualTo(MembershipService.InviteOutcome.CHANGED);
        assertThat(roleOf(second)).isEqualTo(StoreMembership.Role.MANAGER);
    }

    @Test
    @DisplayName("an invitation older than its time cannot be accepted")
    void expired() {
        User late = account("late@invite.test");
        membership.invite(store, late.getEmail(), "MANAGER", owner.getEmail());
        StoreInvitation inv = invitations.findByTenantAndEmail(store, late.getEmail()).orElseThrow();
        inv.setCreatedAt(Instant.now().minus(15, ChronoUnit.DAYS));
        invitations.save(inv);

        assertThat(membership.invitationsFor(late)).isEmpty();
        assertThatThrownBy(() -> membership.acceptInvitation(late, inv.getId())).isInstanceOf(ApiRefusal.class);
        assertThat(roleOf(late)).isNull();
    }

    @Test
    @DisplayName("removing someone withdraws their open invitation, so they cannot walk back in with it")
    void removalWithdrawsInvitation() {
        User x = account("x@invite.test");
        membership.assign(x, store, StoreMembership.Role.MANAGER);
        membership.invite(store, x.getEmail(), "OWNER", owner.getEmail());
        Long id = membership.invitationsFor(x).get(0).getId();

        membership.removeStaffQuietly(store, x.getEmail());

        assertThat(roleOf(x)).isNull();
        assertThat(membership.invitationsFor(x)).isEmpty();
        assertThatThrownBy(() -> membership.acceptInvitation(x, id)).isInstanceOf(ApiRefusal.class);
        assertThat(roleOf(x)).isNull();
    }

    @Test
    @DisplayName("an invitation from an owner who has since been removed cannot be accepted")
    void inviterMustStillOwn() {
        User rogue = account("rogue@invite.test");
        membership.assign(rogue, store, StoreMembership.Role.OWNER);
        User accomplice = account("accomplice@invite.test");
        membership.invite(store, accomplice.getEmail(), "OWNER", rogue.getEmail());
        Long id = membership.invitationsFor(accomplice).get(0).getId();

        membership.removeStaff(store, rogue.getEmail());

        assertThatThrownBy(() -> membership.acceptInvitation(accomplice, id))
            .isInstanceOf(ApiRefusal.class)
            .satisfies(e -> assertThat(((ApiRefusal) e).getCode()).isEqualTo(MembershipService.INVITE_GONE));
        assertThat(roleOf(accomplice)).isNull();
    }

    @Test
    @DisplayName("an owner's removal answers the same for an address with no account as for one off the team")
    void quietRemoval() {
        assertThatThrownBy(() -> membership.removeStaffQuietly(store, "ghost@invite.test"))
            .isInstanceOf(ApiRefusal.class)
            .satisfies(e -> assertThat(((ApiRefusal) e).getCode()).isEqualTo(MembershipService.TEAM_NOT_STAFF));
    }
}
