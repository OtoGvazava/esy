package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.PagedResponse;
import com.esyback.ecommerce.dto.ProductDto;
import com.esyback.ecommerce.dto.ProductListDto;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
public class ProductService {
    
    private final ProductRepository productRepository;
    private final TenantContextService tenantContextService;
    
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
        product.setImageUrl(productDto.getImageUrl());
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
                existingProduct.setImageUrl(productDto.getImageUrl());
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
            product.getPrice()
        );
    }
    
    private ProductDto convertToProductDto(Product product) {
        return new ProductDto(product);
    }
}
