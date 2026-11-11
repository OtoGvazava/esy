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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The store directory's photo row: {@code productPhotos} on each store that
 * {@code GET /api/tenant} lists (the platform's own page, so it is asked on the
 * platform's host), and the uploaded product photos it points at, which load
 * on that host and on the back office's as well as on the store's own.
 *
 * <p>Real requests through the real chain, as in
 * {@link TenantCoverControllerTest}: the Host header choosing the store and a
 * signed JWT for the owner's upload.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StoreDirectoryTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired TenantRepository tenantRepository;
    @Autowired ProductRepository productRepository;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired MembershipService membershipService;
    @Autowired EntityManager entityManager;
    @Autowired ObjectMapper objectMapper;

    private static final String PLATFORM = "lvh.me";
    private static final String OFFICE = "manager.lvh.me";

    private static final String SUB = "directory-photos";
    private static final String STORE = SUB + ".lvh.me";
    private static final String ONE_SUB = "directory-one-photo";
    private static final String NONE_SUB = "directory-no-photos";

    private static final String OWNER = "owner-directory@esy.test";

    // Enough of a JPEG's signature for ImageUpload to sniff it.
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 5, 6, 7, 8};

    private Tenant shop;
    private Tenant one;
    private Tenant none;

    @BeforeEach
    void setUp() {
        shop = store(SUB, "Directory Photos");
        one = store(ONE_SUB, "Directory One Photo");
        none = store(NONE_SUB, "Directory No Photos");
        membershipService.ensure(account(OWNER), shop, StoreMembership.Role.OWNER);
    }

    private Tenant store(String subdomain, String name) {
        return tenantRepository.findBySubdomain(subdomain).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName(name);
            t.setSubdomain(subdomain);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
    }

    /** A signed-up account: phone verified, so its writes get past PhoneRequiredFilter. */
    private User account(String email) {
        return userRepository.findByUsername(email).orElseGet(() -> {
            User u = new User();
            u.setUsername(email);
            u.setEmail(email);
            u.setIsActive(true);
            u.setPhoneVerified(true);
            // The JWT filter loads the account with a JOIN FETCH on roles.
            u.addRole(roleRepository.findByName("USER").orElseThrow());
            return userRepository.save(u);
        });
    }

    private Product product(Tenant tenant, String title, String imageUrl) {
        Product p = new Product();
        p.setTitle(title);
        p.setPrice(new BigDecimal("20.00"));
        p.setQuantity(5);
        p.setImageUrl(imageUrl);
        p.setTenant(tenant);
        return productRepository.save(p);
    }

    /** The directory as the platform's page asks for it, by subdomain. */
    private JsonNode directoryEntry(String subdomain) throws Exception {
        entityManager.flush();
        String body = mvc.perform(get("/api/tenant").header("Host", PLATFORM))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        for (JsonNode store : objectMapper.readTree(body)) {
            if (subdomain.equals(store.path("subdomain").asText())) return store;
        }
        throw new AssertionError(subdomain + " is not in the directory");
    }

    private static List<String> photos(JsonNode store) {
        List<String> out = new ArrayList<>();
        store.path("productPhotos").forEach(n -> out.add(n.asText()));
        return out;
    }

    @Test
    @DisplayName("each store carries the photos of its three newest photographed products, newest first")
    void newestThreePhotosPerStore() throws Exception {
        product(shop, "Oldest", "https://img.test/oldest.jpg");
        product(shop, "No photo", null);
        product(shop, "Second", "https://img.test/second.jpg");
        product(shop, "Blank photo", "   ");
        product(shop, "Third", "https://img.test/third.jpg");
        product(shop, "Newest", "https://img.test/newest.jpg");
        product(one, "Only one", "https://img.test/one.jpg");
        product(none, "Plain", null);

        assertThat(photos(directoryEntry(SUB)))
            .containsExactly("https://img.test/newest.jpg", "https://img.test/third.jpg", "https://img.test/second.jpg");
        // Another store has its own, however few.
        assertThat(photos(directoryEntry(ONE_SUB))).containsExactly("https://img.test/one.jpg");
        // A store without a photographed product has an empty row, not a missing field.
        JsonNode plain = directoryEntry(NONE_SUB);
        assertThat(plain.has("productPhotos")).isTrue();
        assertThat(photos(plain)).isEmpty();
    }

    @Test
    @DisplayName("an uploaded product photo loads on the platform's and the back office's hosts too, and only under its own product")
    void uploadedPhotoLoadsOnEveryHost() throws Exception {
        Product mug = product(shop, "Mug", null);
        Product other = product(shop, "Other", null);
        entityManager.flush();

        String body = mvc.perform(multipart("/api/products/" + mug.getId() + "/images")
                .file(new MockMultipartFile("files", "mug.jpg", "image/jpeg", JPEG))
                .header("Host", STORE)
                .header("Authorization", "Bearer " + jwtUtil.generateToken(OWNER)))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        String url = objectMapper.readTree(body).path("imageUrl").asText();
        assertThat(url).startsWith("/api/products/" + mug.getId() + "/images/");

        // The directory names it, and it loads wherever it is drawn.
        assertThat(photos(directoryEntry(SUB))).containsExactly(url);
        for (String host : List.of(STORE, PLATFORM, OFFICE)) {
            mvc.perform(get(url).header("Host", host))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"))
                .andExpect(content().bytes(JPEG));
        }

        // The image must belong to the product named in the path.
        String imageId = url.substring(url.lastIndexOf('/') + 1);
        mvc.perform(get("/api/products/" + other.getId() + "/images/" + imageId).header("Host", PLATFORM))
            .andExpect(status().isNotFound());
    }
}
