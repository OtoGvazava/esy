package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * The API reference and its spec are for platform admins only, and the page's
 * CDN script is pinned and hash-checked (review, Low: "The public /docs page
 * runs an unpinned CDN script on the session origin, and the full spec is
 * public").
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApiDocsAccessTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;

    private int status(String path, String token) throws Exception {
        var req = get(path).header("Host", "lvh.me");
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        return mvc.perform(req).andReturn().getResponse().getStatus();
    }

    @Test
    @DisplayName("anonymous and signed-in non-admins get neither the page nor the spec")
    void notForEveryone() throws Exception {
        User u = new User();
        u.setUsername("docs-shopper@esy.test");
        u.setEmail("docs-shopper@esy.test");
        u.setIsActive(true);
        u.addRole(roleRepository.findByName("USER").orElseThrow());
        userRepository.save(u);
        String token = jwtUtil.generateToken(u.getUsername());

        for (String path : new String[] {"/docs", "/swagger", "/v3/api-docs"}) {
            assertThat(status(path, null)).as(path + " anonymous").isNotEqualTo(200);
            assertThat(status(path, token)).as(path + " shopper").isNotEqualTo(200);
        }
    }

    @Autowired com.esyback.ecommerce.repository.PlatformAdminRepository platformAdminRepository;

    @Test
    @DisplayName("a platform admin gets the page")
    void adminGetsIt() throws Exception {
        User u = new User();
        u.setUsername("docs-admin@esy.test");
        u.setEmail("docs-admin@esy.test");
        u.setIsActive(true);
        u.addRole(roleRepository.findByName("USER").orElseThrow());
        u.addRole(roleRepository.findByName("ADMIN").orElseGet(() -> {
            com.esyback.ecommerce.entity.Role r = new com.esyback.ecommerce.entity.Role();
            r.setName("ADMIN");
            return roleRepository.save(r);
        }));
        userRepository.save(u);
        platformAdminRepository.save(com.esyback.ecommerce.entity.PlatformAdmin.of(u.getEmail(), "test"));

        assertThat(status("/docs", jwtUtil.generateToken(u.getUsername()))).isEqualTo(200);
    }

    @Test
    @DisplayName("the Scalar script is a pinned version with an integrity hash")
    void scriptIsPinned() {
        assertThat(ScalarDocsController.SCALAR_URL).matches(".*@scalar/api-reference@\\d+\\.\\d+\\.\\d+/.*");
        assertThat(ScalarDocsController.SCALAR_SRI).startsWith("sha384-");
    }
}
