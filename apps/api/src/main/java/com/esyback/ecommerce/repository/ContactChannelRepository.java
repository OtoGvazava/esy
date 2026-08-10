package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.ContactChannel;
import com.esyback.ecommerce.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContactChannelRepository extends JpaRepository<ContactChannel, Long> {

    /** The owner's view: everything, hidden entries included, in display order. */
    List<ContactChannel> findByTenantOrderBySortOrderAscIdAsc(Tenant tenant);

    /** The storefront's view: only what the owner chose to show. */
    List<ContactChannel> findByTenantAndIsPublicTrueOrderBySortOrderAscIdAsc(Tenant tenant);

    /** Scoped by tenant so one store can never address another's row by id. */
    Optional<ContactChannel> findByIdAndTenant(Long id, Tenant tenant);

    List<ContactChannel> findByTenantAndIsPrimaryTrue(Tenant tenant);

    long countByTenant(Tenant tenant);
}
