package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.PagedResponse;
import com.esyback.ecommerce.dto.ProductDto;
import com.esyback.ecommerce.dto.ProductImageDto;
import com.esyback.ecommerce.dto.ProductListDto;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductImageRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
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
                                                     String title, BigDecimal minPrice, BigDecimal maxPrice, Integer quantity) {
        
        Tenant currentTenant = tenantContextService.getCurrentTenant();
        Sort sort = sortDir.equalsIgnoreCase("desc") ? 
            Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<Product> productPage;
        
        if (title != null || minPrice != null || maxPrice != null || quantity != null) {
            productPage = productRepository.findProductsWithFilters(currentTenant, title, minPrice, maxPrice, quantity, pageable);
        } else {
            productPage = productRepository.findByTenant(currentTenant, pageable);
        }
        
        return new PagedResponse<>(productPage.map(this::convertToProductListDto));
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
        return new ProductListDto(
            product.getId(),
            product.getTitle(),
            product.getImageUrl(),
            product.getPrice(),
            product.getQuantity()
        );
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
