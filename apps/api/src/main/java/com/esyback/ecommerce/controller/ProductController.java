package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.CategoryCount;
import com.esyback.ecommerce.dto.OptionFacet;
import com.esyback.ecommerce.dto.PagedResponse;
import com.esyback.ecommerce.dto.ProductDto;
import com.esyback.ecommerce.dto.ProductFilter;
import com.esyback.ecommerce.dto.ProductListDto;
import com.esyback.ecommerce.entity.ProductImage;
import com.esyback.ecommerce.service.ProductImageService;
import com.esyback.ecommerce.service.ProductImportService;
import com.esyback.ecommerce.service.ProductService;
import com.esyback.ecommerce.web.ApiRefusal;
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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
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
    private ProductImportService productImportService;

    @Autowired
    private com.esyback.ecommerce.service.ProductVariantService productVariantService;
    
    /**
     * The store's products, a page at a time.
     *
     * @param category exactly this category, ignoring case
     * @param inStock  only products with stock — with {@code option}, stock on
     *                 the matching combination itself
     * @param option   {@code <axis>:<value>}, repeatable: values on one axis are
     *                 alternatives, separate axes must all hold on one
     *                 combination. Split at the first colon, so a value may
     *                 contain one.
     */
    @GetMapping
    public ResponseEntity<PagedResponse<ProductListDto>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer quantity,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "false") boolean inStock,
            @RequestParam(name = "option", required = false) List<String> option) {

        ProductFilter filter = new ProductFilter(
            title == null || title.isBlank() ? null : title.trim(),
            minPrice, maxPrice, quantity,
            com.esyback.ecommerce.entity.Product.cleanCategory(category),
            inStock, options(option));
        PagedResponse<ProductListDto> response = productService.getProducts(page, size, sortBy, sortDir, filter);

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
            page, size, sortBy, sortDir, ProductFilter.byTitle(title));

        return ResponseEntity.ok(response);
    }

    /**
     * The store's categories as {@code [{name, count}]}, most products first —
     * the pills on the storefront's home page. Public, like the list itself.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<CategoryCount>> getCategories() {
        return ResponseEntity.ok(productService.getCategories());
    }

    /**
     * The variant axes the store's products offer, as {@code [{name, values}]}
     * — the option filters of a collection page. Named for one category when
     * {@code category} is given, otherwise for the whole store.
     */
    @GetMapping("/options")
    public ResponseEntity<List<OptionFacet>> getOptionFacets(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(productService.getOptionFacets(category));
    }

    /** A narrowed axis is one extra join, and a product has at most two axes. */
    private static final int MAX_OPTION_AXES = 4;
    private static final int MAX_OPTION_VALUES = 20;

    /**
     * {@code ["Size:M", "Size:L", "Glaze:Sand"]} as {Size → [M, L], Glaze →
     * [Sand]}. Malformed entries are skipped rather than refused: a filter link
     * is something a shopper shares and edits, and the list it opens is still
     * worth showing.
     */
    static Map<String, List<String>> options(List<String> raw) {
        Map<String, List<String>> out = new LinkedHashMap<>();
        if (raw == null) return out;
        for (String entry : raw) {
            if (entry == null) continue;
            int colon = entry.indexOf(':');
            if (colon <= 0) continue;
            String axis = entry.substring(0, colon).strip();
            String value = entry.substring(colon + 1).strip();
            if (axis.isEmpty() || value.isEmpty()) continue;
            String key = out.keySet().stream().filter(k -> k.equalsIgnoreCase(axis)).findFirst().orElse(null);
            if (key == null) {
                if (out.size() >= MAX_OPTION_AXES) continue;
                key = axis;
                out.put(key, new ArrayList<>());
            }
            List<String> values = out.get(key);
            if (values.size() < MAX_OPTION_VALUES && values.stream().noneMatch(value::equalsIgnoreCase)) {
                values.add(value);
            }
        }
        return out;
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

    // ---- Bulk import (decision D7) -----------------------------------------

    /**
     * Creates products from a CSV file.
     *
     * <p>{@code dryRun=true} reports what would happen and writes nothing, so
     * the screen can show the outcome before the merchant commits to it. A file
     * with bad rows comes back 200 with the problems listed rather than an
     * error status: the request was understood and nothing was written — it is
     * the file that needs an edit, and the screen has a list to render.
     */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> importCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "dryRun", defaultValue = "false") boolean dryRun) {
        if (file == null || file.isEmpty()) {
            throw new ApiRefusal(HttpStatus.BAD_REQUEST, ProductImportService.FILE_MISSING,
                "Choose a CSV file first");
        }
        String csv;
        try {
            csv = new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new ApiRefusal(HttpStatus.BAD_REQUEST, ProductImportService.FILE_UNREADABLE,
                "That file could not be read");
        }
        ProductImportService.Report report = productImportService.importCsv(csv, dryRun);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("parsed", report.parsed());
        body.put("imported", report.imported());
        body.put("dryRun", report.dryRun());
        body.put("ok", report.ok());
        // `code` and `value` are what a screen translates; `message` is the
        // same problem in English, for anything that only prints it.
        body.put("errors", report.errors().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("line", e.line());
            m.put("column", e.column());
            m.put("code", e.code());
            m.put("value", e.value());
            m.put("message", e.message());
            return m;
        }).toList());
        // The first rows as read, so the screen can show what the file holds
        // before anything is written. LinkedHashMap: a blank category is null.
        body.put("rows", report.rows().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("line", r.line());
            m.put("title", r.title());
            m.put("category", r.category());
            m.put("price", r.price());
            m.put("quantity", r.quantity());
            return m;
        }).toList());
        return ResponseEntity.ok(body);
    }

    /** The column layout, as a file to open in a spreadsheet and fill in. */
    @GetMapping("/import/template")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<byte[]> importTemplate() {
        byte[] bytes = ProductImportService.template().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=\"esy-products-template.csv\"")
            .contentType(MediaType.parseMediaType("text/csv; charset=utf-8"))
            .body(bytes);
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

    // No local ResponseStatusException handler: ApiErrorAdvice writes the same
    // {error} plus message, status and, for an ApiRefusal, its code and details.
    // The copy that sat here won over the advice and dropped the code, so the
    // import's file-level refusals reached the screen only as English prose.

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