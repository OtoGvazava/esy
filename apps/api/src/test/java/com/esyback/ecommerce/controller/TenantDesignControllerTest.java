package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.config.DesignProperties;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.service.MembershipService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The store design endpoints, over HTTP (store design plan, Phase 1).
 *
 * <p>Real requests through the real chain: a signed JWT, the Host header
 * choosing the store, {@code PhoneRequiredFilter}, and the
 * {@code @storeAccess} gate the branding edit uses. Only the kill switch is
 * mocked — it reads the Redis config store, which a test either does not have
 * or, worse, shares with the running docker stack.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TenantDesignControllerTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired TenantRepository tenantRepository;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired MembershipService membershipService;
    @Autowired EntityManager entityManager;

    @MockBean DesignProperties designProperties;

    private static final String SUB = "design-test-store";
    private static final String STORE = SUB + ".lvh.me";
    private static final String PLATFORM = "lvh.me";

    private static final String OWNER = "owner-design@esy.test";
    private static final String MANAGER = "manager-design@esy.test";
    private static final String SHOPPER = "shopper-design@esy.test";

    private static final String DESIGN = "/api/tenant/current/design";
    private static final String DRAFT = DESIGN + "/draft";
    private static final String PUBLISH = DESIGN + "/publish";

    private Tenant tenant;

    @BeforeEach
    void setUp() {
        when(designProperties.isEnabled()).thenReturn(true);
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Design Test Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            t.setPrimaryColor("#112233");
            t.setSecondaryColor("#445566");
            return tenantRepository.save(t);
        });
        membershipService.ensure(account(OWNER), tenant, StoreMembership.Role.OWNER);
        membershipService.ensure(account(MANAGER), tenant, StoreMembership.Role.MANAGER);
        membershipService.ensure(account(SHOPPER), tenant, StoreMembership.Role.CUSTOMER);
    }

    /** A signed-up account: phone verified, so its writes get past PhoneRequiredFilter. */
    private User account(String email) {
        return userRepository.findByUsername(email).orElseGet(() -> {
            User u = new User();
            u.setUsername(email);
            u.setEmail(email);
            u.setIsActive(true);
            u.setPhoneVerified(true);
            // The JWT filter loads the account with a JOIN FETCH on roles, so
            // an account with none would read as signed out.
            u.addRole(roleRepository.findByName("USER").orElseThrow());
            return userRepository.save(u);
        });
    }

    private MockHttpServletRequestBuilder as(String email, String host, MockHttpServletRequestBuilder request) {
        return request.header("Host", host).header("Authorization", "Bearer " + jwtUtil.generateToken(email));
    }

    private MockHttpServletRequestBuilder as(String email, MockHttpServletRequestBuilder request) {
        return as(email, STORE, request);
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
        return request.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    /** What a shopper's browser loads on every page: GET /api/tenant/current on that host. */
    private ResultActions current(String host) throws Exception {
        return mvc.perform(get("/api/tenant/current").header("Host", host)).andExpect(status().isOk());
    }

    private void saveDraft(String body) throws Exception {
        mvc.perform(as(OWNER, json(put(DRAFT), body))).andExpect(status().isOk());
    }

    /** The row as the database has it, not as this persistence context remembers it. */
    private Tenant stored(String subdomain) {
        entityManager.flush();
        entityManager.clear();
        return tenantRepository.findBySubdomain(subdomain).orElseThrow();
    }

    @Test
    @DisplayName("a manager and a shopper get 403 on every owner design endpoint, as on branding")
    void onlyTheOwner() throws Exception {
        for (String who : List.of(MANAGER, SHOPPER)) {
            mvc.perform(as(who, get(DESIGN))).andExpect(status().isForbidden());
            mvc.perform(as(who, json(put(DRAFT), "{\"theme\":\"neon\"}"))).andExpect(status().isForbidden());
            mvc.perform(as(who, post(PUBLISH))).andExpect(status().isForbidden());
            mvc.perform(as(who, delete(DRAFT))).andExpect(status().isForbidden());
        }
        // The same gate as the branding edit, which is the point.
        mvc.perform(as(MANAGER, json(put("/api/tenant/current"), "{}"))).andExpect(status().isForbidden());

        // Signed out is refused too (the entry point decides how; never a 2xx).
        mvc.perform(json(put(DRAFT), "{\"theme\":\"neon\"}").header("Host", STORE))
            .andExpect(result -> assertThat(result.getResponse().getStatus()).isGreaterThanOrEqualTo(300));

        mvc.perform(as(OWNER, get(DESIGN)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.draft").value(nullValue()))
            .andExpect(jsonPath("$.published").value(nullValue()))
            .andExpect(jsonPath("$.draftUpdatedAt").value(nullValue()))
            .andExpect(jsonPath("$.publishedAt").value(nullValue()));

        assertThat(stored(SUB).getDesignDraft()).isNull();
    }

    @Test
    @DisplayName("draft, then publish: the storefront gets the design with the colours merged in")
    void draftThenPublish() throws Exception {
        mvc.perform(as(OWNER, json(put(DRAFT), """
                {"look":"boutique","theme":"soft","menu":"fab","header":"cover",
                 "style":{"btn":"pill","font":"serif","glow":"max"},
                 "colours":{"primary":"#AA3355","second":"#ffcc00"},
                 "show":{"banner":true},
                 "banner":{"title":"  Autumn edit  ","productId":7},
                 "script":"<script>alert(1)</script>"}""")))
            .andExpect(status().isOk())
            // Returned as stored: normalised.
            .andExpect(jsonPath("$.v").value(1))
            .andExpect(jsonPath("$.theme").value("soft"))
            .andExpect(jsonPath("$.productLayout").value("grid2"))
            .andExpect(jsonPath("$.style.btn").value("pill"))
            .andExpect(jsonPath("$.style.glow").doesNotExist())
            .andExpect(jsonPath("$.script").doesNotExist())
            .andExpect(jsonPath("$.banner.title").value("Autumn edit"))
            .andExpect(jsonPath("$.colours.primary").value("#AA3355"));

        // A draft is the owner's alone: shoppers still get no design.
        current(STORE)
            .andExpect(jsonPath("$.designEnabled").value(true))
            .andExpect(jsonPath("$.design").value(nullValue()));

        mvc.perform(as(OWNER, get(DESIGN)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.draft.look").value("boutique"))
            .andExpect(jsonPath("$.draft.colours.second").value("#ffcc00"))
            .andExpect(jsonPath("$.draftUpdatedAt").isString())
            .andExpect(jsonPath("$.published").value(nullValue()))
            .andExpect(jsonPath("$.publishedAt").value(nullValue()));

        mvc.perform(as(OWNER, post(PUBLISH)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.draft").value(nullValue()))
            .andExpect(jsonPath("$.draftUpdatedAt").value(nullValue()))
            .andExpect(jsonPath("$.published.theme").value("soft"))
            .andExpect(jsonPath("$.published.colours.primary").value("#AA3355"))
            .andExpect(jsonPath("$.publishedAt").isString());

        // The colours went to the columns emails and the admin read, and the
        // stored design does not carry a second copy of them.
        Tenant after = stored(SUB);
        assertThat(after.getPrimaryColor()).isEqualTo("#AA3355");
        assertThat(after.getSecondaryColor()).isEqualTo("#ffcc00");
        assertThat(after.getDesignDraft()).isNull();
        assertThat(after.getDesignDraftUpdatedAt()).isNull();
        assertThat(after.getDesignPublishedAt()).isNotNull();
        assertThat(after.getDesignPublished())
            .contains("\"theme\":\"soft\"")
            .doesNotContain("colours")
            .doesNotContain("#AA3355");

        current(STORE)
            .andExpect(jsonPath("$.designEnabled").value(true))
            .andExpect(jsonPath("$.primaryColor").value("#AA3355"))
            .andExpect(jsonPath("$.design.v").value(1))
            .andExpect(jsonPath("$.design.look").value("boutique"))
            .andExpect(jsonPath("$.design.menu").value("fab"))
            .andExpect(jsonPath("$.design.header").value("cover"))
            .andExpect(jsonPath("$.design.style.font").value("serif"))
            .andExpect(jsonPath("$.design.show.banner").value(true))
            .andExpect(jsonPath("$.design.banner.title").value("Autumn edit"))
            .andExpect(jsonPath("$.design.banner.productId").value(7))
            .andExpect(jsonPath("$.design.colours.primary").value("#AA3355"))
            .andExpect(jsonPath("$.design.colours.second").value("#ffcc00"));
    }

    @Test
    @DisplayName("the storefront's colours always come from the colour columns")
    void coloursFollowTheBrandTab() throws Exception {
        saveDraft("{\"theme\":\"neon\",\"colours\":{\"primary\":\"#aa0000\"}}");
        mvc.perform(as(OWNER, post(PUBLISH))).andExpect(status().isOk());

        // A colour the draft did not carry kept its column.
        assertThat(stored(SUB).getSecondaryColor()).isEqualTo("#445566");

        // Changed later on the Brand tab, the colour follows without a republish.
        mvc.perform(as(OWNER, json(put("/api/tenant/current"),
                "{\"displayName\":\"Design Test Store\",\"primaryColor\":\"#010203\",\"secondaryColor\":\"#445566\"}")))
            .andExpect(status().isOk());
        current(STORE)
            .andExpect(jsonPath("$.design.theme").value("neon"))
            .andExpect(jsonPath("$.design.colours.primary").value("#010203"))
            .andExpect(jsonPath("$.design.colours.second").value("#445566"));
    }

    @Test
    @DisplayName("discarding the draft leaves the published design live")
    void discardKeepsThePublishedDesign() throws Exception {
        saveDraft("{\"theme\":\"neon\"}");
        mvc.perform(as(OWNER, post(PUBLISH))).andExpect(status().isOk());
        saveDraft("{\"theme\":\"soft\"}");

        mvc.perform(as(OWNER, delete(DRAFT)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.draft").value(nullValue()))
            .andExpect(jsonPath("$.draftUpdatedAt").value(nullValue()))
            .andExpect(jsonPath("$.published.theme").value("neon"))
            .andExpect(jsonPath("$.publishedAt").isString());

        Tenant after = stored(SUB);
        assertThat(after.getDesignDraft()).isNull();
        assertThat(after.getDesignPublished()).contains("\"theme\":\"neon\"");
        current(STORE).andExpect(jsonPath("$.design.theme").value("neon"));

        // Discarding again is not an error: there is simply nothing to drop.
        mvc.perform(as(OWNER, delete(DRAFT))).andExpect(status().isOk());
    }

    @Test
    @DisplayName("publishing with no draft is a 409 and changes nothing")
    void nothingToPublish() throws Exception {
        mvc.perform(as(OWNER, post(PUBLISH)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("DESIGN_NO_DRAFT"))
            .andExpect(jsonPath("$.error").isString());

        Tenant after = stored(SUB);
        assertThat(after.getDesignPublished()).isNull();
        assertThat(after.getPrimaryColor()).isEqualTo("#112233");
    }

    @Test
    @DisplayName("a draft over 8 KB, or not a JSON object, is a 400 and nothing is stored")
    void badDraftsAreRefused() throws Exception {
        String huge = "{\"banner\":{\"title\":\"" + "x".repeat(9000) + "\"}}";
        mvc.perform(as(OWNER, json(put(DRAFT), huge)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("DESIGN_TOO_LARGE"));

        for (String body : List.of("[]", "\"soft\"", "{\"theme\":", "{} junk")) {
            mvc.perform(as(OWNER, json(put(DRAFT), body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DESIGN_INVALID"));
        }

        assertThat(stored(SUB).getDesignDraft()).isNull();
    }

    @Test
    @DisplayName("a store created with a design starts with it published; the request's own colour wins")
    void createWithADesign() throws Exception {
        mvc.perform(as(OWNER, PLATFORM, json(post("/api/tenant"), """
                {"name":"Design New Store","subdomain":"design-new-store","primaryColor":"#123456",
                 "design":{"look":"bakery","theme":"soft","show":{"banner":true},
                           "colours":{"primary":"#999999","second":"#abcdef"},"unknown":1}}""")))
            .andExpect(status().isCreated())
            // The request's primaryColor wins; the design fills the one it left empty.
            .andExpect(jsonPath("$.primaryColor").value("#123456"))
            .andExpect(jsonPath("$.secondaryColor").value("#abcdef"))
            .andExpect(jsonPath("$.design.look").value("bakery"))
            .andExpect(jsonPath("$.design.theme").value("soft"))
            .andExpect(jsonPath("$.design.colours.primary").value("#123456"))
            .andExpect(jsonPath("$.design.colours.second").value("#abcdef"))
            .andExpect(jsonPath("$.design.unknown").doesNotExist());

        Tenant created = stored("design-new-store");
        assertThat(created.getDesignPublished()).contains("\"look\":\"bakery\"").doesNotContain("colours");
        assertThat(created.getDesignPublishedAt()).isNotNull();
        assertThat(created.getDesignDraft()).isNull();

        // Its storefront serves it, and the account that created it owns it.
        current("design-new-store.lvh.me")
            .andExpect(jsonPath("$.design.theme").value("soft"))
            .andExpect(jsonPath("$.design.show.banner").value(true));
        mvc.perform(as(OWNER, "design-new-store.lvh.me", get(DESIGN)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.published.look").value("bakery"));
    }

    @Test
    @DisplayName("a store created without a design has none, as before; an oversized one stops the create")
    void createWithoutOrWithABadDesign() throws Exception {
        mvc.perform(as(OWNER, PLATFORM, json(post("/api/tenant"),
                "{\"name\":\"Design Plain Store\",\"subdomain\":\"design-plain-store\",\"design\":null}")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.design").value(nullValue()));
        assertThat(stored("design-plain-store").getDesignPublished()).isNull();

        String huge = "{\"name\":\"Design Big Store\",\"subdomain\":\"design-big-store\","
            + "\"design\":{\"banner\":{\"title\":\"" + "x".repeat(9000) + "\"}}}";
        mvc.perform(as(OWNER, PLATFORM, json(post("/api/tenant"), huge)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("DESIGN_TOO_LARGE"));
        assertThat(tenantRepository.existsBySubdomain("design-big-store")).isFalse();
    }

    @Test
    @DisplayName("with the switch off: no design anywhere, creation ignores one, publishing is refused")
    void theKillSwitch() throws Exception {
        // On, the platform host carries the switch too: registration reads it there.
        current(PLATFORM)
            .andExpect(jsonPath("$.isPlatform").value(true))
            .andExpect(jsonPath("$.designEnabled").value(true));

        saveDraft("{\"theme\":\"neon\",\"colours\":{\"primary\":\"#aa0000\"}}");
        mvc.perform(as(OWNER, post(PUBLISH))).andExpect(status().isOk());
        current(STORE).andExpect(jsonPath("$.design.theme").value("neon"));

        when(designProperties.isEnabled()).thenReturn(false);

        // Storefronts go back to today's chrome; the platform host says so.
        current(STORE)
            .andExpect(jsonPath("$.designEnabled").value(false))
            .andExpect(jsonPath("$.design").value(nullValue()));
        current(PLATFORM)
            .andExpect(jsonPath("$.isPlatform").value(true))
            .andExpect(jsonPath("$.designEnabled").value(false))
            .andExpect(jsonPath("$.design").value(nullValue()));

        // A draft can still be saved, since nobody sees it, but not published:
        // that would write the colour columns today's storefront draws.
        saveDraft("{\"theme\":\"soft\",\"colours\":{\"primary\":\"#00aa00\"}}");
        mvc.perform(as(OWNER, post(PUBLISH)))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.code").value("DESIGN_DISABLED"));
        Tenant after = stored(SUB);
        assertThat(after.getPrimaryColor()).isEqualTo("#aa0000");
        assertThat(after.getDesignPublished()).contains("\"theme\":\"neon\"");

        // Registration ignores a design entirely, even one it would refuse.
        mvc.perform(as(OWNER, PLATFORM, json(post("/api/tenant"),
                "{\"name\":\"Design Off Store\",\"subdomain\":\"design-off-store\","
                    + "\"design\":{\"theme\":\"neon\",\"colours\":{\"primary\":\"#999999\"},"
                    + "\"banner\":{\"title\":\"" + "x".repeat(9000) + "\"}}}")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.design").value(nullValue()))
            .andExpect(jsonPath("$.primaryColor").value(not("#999999")));
        Tenant off = stored("design-off-store");
        assertThat(off.getDesignPublished()).isNull();
        assertThat(off.getDesignPublishedAt()).isNull();
    }
}
