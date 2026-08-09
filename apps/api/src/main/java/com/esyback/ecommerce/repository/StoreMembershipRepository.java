package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface StoreMembershipRepository extends JpaRepository<StoreMembership, Long> {
    Optional<StoreMembership> findByUserAndTenant(User user, Tenant tenant);
    List<StoreMembership> findByUser(User user);
    List<StoreMembership> findByUserAndRole(User user, StoreMembership.Role role);

    /**
     * The people who run one store, for the admin store detail. Role-filtered
     * rather than "everyone attached to the tenant": CUSTOMER rows are the
     * store's whole shopper list, which is unbounded and is not what a member
     * list means.
     */
    List<StoreMembership> findByTenantAndRoleIn(Tenant tenant, Collection<StoreMembership.Role> roles);

    /**
     * Every membership with this role across all stores. The admin store list
     * resolves one ownerEmail per store from this single query instead of a
     * lookup per store.
     */
    List<StoreMembership> findByRole(StoreMembership.Role role);
}
