package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.service.MembershipService;
import com.esyback.ecommerce.service.ProductVariantService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Categories and the collection filters over HTTP: the Host header choosing the
 * store, the public reads a storefront makes signed out, and the owner's
 * product writes and import through the real security chain.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProductCatalogControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired TenantRepository tenantRepository;
    @Autowired ProductRepository productRepository;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired MembershipService membershipService;
    @Autowired ProductVariantService variantService;
    @Autowired EntityManager entityManager;

    private static final String SUB = "catalog-http";
    private static final String STORE = SUB + ".lvh.me";
    private static final String OWNER = "owner-catalog@esy.test";

    private Tenant tenant;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Catalog Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        User owner = userRepository.findByUsername(OWNER).orElseGet(() -> {
            User u = new User();
            u.setUsername(OWNER);
            u.setEmail(OWNER);
            u.setIsActive(true);
            u.setPhoneVerified(true);
            u.addRole(roleRepository.findByName("USER").orElseThrow());
            return userRepository.save(u);
        });
        membershipService.ensure(owner, tenant, StoreMembership.Role.OWNER);
    }

    private Product product(String title, String category, String price, int quantity) {
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle(title);
        p.setCategory(category);
        p.setPrice(new BigDecimal(price));
        p.setQuantity(quantity);
        return productRepository.save(p);
    }

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken(OWNER);
    }

    @Test
    @DisplayName("a signed-out shopper filters by category, stock, price and option, sorted by price")
    void publicFilters() throws Exception {
        product("Tall vase", "Vases", "120.00", 2);
        product("Small vase", "vases", "48.00", 0);
        Product sized = product("Sized vase", "Vases", "60.00", 0);
        variantService.replace(sized, Map.of(
            "axes", List.of(Map.of("name", "Size", "values", List.of("S", "M"))),
            "rows", List.of(Map.of("key", List.of("M"), "stock", 1))));
        product("Mug", "Mugs", "38.00", 5);
        entityManager.flush();

        mvc.perform(get("/api/products").header("Host", STORE)
                .param("category", "VASES").param("sortBy", "price").param("sortDir", "asc"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(3))
            .andExpect(jsonPath("$.content[*].title").value(contains("Small vase", "Sized vase", "Tall vase")))
            .andExpect(jsonPath("$.content[0].category").value("vases"));

        mvc.perform(get("/api/products").header("Host", STORE)
                .param("category", "Vases").param("inStock", "true").param("maxPrice", "100"))
            .andExpect(jsonPath("$.content[*].title").value(contains("Sized vase")));

        mvc.perform(get("/api/products").header("Host", STORE)
                .param("category", "Vases").param("inStock", "true").param("option", "size:S"))
            .andExpect(jsonPath("$.content", hasSize(0)));
        mvc.perform(get("/api/products").header("Host", STORE)
                .param("option", "Size:S").param("option", "Size:M").param("option", "nonsense"))
            .andExpect(jsonPath("$.content[*].title").value(contains("Sized vase")));
    }

    @Test
    @DisplayName("categories and option facets are public reads for the store on the Host")
    void publicReads() throws Exception {
        product("Tall vase", "Vases", "120.00", 2);
        product("Small vase", "Vases", "48.00", 0);
        Product sized = product("Sized vase", "Vases", "60.00", 0);
        variantService.replace(sized, Map.of(
            "axes", List.of(Map.of("name", "Size", "values", List.of("S", "M")))));
        product("Mug", "Mugs", "38.00", 5);
        product("Loose", null, "10.00", 1);
        entityManager.flush();

        mvc.perform(get("/api/products/categories").header("Host", STORE))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].name").value("Vases"))
            .andExpect(jsonPath("$[0].count").value(3))
            .andExpect(jsonPath("$[1].name").value("Mugs"))
            .andExpect(jsonPath("$[1].count").value(1));

        mvc.perform(get("/api/products/options").header("Host", STORE).param("category", "Vases"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].name").value("Size"))
            .andExpect(jsonPath("$[0].values").value(contains("S", "M")));
        mvc.perform(get("/api/products/options").header("Host", STORE).param("category", "Mugs"))
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("the owner's create and update carry the category; an overlong one is a 400 with a reason")
    void ownerWrites() throws Exception {
        String created = mvc.perform(post("/api/products").header("Host", STORE).header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Vase\",\"price\":95,\"quantity\":3,\"category\":\"  Vases \"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.category").value("Vases"))
            .andReturn().getResponse().getContentAsString();
        String id = created.replaceAll("(?s).*\"id\":(\\d+).*", "$1");

        // No category in the body: the stored one stays.
        mvc.perform(put("/api/products/" + id).header("Host", STORE).header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Vase\",\"price\":95,\"quantity\":3}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.category").value("Vases"));
        mvc.perform(put("/api/products/" + id).header("Host", STORE).header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Vase\",\"price\":95,\"quantity\":3,\"category\":\"\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.category").value(nullValue()));

        mvc.perform(post("/api/products").header("Host", STORE).header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Vase\",\"price\":95,\"quantity\":3,\"category\":\"" + "x".repeat(61) + "\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Category is longer than 60 characters"));
    }

    @Test
    @DisplayName("a dry-run import answers with the rows as read and structured problems")
    void importReport() throws Exception {
        MockMultipartFile good = new MockMultipartFile("file", "products.csv", "text/csv",
            "title,price,quantity,category\nBlack mug,40,20,Mugs\nHoney jar,32.00,12,\n"
                .getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/products/import").file(good).param("dryRun", "true")
                .header("Host", STORE).header("Authorization", bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ok").value(true))
            .andExpect(jsonPath("$.parsed").value(2))
            .andExpect(jsonPath("$.rows", hasSize(2)))
            .andExpect(jsonPath("$.rows[0].line").value(2))
            .andExpect(jsonPath("$.rows[0].title").value("Black mug"))
            .andExpect(jsonPath("$.rows[0].category").value("Mugs"))
            .andExpect(jsonPath("$.rows[0].price").value(40.0))
            .andExpect(jsonPath("$.rows[0].quantity").value(20))
            .andExpect(jsonPath("$.rows[1].category").value(nullValue()));

        MockMultipartFile bad = new MockMultipartFile("file", "products.csv", "text/csv",
            "title,price,quantity\nMug,fifteen,4\n".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/products/import").file(bad).param("dryRun", "true")
                .header("Host", STORE).header("Authorization", bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ok").value(false))
            .andExpect(jsonPath("$.errors[0].line").value(2))
            .andExpect(jsonPath("$.errors[0].column").value("price"))
            .andExpect(jsonPath("$.errors[0].code").value("notNumber"))
            .andExpect(jsonPath("$.errors[0].value").value("fifteen"))
            .andExpect(jsonPath("$.errors[0].message").value("price \"fifteen\" is not a number"));

        assertThat(productRepository.countByTenant(tenant)).isZero();
    }

    @Test
    @DisplayName("a file the importer cannot read at all answers with a code and its values")
    void importFileRefusals() throws Exception {
        // These used to reach the screen as the English sentence alone: the
        // controller's own handler won over the shared advice and dropped the
        // code. Now they carry it, with the column or count the sentence names.
        MockMultipartFile noPrice = new MockMultipartFile("file", "products.csv", "text/csv",
            "title,quantity\nMug,4\n".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/products/import").file(noPrice).param("dryRun", "true")
                .header("Host", STORE).header("Authorization", bearer()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("IMPORT_NO_COLUMN"))
            .andExpect(jsonPath("$.details.column").value("price"))
            .andExpect(jsonPath("$.error").isString());

        MockMultipartFile empty = new MockMultipartFile("file", "products.csv", "text/csv", new byte[0]);
        mvc.perform(multipart("/api/products/import").file(empty)
                .header("Host", STORE).header("Authorization", bearer()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("IMPORT_NO_FILE"));
    }

    @Test
    @DisplayName("option parameters are read as axis:value, merged by axis, malformed ones skipped")
    void optionParsing() {
        assertThat(ProductController.options(List.of("Size:M", "size:L", "SIZE:m", "Glaze:", ":x", "bad",
                "Ratio:1:1", " Glaze : Sea ")))
            .containsExactly(
                Map.entry("Size", List.of("M", "L")),
                Map.entry("Ratio", List.of("1:1")),
                Map.entry("Glaze", List.of("Sea")));
        assertThat(ProductController.options(null)).isEmpty();
    }
}
