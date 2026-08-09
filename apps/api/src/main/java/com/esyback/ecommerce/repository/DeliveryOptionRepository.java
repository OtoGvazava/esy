package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.DeliveryOption;
import com.esyback.ecommerce.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryOptionRepository extends JpaRepository<DeliveryOption, Long> {

    List<DeliveryOption> findByTenant(Tenant tenant);

    List<DeliveryOption> findByTenantAndEnabledTrue(Tenant tenant);

    /** Scoped by tenant so one store can never address another's row. */
    Optional<DeliveryOption> findByTenantAndRoute(Tenant tenant, String route);
}
