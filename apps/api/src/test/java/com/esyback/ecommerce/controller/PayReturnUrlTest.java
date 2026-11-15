package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Role;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.service.BogPaymentService;
import com.esyback.ecommerce.service.TenantContextService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * After paying at BOG the shopper comes back to the store they paid on, not
 * to the platform's base URL, which has no /pay/return (review M2).
 */
@SpringBootTest(properties = "app.public-base-url=https://www.esy.ge")
@AutoConfigureMockMvc
class PayReturnUrlTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired ProductRepository productRepository;

    @MockBean BogPaymentService bog;
    @MockBean TenantContextService tenantContextService;

    private static final String EMAIL = "pay-return-shopper@esy.test";

    @Test
    @DisplayName("callback on the public base URL; both returns on the store's own origin")
    void returnsToTheStore() throws Exception {
        Tenant tenant = tenantRepository.findBySubdomain("pay-return-store").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Pay Return Store");
            t.setSubdomain("pay-return-store");
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
        when(bog.isConfigured(any())).thenReturn(true);
        when(bog.createPayment(any(), any(), any(), any(), any()))
            .thenReturn(new BogPaymentService.PaymentSession("bog-1", "https://payment.bog.ge/x"));
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle("Mug");
        p.setDescription("Mug");
        p.setPrice(new BigDecimal("24.00"));
        p.setQuantity(5);
        p = productRepository.save(p);
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
                Role r = new Role();
                r.setName("USER");
                return roleRepository.save(r);
            }));
            return userRepository.save(u);
        });

        // A full URL: MockMvc takes scheme, host and port from it, as a real
        // request through the proxy would have them.
        mvc.perform(post("https://pay-return-store.esy.ge:443/api/payments/bog/checkout")
                .header("Authorization", "Bearer " + jwtUtil.generateToken(EMAIL))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"items\":[{\"productId\":" + p.getId() + ",\"quantity\":1}]}"))
            .andExpect(status().isOk());

        ArgumentCaptor<String> callback = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> success = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> fail = ArgumentCaptor.forClass(String.class);
        verify(bog).createPayment(any(), any(), callback.capture(), success.capture(), fail.capture());
        assertThat(callback.getValue()).isEqualTo("https://www.esy.ge/api/payments/bog/callback");
        assertThat(success.getValue()).startsWith("https://pay-return-store.esy.ge/pay/return?order=");
        assertThat(fail.getValue()).startsWith("https://pay-return-store.esy.ge/pay/return?order=");
    }
}
