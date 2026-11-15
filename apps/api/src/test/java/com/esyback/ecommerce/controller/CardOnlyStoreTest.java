package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.service.BogPaymentService;
import com.esyback.ecommerce.service.TenantContextService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A store that takes cards takes nothing else (review M35): the pay-later
 * endpoint must not create an order there that nobody will ever pay.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CardOnlyStoreTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired UserRepository userRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired OrderRepository orderRepository;
    @Autowired com.esyback.ecommerce.repository.RoleRepository roleRepository;

    @MockBean BogPaymentService bog;
    @MockBean TenantContextService tenantContextService;

    private static final String EMAIL = "card-only-shopper@esy.test";
    private Tenant tenant;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain("card-only-store").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Card Only Store");
            t.setSubdomain("card-only-store");
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
        userRepository.findByUsername(EMAIL).orElseGet(() -> {
            User u = new User();
            u.setUsername(EMAIL);
            u.setEmail(EMAIL);
            u.setIsActive(true);
            u.setPhoneVerified(true);
            u.setFirstName("Nino");
            u.setLastName("Beridze");
            u.setDateOfBirth(LocalDate.of(1990, 1, 1));
            u.addRole(roleRepository.findByName("USER").orElseGet(() -> {
                com.esyback.ecommerce.entity.Role r = new com.esyback.ecommerce.entity.Role();
                r.setName("USER");
                return roleRepository.save(r);
            }));
            return userRepository.save(u);
        });
    }

    @Test
    @DisplayName("POST /api/orders on a store with card payments is refused with CARD_ONLY and creates nothing")
    void payLaterRefused() throws Exception {
        when(bog.isConfigured(any())).thenReturn(true);
        long before = orderRepository.count();

        mvc.perform(post("/api/orders")
                .header("Authorization", "Bearer " + jwtUtil.generateToken(EMAIL))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"items\":[{\"productId\":1,\"quantity\":1}]}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("CARD_ONLY"));

        assertThat(orderRepository.count()).isEqualTo(before);
    }
}
