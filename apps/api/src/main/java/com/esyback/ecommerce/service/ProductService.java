package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CategoryCount;
import com.esyback.ecommerce.dto.OptionFacet;
import com.esyback.ecommerce.dto.PagedResponse;
import com.esyback.ecommerce.dto.ProductDto;
import com.esyback.ecommerce.dto.ProductFilter;
import com.esyback.ecommerce.dto.ProductImageDto;
import com.esyback.ecommerce.dto.ProductListDto;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductOption;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductImageRepository;
import com.esyback.ecommerce.repository.ProductOptionRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.ProductSpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final TenantContextService tenantContextService;
    private final com.esyback.ecommerce.repository.ProductVariantRepository variantRepository;
    private final ProductVariantService productVariantService;
    private final ProductOptionRepository optionRepository;
    
    /**
     * Commit stock for a paid order (decision D3): quantities decrement at PAID,
     * not at PLACED, so abandoned checkouts never lock inventory. Clamped at
     * zero; an oversell (two shoppers paying for the last unit before either
     * callback lands) logs loudly instead of going negative — there is no BOG
     * refund API integration yet, so automated refund-on-oversell is not
     * possible and the store resolves it manually from the orders screen.
     */
    /**
     * The entity itself, scoped to the store the request resolved to. The
     * variant endpoints need the Product rather than a DTO, and going through
     * the tenant keeps one store from reaching another's rows by id.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public java.util.Optional<Product> findEntity(Long id) {
        Tenant tenant = tenantContextService.getCurrentTenant();
        return productRepository.findById(id)
            .filter(p -> p.getTenant() != null && p.getTenant().getId().equals(tenant.getId()));
    }

    public void commitStock(com.esyback.ecommerce.entity.Order order) {
        for (com.esyback.ecommerce.entity.OrderItem item : order.getItems()) {
            if (item.getProductId() == null) continue;
            productRepository.findById(item.getProductId()).ifPresent(p -> {
                int take = item.getQuantity() == null ? 1 : item.getQuantity();

                // With variants, stock lives on the combination (D11). Taking
                // it off the product instead would decrement a cached sum and
                // leave the row the shopper actually bought untouched — the
                // size would stay "in stock" forever.
                if (p.variantsEnabled() && item.getVariantId() != null) {
                    variantRepository.findByIdAndProduct(item.getVariantId(), p).ifPresent(v -> {
                        int have = v.getQuantity() == null ? 0 : v.getQuantity();
                        if (take > have) {
                            org.slf4j.LoggerFactory.getLogger(ProductService.class).warn(
                                "OVERSELL order={} product={} variant={} wanted={} had={} — floored at 0, resolve manually",
                                order.getOrderNumber(), p.getId(), v.getId(), take, have);
                        }
                        v.setQuantity(Math.max(0, have - take));
                        variantRepository.save(v);
                    });
                    // Keep the product's cached total honest against its rows.
                    productVariantService.syncStock(p);
                    return;
                }

                int have = p.getQuantity() == null ? 0 : p.getQuantity();
                if (take > have) {
                    org.slf4j.LoggerFactory.getLogger(ProductService.class).warn(
                        "OVERSELL order={} product={} wanted={} had={} — stock floored at 0, resolve manually",
                        order.getOrderNumber(), p.getId(), take, have);
                }
                p.setQuantity(Math.max(0, have - take));
                productRepository.save(p);
            });
        }
    }

    public PagedResponse<ProductListDto> getProducts(int page, int size, String sortBy, String sortDir,
                                                     ProductFilter filter) {

        Tenant currentTenant = tenantContextService.getCurrentTenant();
        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sort = Sort.by(direction, sortBy);
        // Ties broken by id, so products of one price keep one order from page
        // to page; without it the database may shuffle them between requests
        // and a shopper scrolling sees one twice and another never.
        if (!"id".equals(sortBy)) sort = sort.and(Sort.by(direction, "id"));

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Product> productPage = productRepository.findAll(ProductSpecs.matching(currentTenant, filter), pageable);
        return new PagedResponse<>(productPage.map(this::convertToProductListDto));
    }

    /** The store's categories, most products first — the storefront's pills. */
    @Transactional(readOnly = true)
    public List<CategoryCount> getCategories() {
        return productRepository.countCategories(tenantContextService.getCurrentTenant());
    }

    /** How many of each store's product photos a card in the store directory shows. */
    public static final int DIRECTORY_PHOTOS = 3;

    /**
     * The photos of each store's newest photographed products, at most
     * {@link #DIRECTORY_PHOTOS} a store and newest first, by store id: the row
     * on the store directory's cards (GET /api/tenant). A store with no
     * photographed product has no entry. Not scoped to the request's store: the
     * directory is the platform's own page and lists every store, in one query.
     */
    @Transactional(readOnly = true)
    public Map<Long, List<String>> directoryPhotos(Collection<Long> tenantIds) {
        Map<Long, List<String>> photos = new LinkedHashMap<>();
        if (tenantIds == null || tenantIds.isEmpty()) return photos;
        for (Object[] row : productRepository.findPreviewImages(tenantIds, DIRECTORY_PHOTOS)) {
            photos.computeIfAbsent(((Number) row[0]).longValue(), k -> new ArrayList<>()).add((String) row[1]);
        }
        return photos;
    }

    /**
     * The variant axes the store's products offer — of one category when one is
     * named — as filters: one facet per axis name, with every value any product
     * offers on it.
     *
     * <p>Names are compared ignoring case and the first spelling met is the one
     * shown, as are values. Facets that more products carry come first; ties
     * keep the order the products were created in, and values keep each
     * merchant's own order, with values first met on later products appended.
     */
    @Transactional(readOnly = true)
    public List<OptionFacet> getOptionFacets(String category) {
        Tenant tenant = tenantContextService.getCurrentTenant();
        String cat = Product.cleanCategory(category);
        List<ProductOption> axes = cat == null
            ? optionRepository.findAxesInStore(tenant)
            : optionRepository.findAxesInCategory(tenant, cat);

        Map<String, String> names = new LinkedHashMap<>();
        Map<String, Map<String, String>> values = new LinkedHashMap<>();
        Map<String, Set<Long>> products = new LinkedHashMap<>();
        for (ProductOption axis : axes) {
            String name = axis.getName() == null ? "" : axis.getName().strip();
            if (name.isEmpty()) continue;
            String key = name.toLowerCase(Locale.ROOT);
            names.putIfAbsent(key, name);
            products.computeIfAbsent(key, k -> new HashSet<>()).add(axis.getProduct().getId());
            Map<String, String> seen = values.computeIfAbsent(key, k -> new LinkedHashMap<>());
            for (String v : ProductVariantService.splitValues(axis.getValuesText())) {
                if (seen.size() >= MAX_FACET_VALUES) break;
                seen.putIfAbsent(v.toLowerCase(Locale.ROOT), v);
            }
        }

        List<String> order = new ArrayList<>(names.keySet());
        // A stable sort, so equal counts keep first-seen order.
        order.sort(Comparator.comparingInt((String k) -> products.get(k).size()).reversed());
        return order.stream()
            .map(k -> new OptionFacet(names.get(k), List.copyOf(values.get(k).values())))
            .toList();
    }

    /** A filter row nobody can scan is no filter; real axes hold at most 40. */
    private static final int MAX_FACET_VALUES = 60;

    /**
     * A category from the editor, made storable — or refused, when it is longer
     * than the column. Refused rather than cut: a silently shortened name would
     * open a collection the merchant never named.
     */
    private static String category(String raw) {
        String clean = Product.cleanCategory(raw);
        if (clean != null && clean.length() > Product.CATEGORY_MAX) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Category is longer than " + Product.CATEGORY_MAX + " characters");
        }
        return clean;
    }
    
    public Optional<ProductDto> getProductById(Long id) {
        Tenant currentTenant = tenantContextService.getCurrentTenant();
        return productRepository.findById(id)
            .filter(product -> product.getTenant().equals(currentTenant))
            .map(this::convertToProductDto);
    }
    
    public ProductDto createProduct(ProductDto productDto) {
        Tenant currentTenant = tenantContextService.getCurrentTenant();
        Product product = new Product();
        product.setTitle(productDto.getTitle());
        product.setDescription(productDto.getDescription());
        // imageUrl is no longer user-set: it's the primary-thumbnail pointer
        // managed by ProductImageService (set on first upload, repointed on
        // delete). Legacy seeded products keep their existing imageUrl.
        product.setPrice(productDto.getPrice());
        product.setQuantity(productDto.getQuantity());
        product.setCategory(category(productDto.getCategory()));
        product.setTenant(currentTenant);

        Product savedProduct = productRepository.save(product);
        return convertToProductDto(savedProduct);
    }
    
    public Optional<ProductDto> updateProduct(Long id, ProductDto productDto) {
        Tenant currentTenant = tenantContextService.getCurrentTenant();
        return productRepository.findById(id)
            .filter(product -> product.getTenant().equals(currentTenant))
            .map(existingProduct -> {
                existingProduct.setTitle(productDto.getTitle());
                existingProduct.setDescription(productDto.getDescription());
                // imageUrl intentionally untouched — managed by image upload/delete.
                existingProduct.setPrice(productDto.getPrice());
                existingProduct.setQuantity(productDto.getQuantity());
                // Absent means untouched and blank means cleared. A client that
                // predates categories sends no field at all, and a save from it
                // must not quietly take every product out of its collection.
                if (productDto.getCategory() != null) {
                    existingProduct.setCategory(category(productDto.getCategory()));
                }

                Product updatedProduct = productRepository.save(existingProduct);
                return convertToProductDto(updatedProduct);
            });
    }
    
    public boolean deleteProduct(Long id) {
        Tenant currentTenant = tenantContextService.getCurrentTenant();
        return productRepository.findById(id)
            .filter(product -> product.getTenant().equals(currentTenant))
            .map(product -> {
                productRepository.delete(product);
                return true;
            })
            .orElse(false);
    }
    
    private ProductListDto convertToProductListDto(Product product) {
        ProductListDto dto = new ProductListDto(
            product.getId(),
            product.getTitle(),
            product.getImageUrl(),
            product.getPrice(),
            product.getQuantity()
        );
        dto.setHasVariants(product.variantsEnabled());
        dto.setBlurb(blurbOf(product.getDescription()));
        dto.setCreatedAt(product.getCreatedAt());
        dto.setCategory(product.getCategory());
        return dto;
    }

    /**
     * The card's one-line excerpt. Cut at a word boundary so it reads as a
     * phrase rather than a string truncated mid-word, and taken from the first
     * line only — a description's opening line is the merchant's own summary,
     * whereas prose from further down arrives without its context.
     */
    private static String blurbOf(String description) {
        if (description == null) return null;
        String first = description.strip().split("\\r?\\n", 2)[0].strip();
        if (first.isEmpty()) return null;
        if (first.length() <= 70) return first;
        int cut = first.lastIndexOf(' ', 70);
        return (cut > 30 ? first.substring(0, cut) : first.substring(0, 70)).strip() + "…";
    }
    
    private ProductDto convertToProductDto(Product product) {
        ProductDto dto = new ProductDto(product);
        List<ProductImageDto> images = productImageRepository
            .findMetaByProductId(product.getId()).stream()
            .map(m -> new ProductImageDto(
                m.getId(),
                ProductImageService.imageUrl(product.getId(), m.getId()),
                m.getPosition()))
            .collect(Collectors.toList());
        dto.setImages(images);
        return dto;
    }
}
