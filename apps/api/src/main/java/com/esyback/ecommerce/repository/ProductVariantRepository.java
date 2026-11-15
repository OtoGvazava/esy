package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
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

    // One bulk DELETE, for deleting the whole product (no per-row SELECT/DELETE).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from ProductVariant x where x.product = :product")
    int deleteAllOfProduct(@Param("product") Product product);

    /** The row, locked until the transaction ends (see ProductRepository.lockById). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from ProductVariant v where v.id = :id and v.product = :product")
    Optional<ProductVariant> lockByIdAndProduct(@Param("id") Long id, @Param("product") Product product);
}
