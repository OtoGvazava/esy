package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.TenantLogo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TenantLogoRepository extends JpaRepository<TenantLogo, Long> {

    // A store keeps at most one logo; replace = delete prior row(s) then insert
    // so the served id (and thus the cached URL) changes on every upload.
    void deleteByTenant_Id(Long tenantId);
}
