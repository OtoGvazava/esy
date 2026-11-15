package com.esyback.ecommerce.security;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    // Empty = same origin (Render serves the SPA). Local dev sets this to the
    // Vite origin so the browser lands on the running SPA.
    @Value("${app.oauth2.redirect-base:}")
    private String redirectBase;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oauth2User.getAttributes();

        // Reliable provider id from Spring (the registrationId), not by guessing
        // from claims — Google-as-OIDC also has sub+iss like Apple.
        String provider = authentication instanceof OAuth2AuthenticationToken oauthToken
                ? oauthToken.getAuthorizedClientRegistrationId()
                : "google";

        // OIDC subject is "sub"; fall back to "id" for non-OIDC userinfo.
        Object subject = attributes.getOrDefault("sub", attributes.get("id"));
        String providerId = subject == null ? null : String.valueOf(subject);
        String email = (String) attributes.get("email");
        String firstName = (String) attributes.get("given_name");
        String lastName = (String) attributes.get("family_name");
        String profileImageUrl = (String) attributes.get("picture");

        // Send the browser back to the tenant store it started on (falls back
        // to redirectBase: same origin in prod, the Vite origin in local dev).
        String tenantOrigin = HttpCookieOAuth2AuthorizationRequestRepository.readTenantOrigin(request);
        String base = tenantOrigin != null ? tenantOrigin : redirectBase;

        User user;
        try {
            user = userService.findOrCreateUser(provider, providerId, email,
                emailVerified(attributes.get("email_verified")), firstName, lastName, profileImageUrl,
                storeSubdomain(tenantOrigin));
        } catch (UserService.SignInRefused e) {
            // No session: the same landing as any other failed sign-in.
            log.warn("Sign-in refused for {} subject {}: {}", provider, providerId, e.getMessage());
            response.sendRedirect(base + OAuth2AuthenticationFailureHandler.FAILURE_PATH);
            return;
        }
        String token = jwtUtil.generateToken(user.getUsername());

        // The handshake runs on the canonical host (the funnel); set the JWT as
        // a Domain=esy.ge HttpOnly cookie here so it's already present when the
        // browser follows the redirect to the originating tenant subdomain —
        // and stays valid on every other *.esy.ge store (single sign-on).
        AuthCookie.add(request, response, token, jwtUtil.getExpirationSeconds());

        // No token in the URL — the cookie carries it (no leak via history /
        // Referer / server logs).
        response.sendRedirect(base + "/auth/callback");
    }

    /** OIDC sends a boolean; some providers send the string "true". Null when absent. */
    static Boolean emailVerified(Object claim) {
        if (claim == null) return null;
        if (claim instanceof Boolean b) return b;
        return Boolean.parseBoolean(String.valueOf(claim).trim());
    }

    /** The store subdomain an allowlisted tenant origin names, or null for a platform origin. */
    static String storeSubdomain(String tenantOrigin) {
        if (tenantOrigin == null) return null;
        try {
            return PlatformHosts.storefrontSubdomain(URI.create(tenantOrigin).getHost());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
