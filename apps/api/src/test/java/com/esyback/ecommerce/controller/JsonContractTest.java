package com.esyback.ecommerce.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * The API's JSON is what the web app was built against. Spring Boot 4 serves
 * it with Jackson 3, whose defaults would reorder fields alphabetically
 * (and, as it turned out, drop hasVariants from product lists); application.yml keeps Jackson 2's defaults
 * (spring.jackson.use-jackson2-defaults), and this pins that.
 */
@SpringBootTest
@AutoConfigureMockMvc
class JsonContractTest {

    @Autowired MockMvc mvc;

    @Test
    @DisplayName("a page lists its fields in declared order, and each product carries hasVariants")
    void jackson2Contract() throws Exception {
        String body = mvc.perform(get("/api/products")).andReturn().getResponse().getContentAsString();
        // Declared order (Jackson 2): PagedResponse declares content first.
        assertThat(body).startsWith("{\"content\":");
        // The storefront's quick-add reads it to send a product sold in sizes to
        // its page; under Jackson 3's defaults it went missing from the list.
        assertThat(body).contains("\"hasVariants\":");
    }
}
