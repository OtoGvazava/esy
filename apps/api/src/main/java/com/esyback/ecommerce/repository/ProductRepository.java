package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    
    @Query("SELECT p FROM Product p WHERE p.tenant = :tenant AND " +
           "(:title IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :title, '%'))) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:quantity IS NULL OR p.quantity >= :quantity)")
    Page<Product> findProductsWithFilters(
            @Param("tenant") Tenant tenant,
            @Param("title") String title,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("quantity") Integer quantity,
            Pageable pageable
    );
    
    Page<Product> findByTenantAndTitleContainingIgnoreCase(Tenant tenant, String title, Pageable pageable);
    
    Page<Product> findByTenantAndPriceBetween(Tenant tenant, BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable);
    
    Page<Product> findByTenantAndQuantityGreaterThanEqual(Tenant tenant, Integer quantity, Pageable pageable);
    
    Page<Product> findByTenant(Tenant tenant, Pageable pageable);

    long countByTenant(Tenant tenant);
}
