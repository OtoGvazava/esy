package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductImage;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductImageRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.web.ApiRefusal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Product photo uploads and serving (review, Low: no cap per product, the
 * client's content type trusted when the bytes were not an image, and every
 * revalidation loading the whole photo).
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProductPhotoLimitsTest {

    @Autowired ProductImageService imageService;
    @Autowired ProductImageRepository imageRepository;
    @Autowired ProductRepository productRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired MockMvc mvc;

    @MockitoBean TenantContextService tenantContextService;

    /** The smallest thing that sniffs as a PNG. */
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0};

    private Product product;

    @BeforeEach
    void setUp() {
        Tenant tenant = tenantRepository.findBySubdomain("photo-limits").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Photo Limits");
            t.setSubdomain("photo-limits");
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle("Vase");
        p.setPrice(new BigDecimal("40.00"));
        p.setQuantity(1);
        product = productRepository.save(p);
    }

    private static MultipartFile png(int i) {
        return new MockMultipartFile("files", "p" + i + ".png", "image/png", PNG);
    }

    private static List<MultipartFile> pngs(int n) {
        List<MultipartFile> files = new ArrayList<>();
        for (int i = 0; i < n; i++) files.add(png(i));
        return files;
    }

    @Test
    @DisplayName("a product holds at most 12 photos, and an upload that would pass that adds none")
    void photoCap() {
        imageService.addImages(product.getId(), pngs(ProductImageService.MAX_PHOTOS - 1));

        assertThatThrownBy(() -> imageService.addImages(product.getId(), pngs(2)))
            .isInstanceOfSatisfying(ApiRefusal.class, e -> assertThat(e.getCode()).isEqualTo("PHOTO_LIMIT"));
        assertThat(imageRepository.countByProduct(product)).isEqualTo(ProductImageService.MAX_PHOTOS - 1);

        imageService.addImages(product.getId(), pngs(1));
        assertThat(imageRepository.countByProduct(product)).isEqualTo(ProductImageService.MAX_PHOTOS);
    }

    @Test
    @DisplayName("a file that is not an image is refused even when it says it is one")
    void declaredTypeIsNotTrusted() {
        MultipartFile html = new MockMultipartFile("files", "x.png", "image/png",
            "<html><script>alert(1)</script></html>".getBytes());

        assertThatThrownBy(() -> imageService.addImages(product.getId(), List.of(html)))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE));
        assertThat(imageRepository.countByProduct(product)).isZero();
    }

    @Test
    @DisplayName("a browser revalidating a photo it holds gets 304, and a stranger's tag still gets the photo")
    void notModified() throws Exception {
        imageService.addImages(product.getId(), pngs(1));
        ProductImage img = imageRepository.findAll().stream()
            .filter(i -> i.getProduct().getId().equals(product.getId())).findFirst().orElseThrow();
        String url = "/api/products/" + product.getId() + "/images/" + img.getId();

        mvc.perform(get(url).header("If-None-Match", "\"" + img.getId() + "\""))
            .andExpect(status().isNotModified());
        mvc.perform(get(url).header("If-None-Match", "W/\"" + img.getId() + "\""))
            .andExpect(status().isNotModified());
        mvc.perform(get(url).header("If-None-Match", "\"999999\""))
            .andExpect(status().isOk());
        // A tag for an image of another product is not this one's photo.
        mvc.perform(get("/api/products/" + (product.getId() + 100000) + "/images/" + img.getId())
                .header("If-None-Match", "\"" + img.getId() + "\""))
            .andExpect(status().isNotFound());
    }
}
