package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.StoreFollow;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreFollowRepository extends JpaRepository<StoreFollow, Long> {
    List<StoreFollow> findByUser(User user);
    Optional<StoreFollow> findByUserAndTenant(User user, Tenant tenant);
    long countByTenant(Tenant tenant);
}
