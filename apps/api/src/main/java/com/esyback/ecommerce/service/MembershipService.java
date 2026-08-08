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
