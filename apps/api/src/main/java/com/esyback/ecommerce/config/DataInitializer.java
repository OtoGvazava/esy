package com.esyback.ecommerce.config;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    
    private final RoleRepository roleRepository;
    private final ProductRepository productRepository;
    private final TenantRepository tenantRepository;
    
    @Override
    public void run(String... args) throws Exception {
        initializeTenants();
        initializeRoles();
        initializeSampleProducts();
    }
    
    private void initializeTenants() {
        if (!tenantRepository.existsBySubdomain("main")) {
            Tenant mainTenant = new Tenant();
            mainTenant.setName("Main Store");
            mainTenant.setSubdomain("main");
            mainTenant.setDisplayName("Main Ecommerce Store");
            mainTenant.setDescription("The main ecommerce store");
            mainTenant.setPrimaryColor("#007bff");
            mainTenant.setSecondaryColor("#6c757d");
            mainTenant.setIsActive(true);
            tenantRepository.save(mainTenant);
        }
        
        if (!tenantRepository.existsBySubdomain("electronics")) {
            Tenant electronicsTenant = new Tenant();
            electronicsTenant.setName("Electronics Store");
            electronicsTenant.setSubdomain("electronics");
            electronicsTenant.setDisplayName("Electronics & Gadgets");
            electronicsTenant.setDescription("Specialized electronics and gadgets store");
            electronicsTenant.setPrimaryColor("#28a745");
            electronicsTenant.setSecondaryColor("#17a2b8");
            electronicsTenant.setIsActive(true);
            tenantRepository.save(electronicsTenant);
        }
        
        if (!tenantRepository.existsBySubdomain("fashion")) {
            Tenant fashionTenant = new Tenant();
            fashionTenant.setName("Fashion Store");
            fashionTenant.setSubdomain("fashion");
            fashionTenant.setDisplayName("Fashion & Style");
            fashionTenant.setDescription("Latest fashion trends and clothing");
            fashionTenant.setPrimaryColor("#dc3545");
            fashionTenant.setSecondaryColor("#fd7e14");
            fashionTenant.setIsActive(true);
            tenantRepository.save(fashionTenant);
        }
    }
    
    private void initializeRoles() {
        if (!roleRepository.existsByName("USER")) {
            Role userRole = new Role();
            userRole.setName("USER");
            userRole.setDescription("Regular user role");
            roleRepository.save(userRole);
        }
        
        if (!roleRepository.existsByName("ADMIN")) {
            Role adminRole = new Role();
            adminRole.setName("ADMIN");
            adminRole.setDescription("Administrator role");
            roleRepository.save(adminRole);
        }
    }
    
    private void initializeSampleProducts() {
        if (productRepository.count() == 0) {
            // Get tenants
            Tenant mainTenant = tenantRepository.findBySubdomain("main").orElse(null);
            Tenant electronicsTenant = tenantRepository.findBySubdomain("electronics").orElse(null);
            Tenant fashionTenant = tenantRepository.findBySubdomain("fashion").orElse(null);
            
            // Electronics products for electronics tenant
            if (electronicsTenant != null) {
                Product product1 = new Product();
                product1.setTitle("iPhone 15 Pro");
                product1.setDescription("Latest iPhone with advanced camera system and A17 Pro chip");
                product1.setImageUrl("https://example.com/iphone15pro.jpg");
                product1.setPrice(new BigDecimal("999.99"));
                product1.setQuantity(50);
                product1.setTenant(electronicsTenant);
                productRepository.save(product1);
                
                Product product2 = new Product();
                product2.setTitle("Samsung Galaxy S24");
                product2.setDescription("Premium Android smartphone with AI features");
                product2.setImageUrl("https://example.com/galaxy-s24.jpg");
                product2.setPrice(new BigDecimal("899.99"));
                product2.setQuantity(30);
                product2.setTenant(electronicsTenant);
                productRepository.save(product2);
            }
            
            // Fashion products for fashion tenant
            if (fashionTenant != null) {
                Product product3 = new Product();
                product3.setTitle("Designer Jeans");
                product3.setDescription("Premium quality designer jeans");
                product3.setImageUrl("https://example.com/jeans.jpg");
                product3.setPrice(new BigDecimal("199.99"));
                product3.setQuantity(100);
                product3.setTenant(fashionTenant);
                productRepository.save(product3);
                
                Product product4 = new Product();
                product4.setTitle("Summer Dress");
                product4.setDescription("Elegant summer dress for any occasion");
                product4.setImageUrl("https://example.com/dress.jpg");
                product4.setPrice(new BigDecimal("149.99"));
                product4.setQuantity(75);
                product4.setTenant(fashionTenant);
                productRepository.save(product4);
            }
            
            // General products for main tenant
            if (mainTenant != null) {
                Product product5 = new Product();
                product5.setTitle("MacBook Pro 16-inch");
                product5.setDescription("Professional laptop with M3 Pro chip");
                product5.setImageUrl("https://example.com/macbook-pro.jpg");
                product5.setPrice(new BigDecimal("2499.99"));
                product5.setQuantity(20);
                product5.setTenant(mainTenant);
                productRepository.save(product5);
                
                Product product6 = new Product();
                product6.setTitle("AirPods Pro");
                product6.setDescription("Wireless earbuds with active noise cancellation");
                product6.setImageUrl("https://example.com/airpods-pro.jpg");
                product6.setPrice(new BigDecimal("249.99"));
                product6.setQuantity(100);
                product6.setTenant(mainTenant);
                productRepository.save(product6);
            }
        }
    }
}
