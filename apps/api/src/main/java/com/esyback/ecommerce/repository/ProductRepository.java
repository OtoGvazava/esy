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
import java.util.Collection;
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

    /**
     * The photos of each listed store's newest products, at most
     * {@code perStore} a store, as {@code [tenant id, image url]} rows in store
     * order, newest first: the store directory's preview row. A product without
     * a photo is skipped, so a store shows its newest products that have one.
     *
     * <p>One query for every store listed: each store's products are ranked
     * where they are and only the first few of each come back. Native SQL
     * because the ranking is a window function; it runs the same on Postgres
     * and on H2. The caller passes at least one id ({@code IN ()} is not SQL).
     */
    @Query(nativeQuery = true, value = """
        SELECT ranked.tenant_id, ranked.image_url FROM (
            SELECT p.tenant_id, p.image_url,
                   ROW_NUMBER() OVER (PARTITION BY p.tenant_id ORDER BY p.created_at DESC NULLS LAST, p.id DESC) AS rn
            FROM products p
            WHERE p.tenant_id IN (:tenantIds) AND p.image_url IS NOT NULL AND TRIM(p.image_url) <> ''
        ) ranked
        WHERE ranked.rn <= :perStore
        ORDER BY ranked.tenant_id, ranked.rn
        """)
    List<Object[]> findPreviewImages(@Param("tenantIds") Collection<Long> tenantIds, @Param("perStore") int perStore);
}
