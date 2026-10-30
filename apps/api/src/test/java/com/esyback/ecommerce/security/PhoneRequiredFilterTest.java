package com.esyback.ecommerce.security;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.UserRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The server side of "a verified phone is required to register". The browser
 * gate can be skipped by anyone with curl; this cannot.
 */
class PhoneRequiredFilterTest {

    private final UserRepository users = mock(UserRepository.class);
    private final PhoneRequiredFilter filter = new PhoneRequiredFilter(users);

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private void signInAs(boolean verified) {
        User u = new User();
        u.setUsername("mariam");
        u.setPhoneVerified(verified);
        when(users.findByUsername("mariam")).thenReturn(Optional.of(u));
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("mariam", null, List.of()));
    }

    private MockHttpServletResponse run(String method, String path, FilterChain chain) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(method, path);
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        return res;
    }

    @Test
    @DisplayName("an unverified account cannot write")
    void unverifiedWriteIsRefused() throws Exception {
        signInAs(false);
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletResponse res = run("POST", "/api/orders", chain);
        assertEquals(403, res.getStatus());
        assertTrue(res.getContentAsString().contains("\"code\":\"PHONE_REQUIRED\""));
        verify(chain, never()).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("the gate's own endpoints stay open, or nobody could get verified")
    void gateEndpointsAreExempt() throws Exception {
        signInAs(false);
        for (String path : List.of("/api/account/phone/send-code", "/api/account/phone/verify",
                                   "/api/account/profile", "/api/auth/logout")) {
            FilterChain chain = mock(FilterChain.class);
            assertEquals(200, run("POST", path, chain).getStatus(), path);
            verify(chain).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        }
    }

    @Test
    @DisplayName("reads are not gated")
    void readsPass() throws Exception {
        signInAs(false);
        FilterChain chain = mock(FilterChain.class);
        assertEquals(200, run("GET", "/api/orders", chain).getStatus());
        verify(chain).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("a verified account writes as before")
    void verifiedWritePasses() throws Exception {
        signInAs(true);
        FilterChain chain = mock(FilterChain.class);
        assertEquals(200, run("POST", "/api/orders", chain).getStatus());
        verify(chain).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("anonymous requests are left to the controllers")
    void anonymousPasses() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        assertEquals(200, run("POST", "/api/payments/bog/callback", chain).getStatus());
        assertEquals(200, run("POST", "/api/orders", mock(FilterChain.class)).getStatus());
    }
}
