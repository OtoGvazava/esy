package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.StoreMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class MembershipService {

    private final StoreMembershipRepository membershipRepository;

    /**
     * Upsert a (user, tenant) membership. A higher role is never downgraded by
     * a later lower-role touch (rank: OWNER > MANAGER > CUSTOMER) — buying from
     * a store you manage must not strip your management rights.
     */
    public StoreMembership ensure(User user, Tenant tenant, StoreMembership.Role role) {
        if (user == null || tenant == null) return null;
        return membershipRepository.findByUserAndTenant(user, tenant)
            .map(m -> {
                if (rank(role) > rank(m.getRole())) {
                    m.setRole(role);
                    return membershipRepository.save(m);
                }
                return m;
            })
            .orElseGet(() -> {
                StoreMembership m = new StoreMembership();
                m.setUser(user);
                m.setTenant(tenant);
                m.setRole(role);
                return membershipRepository.save(m);
            });
    }

    /**
     * Set a membership to exactly this role, creating it if absent. The
     * difference from {@link #ensure} is the demotion: ensure exists for
     * incidental touches — shopping at a store you manage must not cost you
     * your management rights — whereas this is a deliberate act by a platform
     * admin, where "make this owner a manager" has to mean what it says.
     */
    public StoreMembership assign(User user, Tenant tenant, StoreMembership.Role role) {
        if (user == null || tenant == null || role == null) return null;
        StoreMembership m = membershipRepository.findByUserAndTenant(user, tenant)
            .orElseGet(() -> {
                StoreMembership fresh = new StoreMembership();
                fresh.setUser(user);
                fresh.setTenant(tenant);
                return fresh;
            });
        m.setRole(role);
        return membershipRepository.save(m);
    }

    /**
     * Drop a membership entirely. Signing in on the storefront recreates it as
     * CUSTOMER, so this removes the management relationship rather than banning
     * the person from shopping.
     */
    public void remove(User user, Tenant tenant) {
        if (user == null || tenant == null) return;
        membershipRepository.findByUserAndTenant(user, tenant)
            .ifPresent(membershipRepository::delete);
    }

    /** How many people currently hold OWNER of this store. */
    @Transactional(readOnly = true)
    public long ownerCount(Tenant tenant) {
        if (tenant == null) return 0;
        return membershipRepository
            .findByTenantAndRoleIn(tenant, java.util.List.of(StoreMembership.Role.OWNER))
            .size();
    }

    private static int rank(StoreMembership.Role r) {
        return switch (r) {
            case OWNER -> 2;
            case MANAGER -> 1;
            case CUSTOMER -> 0;
        };
    }

    /** True when this account is the OWNER of the given store. */
    @Transactional(readOnly = true)
    public boolean isOwner(User user, Tenant tenant) {
        if (user == null || tenant == null) return false;
        return membershipRepository.findByUserAndTenant(user, tenant)
            .map(m -> m.getRole() == StoreMembership.Role.OWNER)
            .orElse(false);
    }

    /**
     * True when this account may run the store day-to-day: OWNER or MANAGER
     * (decision D5). MANAGER covers products, orders and statistics; store
     * settings, users and integrations stay OWNER-only via {@link #isOwner}.
     */
    @Transactional(readOnly = true)
    public boolean canManage(User user, Tenant tenant) {
        if (user == null || tenant == null) return false;
        return membershipRepository.findByUserAndTenant(user, tenant)
            .map(m -> m.getRole() == StoreMembership.Role.OWNER
                || m.getRole() == StoreMembership.Role.MANAGER)
            .orElse(false);
    }
}
