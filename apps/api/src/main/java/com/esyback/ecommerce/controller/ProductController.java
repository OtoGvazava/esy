package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.PagedResponse;
import com.esyback.ecommerce.dto.ProductDto;
import com.esyback.ecommerce.dto.ProductListDto;
import com.esyback.ecommerce.entity.ProductImage;
import com.esyback.ecommerce.service.ProductImageService;
import com.esyback.ecommerce.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {
    
    @Autowired
    private ProductService productService;

    @Autowired
    private ProductImageService productImageService;

    @Autowired
    private com.esyback.ecommerce.service.ProductVariantService productVariantService;
    
    @GetMapping
    public ResponseEntity<PagedResponse<ProductListDto>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer quantity) {
        
        PagedResponse<ProductListDto> response = productService.getProducts(
            page, size, sortBy, sortDir, title, minPrice, maxPrice, quantity);
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/search")
    public ResponseEntity<PagedResponse<ProductListDto>> searchProducts(
            @RequestParam(name = "q", defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        String title = q.isBlank() ? null : q.trim();
        PagedResponse<ProductListDto> response = productService.getProducts(
            page, size, sortBy, sortDir, title, null, null, null);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getProductById(@PathVariable Long id) {
        Optional<ProductDto> product = productService.getProductById(id);
        return product.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<ProductDto> createProduct(@Valid @RequestBody ProductDto productDto) {
        ProductDto createdProduct = productService.createProduct(productDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdProduct);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<ProductDto> updateProduct(@PathVariable Long id, 
                                                   @Valid @RequestBody ProductDto productDto) {
        Optional<ProductDto> updatedProduct = productService.updateProduct(id, productDto);
        return updatedProduct.map(ResponseEntity::ok)
                           .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        boolean deleted = productService.deleteProduct(id);
        return deleted ? ResponseEntity.noContent().build()
                      : ResponseEntity.notFound().build();
    }

    // ---- Product photos (our DB-backed gallery) ----------------------------

    // Owner/admin uploads one or more files; service is tenant-scoped so an
    // owner can only add to their own store's product. Returns the fresh
    // product (with images[]).
    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<ProductDto> uploadImages(@PathVariable Long id,
                                                   @RequestParam("files") List<MultipartFile> files) {
        productImageService.addImages(id, files);
        return productService.getProductById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/images/{imageId}")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<ProductDto> deleteImage(@PathVariable Long id,
                                                  @PathVariable Long imageId) {
        productImageService.deleteImage(id, imageId);
        return productService.getProductById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // Public: streams the bytes for an <img src>. Long-cached + ETag (image
    // ids are immutable — a new upload is a new id).
    @GetMapping("/{id}/images/{imageId}")
    public ResponseEntity<byte[]> serveImage(@PathVariable Long id,
                                             @PathVariable Long imageId) {
        ProductImage img = productImageService.getForServing(id, imageId);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(img.getContentType()))
            .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic())
            .eTag(String.valueOf(img.getId()))
            .body(img.getData());
    }

    // Surface thrown statuses as { error } (the SPA reads body.error; Spring's
    // default body masks the reason).
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(Map.of("error", "Image too large (max 5MB each, 25MB per upload)"));
    }

    // ─── Variants (D11) ─────────────────────────────────────────────────────
    // Read is public: a shopper must see the sizes before choosing one. Write
    // is store-management, like every other product mutation.

    @GetMapping("/{id}/variants")
    public ResponseEntity<Map<String, Object>> getVariants(@PathVariable Long id) {
        return productService.findEntity(id)
            .map(p -> ResponseEntity.ok(productVariantService.read(p)))
            .orElse(ResponseEntity.notFound().build());
    }

    /** Replaces the whole variant document; no axes means variants off. */
    @PutMapping("/{id}/variants")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> putVariants(@PathVariable Long id,
                                                           @RequestBody Map<String, Object> body) {
        return productService.findEntity(id)
            .map(p -> ResponseEntity.ok(productVariantService.replace(p, body)))
            .orElse(ResponseEntity.notFound().build());
    }
}