package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {
    List<ProductVariant> findByProductOrderByIdAsc(Product product);

    /** Scoped by product so one product can never address another's row. */
    Optional<ProductVariant> findByIdAndProduct(Long id, Product product);

    Optional<ProductVariant> findByProductAndValue1AndValue2(Product product, String value1, String value2);

    void deleteByProduct(Product product);
}
