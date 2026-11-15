package com.esyback.ecommerce.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * An address that names a store that does not exist (review, Low: it used to
 * resolve silently to the default store, whose catalogue it then showed and
 * whose orders it booked).
 */
@SpringBootTest
@AutoConfigureMockMvc
class UnknownStoreHostTest {

    @Autowired MockMvc mvc;

    @Test
    @DisplayName("a mistyped store address gets no catalogue: the store calls are 404 STORE_NOT_FOUND")
    void storeCallsAreNotFound() throws Exception {
        mvc.perform(get("/api/products").header("Host", "no-such-store-xyz.lvh.me"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("STORE_NOT_FOUND"));
        mvc.perform(get("/api/products/categories").header("Host", "no-such-store-xyz.esy.ge"))
            .andExpect(status().isNotFound());
        // The local simulation names a store the same way.
        mvc.perform(get("/api/products").param("tenant", "no-such-store-xyz").header("Host", "localhost"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("the page itself is told there is no store, and is drawn closed")
    void currentSaysMissing() throws Exception {
        mvc.perform(get("/api/tenant/current").header("Host", "no-such-store-xyz.lvh.me"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.missing").value(true))
            .andExpect(jsonPath("$.suspended").value(true))
            .andExpect(jsonPath("$.isPlatform").value(false))
            .andExpect(jsonPath("$.subdomain").value("no-such-store-xyz"));
    }

    @Test
    @DisplayName("the back office naming a store that does not exist is a 404")
    void managerUnknownTenantIsNotFound() throws Exception {
        mvc.perform(get("/api/tenant/current").param("tenant", "no-such-store-xyz").header("Host", "manager.lvh.me"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("a real store and the platform resolve as before")
    void knownHostsUnchanged() throws Exception {
        mvc.perform(get("/api/products").header("Host", "lvh.me"))
            .andExpect(status().isOk());
        mvc.perform(get("/api/tenant/current").header("Host", "lvh.me"))
            .andExpect(jsonPath("$.isPlatform").value(true))
            .andExpect(jsonPath("$.missing").doesNotExist());
    }

    @Test
    @DisplayName("a host esy does not serve as stores (the Render hostname) is the platform, not a storefront")
    void unservedHostIsPlatform() throws Exception {
        mvc.perform(get("/api/tenant/current").header("Host", "esy-r5ee.onrender.com"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isPlatform").value(true));
    }

    @Test
    @DisplayName("who is signed in still answers on a mistyped store address")
    void authUserStillAnswers() throws Exception {
        mvc.perform(get("/api/auth/user").header("Host", "no-such-store-xyz.lvh.me"))
            .andExpect(result -> {
                int s = result.getResponse().getStatus();
                if (s == 404 || s >= 500) throw new AssertionError("status " + s);
            });
    }
}
