package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.SavedItem;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedItemRepository extends JpaRepository<SavedItem, Long> {
    List<SavedItem> findByUserOrderByCreatedAtDesc(User user);
    List<SavedItem> findByUserAndTenant(User user, Tenant tenant);
    List<SavedItem> findByUserAndTenantOrderByCreatedAtDesc(User user, Tenant tenant);
    Optional<SavedItem> findByUserAndTenantAndProductId(User user, Tenant tenant, Long productId);
}
