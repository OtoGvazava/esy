package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreMembershipRepository extends JpaRepository<StoreMembership, Long> {
    Optional<StoreMembership> findByUserAndTenant(User user, Tenant tenant);
    List<StoreMembership> findByUser(User user);
    List<StoreMembership> findByUserAndRole(User user, StoreMembership.Role role);
}
