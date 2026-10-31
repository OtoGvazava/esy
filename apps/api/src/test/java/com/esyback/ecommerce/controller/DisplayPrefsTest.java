package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.web.DisplayPrefsValidator;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A shopper's display settings on the account (store design plan, Phase 7):
 * {@code GET} and {@code PUT /api/account/display-prefs}, over HTTP through
 * the real chain — a signed JWT, {@code PhoneRequiredFilter} and the
 * controller — so the unverified case is the filter's real answer, not a mock's.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DisplayPrefsTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired EntityManager entityManager;

    private static final String PREFS = "/api/account/display-prefs";
    private static final String HOST = "lvh.me";

    private static final String VERIFIED = "display-verified@esy.test";
    private static final String UNVERIFIED = "display-unverified@esy.test";

    private User account(String email, boolean phoneVerified) {
        return userRepository.findByUsername(email).orElseGet(() -> {
            User u = new User();
            u.setUsername(email);
            u.setEmail(email);
            u.setIsActive(true);
            u.setPhoneVerified(phoneVerified);
            // The JWT filter loads the account with a JOIN FETCH on roles, so
            // an account with none would read as signed out.
            u.addRole(roleRepository.findByName("USER").orElseThrow());
            return userRepository.save(u);
        });
    }

    private MockHttpServletRequestBuilder as(String email, MockHttpServletRequestBuilder request) {
        return request.header("Host", HOST).header("Authorization", "Bearer " + jwtUtil.generateToken(email));
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
        return request.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    /** The column as the database has it, not as this persistence context remembers it. */
    private String stored(String email) {
        entityManager.flush();
        entityManager.clear();
        return userRepository.findByUsername(email).orElseThrow().getDisplayPrefs();
    }

    @Test
    @DisplayName("an account that never saved any gets 204, so the browser knows to upload its own")
    void noneYet() throws Exception {
        account(VERIFIED, true);
        mvc.perform(as(VERIFIED, get(PREFS)))
            .andExpect(status().isNoContent())
            .andExpect(content().string(""));
        assertThat(stored(VERIFIED)).isNull();
    }

    @Test
    @DisplayName("saved, then loaded: every setting comes back as sent, unknown keys dropped")
    void saveThenLoad() throws Exception {
        account(VERIFIED, true);
        mvc.perform(as(VERIFIED, json(put(PREFS), """
                {"lang":"en","appearance":"auto","text":"xl","solid":true,"motion":false,"saver":true,
                 "views":{"studio-form":"grid3","bakery-7":"list"},
                 "theme":"neon","script":"<script>alert(1)</script>"}""")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lang").value("en"))
            .andExpect(jsonPath("$.appearance").value("auto"))
            .andExpect(jsonPath("$.text").value("xl"))
            .andExpect(jsonPath("$.solid").value(true))
            .andExpect(jsonPath("$.motion").value(false))
            .andExpect(jsonPath("$.saver").value(true))
            .andExpect(jsonPath("$.views.studio-form").value("grid3"))
            .andExpect(jsonPath("$.views.bakery-7").value("list"))
            .andExpect(jsonPath("$.theme").doesNotExist())
            .andExpect(jsonPath("$.script").doesNotExist());

        assertThat(stored(VERIFIED))
            .contains("\"text\":\"xl\"")
            .doesNotContain("theme")
            .doesNotContain("script");

        mvc.perform(as(VERIFIED, get(PREFS)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lang").value("en"))
            .andExpect(jsonPath("$.text").value("xl"))
            .andExpect(jsonPath("$.saver").value(true))
            .andExpect(jsonPath("$.views.studio-form").value("grid3"));

        // A PUT replaces the whole set: what it leaves out is no longer chosen,
        // and null is "not chosen" too (the device decides).
        mvc.perform(as(VERIFIED, json(put(PREFS),
                "{\"lang\":\"ka\",\"solid\":null,\"views\":{\"studio-form\":null}}")))
            .andExpect(status().isOk())
            .andExpect(content().json("{\"lang\":\"ka\"}", true));
        mvc.perform(as(VERIFIED, get(PREFS)))
            .andExpect(status().isOk())
            .andExpect(content().json("{\"lang\":\"ka\"}", true));

        // Saved but empty is not "none": the account keeps its (default) choice.
        mvc.perform(as(VERIFIED, json(put(PREFS), "{}"))).andExpect(status().isOk());
        mvc.perform(as(VERIFIED, get(PREFS)))
            .andExpect(status().isOk())
            .andExpect(content().json("{}", true));
        assertThat(stored(VERIFIED)).isEqualTo("{}");
    }

    @Test
    @DisplayName("a value off its list, a wrong type or not a JSON object is a 400, and nothing is stored")
    void badValuesAreRefused() throws Exception {
        account(VERIFIED, true);
        mvc.perform(as(VERIFIED, json(put(PREFS), "{\"text\":\"l\"}"))).andExpect(status().isOk());

        for (String body : List.of(
                "{\"lang\":\"fr\"}",
                "{\"appearance\":\"system\"}",
                "{\"text\":\"xxl\"}",
                "{\"text\":\"L\"}",
                "{\"solid\":\"yes\"}",
                "{\"motion\":1}",
                "{\"views\":{\"studio-form\":\"feed\"}}",
                "{\"views\":{\"Studio Form\":\"list\"}}",
                "{\"views\":{\"-studio\":\"list\"}}",
                "{\"views\":[\"list\"]}",
                "[]",
                "\"ka\"",
                "{\"lang\":",
                "{} junk")) {
            mvc.perform(as(VERIFIED, json(put(PREFS), body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(DisplayPrefsValidator.INVALID))
                .andExpect(jsonPath("$.error").isString());
        }

        assertThat(stored(VERIFIED)).isEqualTo("{\"text\":\"l\"}");
    }

    @Test
    @DisplayName("over 4 KB, or views for more than 40 stores, is a 400")
    void sizeCaps() throws Exception {
        account(VERIFIED, true);

        String huge = "{\"lang\":\"ka\",\"pad\":\"" + "x".repeat(DisplayPrefsValidator.MAX_BYTES) + "\"}";
        mvc.perform(as(VERIFIED, json(put(PREFS), huge)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(DisplayPrefsValidator.TOO_LARGE));

        StringBuilder views = new StringBuilder("{\"views\":{");
        for (int i = 0; i <= DisplayPrefsValidator.MAX_VIEWS; i++) {
            if (i > 0) views.append(',');
            views.append("\"store-").append(i).append("\":\"list\"");
        }
        views.append("}}");
        mvc.perform(as(VERIFIED, json(put(PREFS), views.toString())))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(DisplayPrefsValidator.TOO_LARGE));

        assertThat(stored(VERIFIED)).isNull();
    }

    @Test
    @DisplayName("an account without a verified phone can save and load them, though its other writes are refused")
    void unverifiedAccountCanSave() throws Exception {
        account(UNVERIFIED, false);

        // The filter is live for this account: an ordinary write is refused.
        mvc.perform(as(UNVERIFIED, json(post("/api/addresses"), "{}")))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("PHONE_REQUIRED"));

        mvc.perform(as(UNVERIFIED, json(put(PREFS), "{\"lang\":\"en\",\"text\":\"l\",\"motion\":true}")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.text").value("l"));
        mvc.perform(as(UNVERIFIED, get(PREFS)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.lang").value("en"))
            .andExpect(jsonPath("$.motion").value(true));

        assertThat(stored(UNVERIFIED)).contains("\"motion\":true");
    }

    @Test
    @DisplayName("signed out is a 401 on both")
    void signedOut() throws Exception {
        mvc.perform(get(PREFS).header("Host", HOST)).andExpect(status().isUnauthorized());
        mvc.perform(json(put(PREFS), "{\"lang\":\"en\"}").header("Host", HOST)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("a stored row that no longer passes reads back without the bad values, and a damaged one as none")
    void storedRowsReadLeniently() {
        assertThat(DisplayPrefsValidator.readStored(
                "{\"lang\":\"fr\",\"text\":\"l\",\"saver\":\"yes\",\"views\":{\"ok-store\":\"list\",\"BAD\":\"list\",\"x-1\":\"feed\"}}"))
            .hasToString("{\"text\":\"l\",\"views\":{\"ok-store\":\"list\"}}");
        assertThat(DisplayPrefsValidator.readStored("{\"text\":")).isNull();
        assertThat(DisplayPrefsValidator.readStored("[]")).isNull();
        assertThat(DisplayPrefsValidator.readStored(null)).isNull();
    }
}
