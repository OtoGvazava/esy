package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductImage;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductImageRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Owner/admin product photo storage in our own DB. All writes are tenant-scoped
 * (the product must belong to the host-resolved store) so an owner can only
 * touch their own catalog — same model as ProductService. The single DB-backed
 * impl lives here; an object-store (R2/S3) swap would replace this class only.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ProductImageService {

    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final TenantContextService tenantContextService;

    public static String imageUrl(Long productId, Long imageId) {
        return "/api/products/" + productId + "/images/" + imageId;
    }

    private Product ownedProduct(Long productId) {
        Tenant tenant = tenantContextService.getCurrentTenant();
        return productRepository.findById(productId)
            .filter(p -> p.getTenant().equals(tenant))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    public void addImages(Long productId, List<MultipartFile> files) {
        Product product = ownedProduct(productId);
        if (files == null || files.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No files");
        }
        int position = (int) imageRepository.countByProduct(product);
        Long firstSavedId = null;
        for (MultipartFile file : files) {
            byte[] bytes = ImageUpload.read(file);
            String type = ImageUpload.resolveType(file, bytes);
            ProductImage img = new ProductImage();
            img.setProduct(product);
            img.setData(bytes);
            img.setContentType(type);
            img.setSizeBytes(bytes.length);
            img.setPosition(position++);
            ProductImage saved = imageRepository.save(img);
            if (firstSavedId == null) firstSavedId = saved.getId();
        }
        // Keep the existing imageUrl pipeline (grid/cart/saved) working with
        // zero changes: an upload-only product gets its primary thumbnail set
        // to the first uploaded image.
        if (isBlank(product.getImageUrl()) && firstSavedId != null) {
            product.setImageUrl(imageUrl(productId, firstSavedId));
            productRepository.save(product);
        }
    }

    public void deleteImage(Long productId, Long imageId) {
        Product product = ownedProduct(productId);
        ProductImage img = imageRepository.findByIdAndProduct_Id(imageId, productId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found"));
        String url = imageUrl(productId, imageId);
        imageRepository.delete(img);
        // If we just removed the primary thumbnail, repoint it to the next
        // remaining image (or clear it).
        if (url.equals(product.getImageUrl())) {
            List<ProductImageRepository.ImageMeta> rest = imageRepository.findMetaByProductId(productId);
            product.setImageUrl(rest.isEmpty() ? null : imageUrl(productId, rest.get(0).getId()));
            productRepository.save(product);
        }
    }

    /** Bytes for the public serve endpoint, scoped to the current store. */
    @Transactional(readOnly = true)
    public ProductImage getForServing(Long productId, Long imageId) {
        ownedProduct(productId); // 404s if the product isn't in this store
        return imageRepository.findByIdAndProduct_Id(imageId, productId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found"));
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
