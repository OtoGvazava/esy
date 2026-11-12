package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.TenantCover;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface TenantCoverRepository extends JpaRepository<TenantCover, Long> {

    // A store keeps at most one cover; replace = delete prior row(s) then
    // insert, so the served id (and thus the cached URL) changes on every upload.
    void deleteByTenant_Id(Long tenantId);

    /**
     * The store's cover ids, newest first, without touching the bytes:
     * {@code GET /api/tenant/current} asks on every page load. There is at
     * most one; newest-first only decides which wins if that were ever not so.
     */
    @Query("select c.id from TenantCover c where c.tenant.id = :tenantId order by c.id desc")
    List<Long> findIdsByTenantId(@Param("tenantId") Long tenantId);

    /**
     * The same for many stores at once (the store directory): one row per
     * cover as {@code [tenantId, coverId]}, oldest first, so the last row read
     * for a store is its newest. Never the bytes.
     */
    @Query("select c.tenant.id, c.id from TenantCover c where c.tenant.id in :tenantIds order by c.id")
    List<Object[]> findIdsByTenantIds(@Param("tenantIds") Collection<Long> tenantIds);
}
