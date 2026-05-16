package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {
    
    Optional<Tenant> findBySubdomain(String subdomain);
    
    Optional<Tenant> findByName(String name);
    
    boolean existsBySubdomain(String subdomain);
    
    boolean existsByName(String name);
}
