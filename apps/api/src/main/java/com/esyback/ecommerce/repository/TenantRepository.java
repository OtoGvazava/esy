package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {

    Optional<Tenant> findBySubdomain(String subdomain);

    Optional<Tenant> findByName(String name);

    boolean existsBySubdomain(String subdomain);

    boolean existsByName(String name);

    /**
     * The public store directory: active stores only, newest first, filtered
     * and sorted by the database rather than by loading every store.
     */
    @Query("select t from Tenant t where t.isActive = true "
        + "order by t.createdAt desc nulls last, t.id desc")
    List<Tenant> findActiveNewestFirst();
}
