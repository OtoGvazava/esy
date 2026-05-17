package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    // Loads bytes — only used by the serve endpoint.
    Optional<ProductImage> findByIdAndProduct_Id(Long id, Long productId);

    long countByProduct(Product product);

    // Metadata only (no bytes) for DTO building / gallery ordering.
    @Query("select i.id as id, i.position as position from ProductImage i "
        + "where i.product.id = :productId order by i.position asc, i.id asc")
    List<ImageMeta> findMetaByProductId(@Param("productId") Long productId);

    interface ImageMeta {
        Long getId();
        Integer getPosition();
    }
}
