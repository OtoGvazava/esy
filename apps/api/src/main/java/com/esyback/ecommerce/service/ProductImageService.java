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

import java.io.IOException;
import java.util.List;
import java.util.Set;

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

    private static final Set<String> ALLOWED = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif");

    // Defense-in-depth alongside spring.servlet.multipart.max-file-size.
    private static final long MAX_BYTES = 5L * 1024 * 1024;

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
            byte[] bytes = read(file);
            String type = resolveType(file, bytes);
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

    private static byte[] read(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image exceeds 5MB");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read file");
        }
    }

    // Trust the sniffed signature over the client-sent content type.
    private static String resolveType(MultipartFile file, byte[] bytes) {
        String sniffed = sniff(bytes);
        if (sniffed != null) return sniffed;
        String declared = file.getContentType();
        if (declared != null && ALLOWED.contains(declared.toLowerCase())) {
            return declared.toLowerCase();
        }
        throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            "Only JPEG, PNG, WEBP or GIF images are allowed");
    }

    private static String sniff(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "image/png";
        }
        if (b.length >= 4 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') {
            return "image/gif";
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
            && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
