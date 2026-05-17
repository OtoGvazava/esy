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
        // Dev storefronts (reachable locally via ?tenant=<sub>).
        seedStore("main", "Main Store", "Main Ecommerce Store",
            "The main ecommerce store", null, "#007bff", "#6c757d");
        seedStore("electronics", "Electronics Store", "Electronics & Gadgets",
            "Specialized electronics and gadgets store", "electronics", "#28a745", "#17a2b8");
        seedStore("fashion", "Fashion Store", "Fashion & Style",
            "Latest fashion trends and clothing", "fashion", "#dc3545", "#fd7e14");

        // Directory seed — independent shops across categories so esy.ge/stores
        // is populated with real, varied tenants.
        seedStore("aurora", "Aurora Audio", "Aurora Audio",
            "Hand-tuned studio headphones from a workshop in Porto. Small-run, shipped worldwide.",
            "electronics", "#6366f1", "#a06ed8");
        seedStore("studio-form", "Studio Form", "Studio Form",
            "Hand-thrown stoneware from a small studio in Kyoto. Each piece signed.",
            "home", "#c95b30", "#e8a26b");
        seedStore("verde", "Verde Goods", "Verde Goods",
            "Cold-pressed olive oil and pantry essentials from family groves in Crete.",
            "food", "#3f8a4a", "#7fb96b");
        seedStore("maris", "Maris Apothecary", "Maris Apothecary",
            "Botanical skincare batched by hand on the Devon coast. Plastic-free packaging.",
            "home", "#0f766e", "#5eb3ab");
        seedStore("kura", "Kura Knives", "Kura Knives",
            "Forged carbon-steel kitchen knives. Hand-finished, lifetime sharpened.",
            "home", "#0d0d0d", "#737373");
        seedStore("lemon-press", "Lemon Press", "Lemon Press",
            "Cold-press juices, syrups, and shrubs out of a sunny Lisbon kitchen.",
            "food", "#f59e0b", "#fcd34d");
        seedStore("okra", "Okra & Co.", "Okra & Co.",
            "Slow-made linen clothing for everyday wear. Cut and sewn in Porto.",
            "fashion", "#a23b72", "#d77ba6");
        seedStore("noor-rugs", "Noor Rugs", "Noor Rugs",
            "Hand-knotted Berber rugs from women-led co-ops in the Atlas Mountains.",
            "home", "#7c3aed", "#a78bfa");
        seedStore("plana", "Plana Bicycles", "Plana Bicycles",
            "Custom steel frames built in a Tbilisi workshop. Made-to-measure, six-week lead.",
            "electronics", "#dc2626", "#f87171");
        seedStore("foglio", "Foglio Press", "Foglio Press",
            "Letterpress prints, postcards, and limited-edition art books. Pulled in Bologna.",
            "art", "#1e40af", "#7aa3f0");
        seedStore("salt-stoneware", "Salt Stoneware", "Salt Stoneware",
            "Coastal-glazed tableware thrown on a wheel in a Cornwall studio.",
            "home", "#0891b2", "#67e8f9");
        seedStore("meadow", "Meadow Studio", "Meadow Studio",
            "Original watercolours and risograph editions from a meadow-side studio in Wales.",
            "art", "#65a30d", "#bef264");
    }

    private void seedStore(String subdomain, String name, String displayName,
                           String description, String category,
                           String primaryColor, String secondaryColor) {
        if (tenantRepository.existsBySubdomain(subdomain)) {
            return;
        }
        Tenant t = new Tenant();
        t.setSubdomain(subdomain);
        t.setName(name);
        t.setDisplayName(displayName);
        t.setDescription(description);
        t.setCategory(category);
        t.setPrimaryColor(primaryColor);
        t.setSecondaryColor(secondaryColor);
        t.setIsActive(true);
        tenantRepository.save(t);
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
