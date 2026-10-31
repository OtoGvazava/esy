package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.dto.CategoryCount;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

/** The list's filters are {@link ProductSpecs}, run through the specification executor. */
@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    Page<Product> findByTenantAndTitleContainingIgnoreCase(Tenant tenant, String title, Pageable pageable);

    Page<Product> findByTenantAndPriceBetween(Tenant tenant, BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable);

    Page<Product> findByTenantAndQuantityGreaterThanEqual(Tenant tenant, Integer quantity, Pageable pageable);

    Page<Product> findByTenant(Tenant tenant, Pageable pageable);

    long countByTenant(Tenant tenant);

    /**
     * The store's categories with how many products carry each, most first.
     *
     * <p>Grouped ignoring case, so "Mugs" and "mugs" are one pill — the list
     * filter matches them as one, and two pills that open the same collection
     * would each show the wrong count. The spelling shown is the lowest one,
     * which is arbitrary between variants but stable from one request to the
     * next.
     */
    @Query("SELECT new com.esyback.ecommerce.dto.CategoryCount(MIN(p.category), COUNT(p)) "
         + "FROM Product p WHERE p.tenant = :tenant AND p.category IS NOT NULL "
         + "GROUP BY LOWER(p.category) "
         + "ORDER BY COUNT(p) DESC, MIN(p.category) ASC")
    List<CategoryCount> countCategories(@Param("tenant") Tenant tenant);
}
