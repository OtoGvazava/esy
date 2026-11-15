package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.StoreMembershipRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.web.ApiRefusal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The last-owner rule under two owners removing each other at once (review,
 * Low: the guard was check-then-act, and two concurrent demotions left a
 * store with no owner).
 */
@SpringBootTest
class LastOwnerRaceTest {

    @Autowired MembershipService membershipService;
    @Autowired TenantRepository tenantRepository;
    @Autowired UserRepository userRepository;
    @Autowired StoreMembershipRepository membershipRepository;
    @Autowired TransactionTemplate tx;

    private User account(String email) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User();
            u.setEmail(email);
            u.setUsername(email);
            u.setIsActive(true);
            return userRepository.save(u);
        });
    }

    @Test
    @DisplayName("two owners removing each other at once leave one owner, and the second is refused")
    void concurrentRemovalsKeepAnOwner() throws Exception {
        Tenant tenant = tenantRepository.save(newStore("last-owner-race"));
        User a = account("owner-a-race@example.com");
        User b = account("owner-b-race@example.com");
        membershipService.assign(a, tenant, StoreMembership.Role.OWNER);
        membershipService.assign(b, tenant, StoreMembership.Role.OWNER);

        CountDownLatch firstHasChecked = new CountDownLatch(1);
        // The first removal passes the rule and holds its transaction open a
        // moment, as a slow request would; the second arrives meanwhile.
        CompletableFuture<Object> first = CompletableFuture.supplyAsync(() -> attempt(() ->
            tx.execute(s -> {
                membershipService.removeStaff(tenant, a.getEmail());
                firstHasChecked.countDown();
                pause(400);
                return null;
            })));
        assertThat(firstHasChecked.await(10, TimeUnit.SECONDS)).isTrue();
        CompletableFuture<Object> second = CompletableFuture.supplyAsync(() -> attempt(() ->
            tx.execute(s -> membershipService.removeStaff(tenant, b.getEmail()))));

        Object one = first.get(20, TimeUnit.SECONDS);
        Object two = second.get(20, TimeUnit.SECONDS);

        assertThat(one).isNull();
        assertThat(two).isInstanceOfSatisfying(ApiRefusal.class,
            e -> assertThat(e.getCode()).isEqualTo(MembershipService.TEAM_LAST_OWNER));
        assertThat(membershipRepository.findByTenantAndRoleIn(tenant, List.of(StoreMembership.Role.OWNER)))
            .extracting(m -> m.getUser().getId())
            .containsExactly(b.getId());
    }

    private static Tenant newStore(String sub) {
        Tenant t = new Tenant();
        t.setName("Last Owner Race");
        t.setSubdomain(sub);
        t.setIsActive(true);
        return t;
    }

    /** Null when the call went through, the exception when it was refused. */
    private static Object attempt(Runnable call) {
        try {
            call.run();
            return null;
        } catch (RuntimeException e) {
            return e;
        }
    }

    private static void pause(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
