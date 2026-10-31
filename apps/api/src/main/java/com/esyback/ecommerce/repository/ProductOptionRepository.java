package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductOption;
import com.esyback.ecommerce.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductOptionRepository extends JpaRepository<ProductOption, Long> {
    List<ProductOption> findByProductOrderByPositionAsc(Product product);
    void deleteByProduct(Product product);

    /** Every axis of the store's products that have variants on, product by product. */
    @Query("SELECT o FROM ProductOption o JOIN o.product p "
         + "WHERE p.tenant = :tenant AND p.hasVariants = true "
         + "ORDER BY p.id ASC, o.position ASC")
    List<ProductOption> findAxesInStore(@Param("tenant") Tenant tenant);

    /** The same, for the products of one category (matched ignoring case). */
    @Query("SELECT o FROM ProductOption o JOIN o.product p "
         + "WHERE p.tenant = :tenant AND p.hasVariants = true "
         + "AND LOWER(p.category) = LOWER(:category) "
         + "ORDER BY p.id ASC, o.position ASC")
    List<ProductOption> findAxesInCategory(@Param("tenant") Tenant tenant, @Param("category") String category);
}
