package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductImage;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductImageRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.ProductVariantRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * A product with photos, variants and options can be deleted (review H8):
 * their foreign keys used to make the delete fail with a 500.
 *
 * <p>Not @Transactional: the foreign-key failure only surfaces when the
 * delete is actually flushed and committed.
 */
@SpringBootTest
class ProductDeleteTest {

    @Autowired ProductService productService;
    @Autowired ProductVariantService variantService;
    @Autowired ProductRepository productRepository;
    @Autowired ProductImageRepository imageRepository;
    @Autowired ProductVariantRepository variantRepository;
    @Autowired TenantRepository tenantRepository;

    @MockitoBean TenantContextService tenantContextService;

    private static final String SUB = "product-delete-store";
    private Tenant tenant;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Product Delete Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
    }

    @Test
    @DisplayName("a product with a photo, variants and options is deleted with all of them")
    void deletesWithChildren() {
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle("Boots");
        p.setDescription("Boots");
        p.setPrice(new BigDecimal("180.00"));
        p.setQuantity(0);
        Product boots = productRepository.save(p);

        ProductImage img = new ProductImage();
        img.setProduct(boots);
        img.setData(new byte[] {1, 2, 3});
        img.setContentType("image/png");
        img.setSizeBytes(3);
        img.setPosition(0);
        imageRepository.save(img);

        variantService.replace(boots, Map.of(
            "axes", List.of(Map.of("name", "Size", "values", List.of("38", "40"))),
            "rows", List.of(
                Map.of("key", List.of("38"), "stock", 2),
                Map.of("key", List.of("40"), "stock", 5))));
        assertThat(variantRepository.findByProductOrderByIdAsc(boots)).isNotEmpty();

        assertThat(productService.deleteProduct(boots.getId())).isTrue();

        assertThat(productRepository.findById(boots.getId())).isEmpty();
        assertThat(imageRepository.findMetaByProductId(boots.getId())).isEmpty();
    }
}
