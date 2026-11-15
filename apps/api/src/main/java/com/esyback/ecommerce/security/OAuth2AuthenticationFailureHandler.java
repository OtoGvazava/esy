package com.esyback.ecommerce.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * A failed sign-in (cancelled at Google, a provider error, or a callback that
 * arrives after the request cookie expired) goes back to the sign-in page of
 * the store it started on, like a successful one, instead of stranding a store
 * shopper on the platform host. The in-flight cookies are dropped either way,
 * so a leftover store origin cannot steer the next sign-in.
 */
@Component
@Slf4j
public class OAuth2AuthenticationFailureHandler implements AuthenticationFailureHandler {

    /** Where a refused or failed sign-in lands, under the origin it started on. */
    public static final String FAILURE_PATH = "/signin?error=oauth";

    // Same fallback as the success handler: empty = same origin.
    @Value("${app.oauth2.redirect-base:}")
    private String redirectBase;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        log.info("OAuth sign-in failed: {}",
            exception instanceof org.springframework.security.oauth2.core.OAuth2AuthenticationException o
                ? o.getError().getErrorCode() : exception.getMessage());
        String tenantOrigin = HttpCookieOAuth2AuthorizationRequestRepository.readTenantOrigin(request);
        HttpCookieOAuth2AuthorizationRequestRepository.expireAll(request, response);
        response.sendRedirect((tenantOrigin != null ? tenantOrigin : redirectBase) + FAILURE_PATH);
    }
}
