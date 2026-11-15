package com.esyback.ecommerce.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Which unknown paths get the SPA's page and which a 404 (review, Low: every
 * unknown path answered 200 with index.html and ran the page's DB reads).
 */
@SpringBootTest
@AutoConfigureMockMvc
class SpaFallbackTest {

    @Autowired MockMvc mvc;

    @Test
    @DisplayName("files are files: assets and anything with an extension")
    void fileRequests() {
        assertThat(SpaConfig.isFileRequest("assets/index-abc123.js")).isTrue();
        assertThat(SpaConfig.isFileRequest("assets/gone")).isTrue();
        assertThat(SpaConfig.isFileRequest("wp-login.php")).isTrue();
        assertThat(SpaConfig.isFileRequest("deep/path/config.json")).isTrue();
        assertThat(SpaConfig.isFileRequest(".env")).isTrue();
    }

    @Test
    @DisplayName("screens are screens: every SPA route still gets the page")
    void screenRequests() {
        assertThat(SpaConfig.isFileRequest("product/42")).isFalse();
        assertThat(SpaConfig.isFileRequest("orders/ESY-AB12-CD34")).isFalse();
        assertThat(SpaConfig.isFileRequest("stores/studio-form")).isFalse();
        assertThat(SpaConfig.isFileRequest("account/display")).isFalse();
        assertThat(SpaConfig.isFileRequest("cart")).isFalse();
    }

    @Test
    @DisplayName("a missing chunk is a 404")
    void missingChunkIsNotFound() throws Exception {
        mvc.perform(get("/assets/index-stale.js")).andExpect(status().isNotFound());
        mvc.perform(get("/wp-login.php")).andExpect(status().isNotFound());
    }
}
