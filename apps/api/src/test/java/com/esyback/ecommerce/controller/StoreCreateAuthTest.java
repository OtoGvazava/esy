package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Opening a store needs a signed-in account (review finding H12): an anonymous
 * POST used to create a live, listed store with no owner.
 */
@SpringBootTest
@AutoConfigureMockMvc
class StoreCreateAuthTest {

    @Autowired MockMvc mvc;
    @Autowired TenantRepository tenantRepository;

    @Test
    @DisplayName("an anonymous POST /api/tenant is refused and creates nothing")
    void anonymousCannotCreateAStore() throws Exception {
        var res = mvc.perform(post("/api/tenant")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Squatter\",\"subdomain\":\"squatter-store\"}"))
            .andReturn().getResponse();

        // Refused like every other protected endpoint: the OAuth2 entry point
        // sends an anonymous caller to /login (api.js reads that as 401).
        if (res.getStatus() == 302) {
            assertThat(res.getRedirectedUrl()).endsWith("/login");
        } else {
            assertThat(res.getStatus()).isIn(401, 403);
        }
        assertThat(tenantRepository.findBySubdomain("squatter-store")).isEmpty();
    }
}
