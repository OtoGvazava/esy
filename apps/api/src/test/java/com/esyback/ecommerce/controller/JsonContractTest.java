package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Order;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.jackson.autoconfigure.JacksonProperties;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The API's JSON is what the web app was built against. Spring Boot 4 serves
 * it with Jackson 3, whose defaults would sort fields alphabetically and
 * refuse request bodies Jackson 2 accepted. JacksonConfig sets
 * Jackson 2's behaviour back feature by feature, without Boot's transitional
 * spring.jackson.use-jackson2-defaults switch; this pins what the web app
 * relies on.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class JsonContractTest {

    @Autowired MockMvc mvc;
    @Autowired JsonMapper jsonMapper;
    @Autowired JacksonProperties jacksonProperties;
    @Autowired JwtUtil jwtUtil;
    @Autowired TenantRepository tenantRepository;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired ProductRepository productRepository;
    @Autowired MembershipService membershipService;

    private static final String SUB = "json-contract-store";
    private static final String STORE = SUB + ".lvh.me";
    private static final String OWNER = "owner-json@esy.test";

    @Test
    @DisplayName("the wire format does not lean on Boot's transitional Jackson 2 switch")
    void noJackson2Switch() {
        // The bound value, so any spelling Boot accepts (camelCase, an env var) counts.
        assertThat(jacksonProperties.isUseJackson2Defaults()).isFalse();
    }

    @Test
    @DisplayName("a page lists its fields in declared order, and each product carries hasVariants")
    void declaredOrderAndHasVariants() throws Exception {
        String body = mvc.perform(get("/api/products")).andReturn().getResponse().getContentAsString();
        // PagedResponse declares content first. Jackson 3's defaults put
        // "page" first (its constructor's parameter) and sort the rest.
        assertThat(body).startsWith("{\"content\":[{\"id\":");
        List<String> page = new ArrayList<>();
        jsonMapper.readTree(body).propertyNames().forEach(page::add);
        assertThat(page).containsExactly(
            "content", "page", "size", "totalElements", "totalPages", "first", "last", "hasNext", "hasPrevious");
        // Each row in ProductListDto's declared order. The storefront's
        // quick-add reads hasVariants to send a product sold in sizes to its page.
        List<String> keys = new ArrayList<>();
        jsonMapper.readTree(body).get("content").get(0).propertyNames().forEach(keys::add);
        assertThat(keys).containsExactly(
            "id", "title", "imageUrl", "price", "quantity", "hasVariants", "blurb", "createdAt", "category");
        assertThat(jsonMapper.readTree(body).get("content").get(0).get("hasVariants").isBoolean()).isTrue();
    }

    /** An enum whose toString() is not its name: the API must still use the name. */
    enum Shade {
        LIGHT;
        @Override public String toString() { return "a light shade"; }
    }

    @Test
    @DisplayName("enums are written and read by name, never toString()")
    void enumsByName() {
        assertThat(jsonMapper.writeValueAsString(Shade.LIGHT)).isEqualTo("\"LIGHT\"");
        assertThat(jsonMapper.readValue("\"LIGHT\"", Shade.class)).isEqualTo(Shade.LIGHT);
    }

    @Test
    @DisplayName("dates are ISO-8601 strings; a java.util.Date in UTC carries +00:00, as under Jackson 2")
    void dates() throws Exception {
        mvc.perform(get("/api/products"))
            .andExpect(jsonPath("$.content[0].createdAt")
                .value(org.hamcrest.Matchers.matchesPattern("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?$")));
        assertThat(jsonMapper.writeValueAsString(Order.Status.OUT_FOR_DELIVERY)).isEqualTo("\"OUT_FOR_DELIVERY\"");
        assertThat(jsonMapper.writeValueAsString(java.time.Instant.parse("2026-10-31T12:34:56.789Z")))
            .isEqualTo("\"2026-10-31T12:34:56.789Z\"");
        // WRITE_UTC_AS_OFFSET reaches java.util.Date / Calendar only.
        assertThat(jsonMapper.writeValueAsString(new java.util.Date(0)))
            .isEqualTo("\"1970-01-01T00:00:00.000+00:00\"");
    }

    @Test
    @DisplayName("a request body is read leniently: unknown properties, trailing content, the dates the web app sends")
    void lenientRequestBodies() throws Exception {
        Long id = ownedProduct();
        String base = "\"title\":\"Linen shirt\",\"price\":45.50,\"quantity\":7";
        for (String body : List.of(
                // The edit form sends back what it read, list-only fields included.
                "{" + base + ",\"hasVariants\":false,\"blurb\":\"x\",\"images\":[]}",
                // Content after the value is ignored, as it was under Jackson 2.
                "{" + base + "} {}",
                // Dates as the API writes them, and with a browser's Z.
                "{" + base + ",\"createdAt\":\"2026-11-20T10:15:30.123456\"}",
                "{" + base + ",\"createdAt\":\"2026-11-20T10:15:30.123Z\"}")) {
            mvc.perform(put("/api/products/" + id).header("Host", STORE)
                    .header("Authorization", "Bearer " + jwtUtil.generateToken(OWNER))
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Linen shirt"));
        }
    }

    /** Null for a primitive reads as its default; no request DTO has one today. */
    static class Primitive { public int count = 5; public boolean flag = true; }

    @Test
    @DisplayName("null for a primitive is its default, not a refusal")
    void nullForPrimitive() {
        Primitive p = jsonMapper.readValue("{\"count\":null,\"flag\":null}", Primitive.class);
        assertThat(p.count).isZero();
        assertThat(p.flag).isFalse();
    }

    private Long ownedProduct() {
        Tenant tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Json Contract Store");
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
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle("Linen shirt");
        p.setPrice(new BigDecimal("45.50"));
        p.setQuantity(7);
        return productRepository.save(p).getId();
    }
}
