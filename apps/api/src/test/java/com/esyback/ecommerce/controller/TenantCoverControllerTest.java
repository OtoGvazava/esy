package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.config.DesignProperties;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantCoverRepository;
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
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The store cover photo endpoints, over HTTP (store design plan, Phase 1):
 * {@code POST} and {@code DELETE /api/tenant/cover} (owner only), the public
 * {@code GET /api/tenant/cover/{id}}, and {@code coverUrl} on
 * {@code GET /api/tenant/current}.
 *
 * <p>Real requests through the real chain, as in
 * {@link TenantDesignControllerTest}: a signed JWT, the Host header choosing
 * the store, {@code PhoneRequiredFilter} and the {@code @storeAccess} gate.
 * Only the design switch is mocked, because {@code /current} reads it from the
 * Redis config store.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TenantCoverControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired TenantRepository tenantRepository;
    @Autowired TenantCoverRepository coverRepository;
    @Autowired ProductRepository productRepository;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired MembershipService membershipService;
    @Autowired EntityManager entityManager;
    @Autowired ObjectMapper objectMapper;

    @MockBean DesignProperties designProperties;

    private static final String SUB = "cover-test-store";
    private static final String STORE = SUB + ".lvh.me";
    private static final String OTHER_SUB = "cover-other-store";
    private static final String OTHER = OTHER_SUB + ".lvh.me";

    private static final String OWNER = "owner-cover@esy.test";
    private static final String MANAGER = "manager-cover@esy.test";
    private static final String SHOPPER = "shopper-cover@esy.test";

    private static final String COVER = "/api/tenant/cover";

    // Enough of each format's signature for ImageUpload to sniff it.
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 5, 6, 7, 8};

    private Tenant tenant;

    @BeforeEach
    void setUp() {
        when(designProperties.isEnabled()).thenReturn(true);
        tenant = store(SUB, "Cover Test Store");
        store(OTHER_SUB, "Cover Other Store");
        membershipService.ensure(account(OWNER), tenant, StoreMembership.Role.OWNER);
        membershipService.ensure(account(MANAGER), tenant, StoreMembership.Role.MANAGER);
        membershipService.ensure(account(SHOPPER), tenant, StoreMembership.Role.CUSTOMER);
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

    private MockHttpServletRequestBuilder as(String email, MockHttpServletRequestBuilder request) {
        return request.header("Host", STORE).header("Authorization", "Bearer " + jwtUtil.generateToken(email));
    }

    private static MockMultipartFile file(String name, String type, byte[] bytes) {
        return new MockMultipartFile("file", name, type, bytes);
    }

    private ResultActions upload(String email, MockMultipartFile file) throws Exception {
        return mvc.perform(as(email, multipart(COVER).file(file)));
    }

    /** The cover URL the owner's upload answers with. */
    private String uploadAsOwner(MockMultipartFile file) throws Exception {
        String body = upload(OWNER, file)
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        assertThat(json.path("subdomain").asText()).isEqualTo(SUB);
        return json.path("coverUrl").asText();
    }

    /** What a shopper's browser loads on every page: GET /api/tenant/current on that host. */
    private ResultActions current(String host) throws Exception {
        return mvc.perform(get("/api/tenant/current").header("Host", host)).andExpect(status().isOk());
    }

    /** The rows as the database has them, not as this persistence context remembers them. */
    private List<Long> storedCoverIds() {
        entityManager.flush();
        entityManager.clear();
        return coverRepository.findIdsByTenantId(tenant.getId());
    }

    @Test
    @DisplayName("a store without a cover says so: coverUrl is null on /current")
    void noCoverYet() throws Exception {
        current(STORE).andExpect(jsonPath("$.coverUrl").value(nullValue()));
        assertThat(storedCoverIds()).isEmpty();
    }

    @Test
    @DisplayName("the owner uploads a cover; the storefront finds it on /current and anyone can load it, long-cached")
    void uploadAndServe() throws Exception {
        String url = uploadAsOwner(file("cover.png", "image/png", PNG));
        assertThat(url).startsWith(COVER + "/");

        current(STORE).andExpect(jsonPath("$.coverUrl").value(url));
        // Another store has its own (none).
        current(OTHER).andExpect(jsonPath("$.coverUrl").value(nullValue()));

        // Public: no Authorization header, and the type comes from the bytes.
        String id = url.substring(url.lastIndexOf('/') + 1);
        mvc.perform(get(url).header("Host", STORE))
            .andExpect(status().isOk())
            .andExpect(content().contentType("image/png"))
            .andExpect(content().bytes(PNG))
            .andExpect(header().string("Cache-Control", containsString("max-age=31536000")))
            .andExpect(header().string("Cache-Control", containsString("public")))
            .andExpect(header().string("ETag", "\"" + id + "\""));

        // The id never changes meaning, so a cached copy is always current.
        mvc.perform(get(url).header("Host", STORE).header("If-None-Match", "\"" + id + "\""))
            .andExpect(status().isNotModified());

        // The cover is its own asset: the logo is untouched.
        current(STORE).andExpect(jsonPath("$.logoUrl").value(nullValue()));
        assertThat(storedCoverIds()).hasSize(1);
    }

    @Test
    @DisplayName("a re-upload replaces the cover under a new id; the old URL stops answering")
    void reuploadReplaces() throws Exception {
        String first = uploadAsOwner(file("cover.png", "image/png", PNG));
        // Sniffed, not trusted: JPEG bytes declared as PNG are served as JPEG.
        String second = uploadAsOwner(file("cover.png", "image/png", JPEG));
        assertThat(second).isNotEqualTo(first);

        mvc.perform(get(first).header("Host", STORE)).andExpect(status().isNotFound());
        mvc.perform(get(second).header("Host", STORE))
            .andExpect(status().isOk())
            .andExpect(content().contentType("image/jpeg"));
        current(STORE).andExpect(jsonPath("$.coverUrl").value(second));

        List<Long> ids = storedCoverIds();
        assertThat(ids).hasSize(1);
        assertThat(second).endsWith("/" + ids.get(0));
    }

    @Test
    @DisplayName("the owner removes the cover; removing it again is not an error")
    void removeTheCover() throws Exception {
        String url = uploadAsOwner(file("cover.png", "image/png", PNG));

        mvc.perform(as(OWNER, delete(COVER)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.subdomain").value(SUB))
            .andExpect(jsonPath("$.coverUrl").value(nullValue()));
        current(STORE).andExpect(jsonPath("$.coverUrl").value(nullValue()));
        mvc.perform(get(url).header("Host", STORE)).andExpect(status().isNotFound());
        assertThat(storedCoverIds()).isEmpty();

        mvc.perform(as(OWNER, delete(COVER))).andExpect(status().isOk());
    }

    @Test
    @DisplayName("a manager and a shopper get 403, as on the logo; signed out is refused too")
    void onlyTheOwner() throws Exception {
        for (String who : List.of(MANAGER, SHOPPER)) {
            upload(who, file("cover.png", "image/png", PNG)).andExpect(status().isForbidden());
            mvc.perform(as(who, delete(COVER))).andExpect(status().isForbidden());
        }
        mvc.perform(multipart(COVER).file(file("cover.png", "image/png", PNG)).header("Host", STORE))
            .andExpect(result -> assertThat(result.getResponse().getStatus()).isGreaterThanOrEqualTo(300));
        assertThat(storedCoverIds()).isEmpty();

        // An owner's cover cannot be removed by the others either.
        uploadAsOwner(file("cover.png", "image/png", PNG));
        mvc.perform(as(MANAGER, delete(COVER))).andExpect(status().isForbidden());
        assertThat(storedCoverIds()).hasSize(1);
    }

    @Test
    @DisplayName("the logo's validation: an empty file is a 400, a file that is not an image a 415")
    void badUploads() throws Exception {
        upload(OWNER, file("cover.png", "image/png", new byte[0])).andExpect(status().isBadRequest());
        upload(OWNER, file("notes.txt", "text/plain", "not a photo".getBytes()))
            .andExpect(status().isUnsupportedMediaType());
        assertThat(storedCoverIds()).isEmpty();

        mvc.perform(get(COVER + "/987654321").header("Host", STORE)).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("product list rows carry createdAt, which the storefront's \"New\" badge reads")
    void productRowsCarryTheirDate() throws Exception {
        Product p = new Product();
        p.setTitle("Cover Test Mug");
        p.setPrice(new BigDecimal("38.00"));
        p.setQuantity(3);
        p.setTenant(tenant);
        productRepository.save(p);
        entityManager.flush();

        String body = mvc.perform(get("/api/products").header("Host", STORE))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].title").value("Cover Test Mug"))
            .andExpect(jsonPath("$.content[0].createdAt").value(startsWith(String.valueOf(LocalDateTime.now().getYear()))))
            .andReturn().getResponse().getContentAsString();
        // An ISO local date-time, as the web parses it.
        String createdAt = objectMapper.readTree(body).path("content").get(0).path("createdAt").asText();
        assertThat(LocalDateTime.parse(createdAt)).isBeforeOrEqualTo(LocalDateTime.now());
    }
}
