package com.esyback.ecommerce.security;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
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
        String providerId = (String) attributes.getOrDefault("sub", attributes.get("id"));
        String email = (String) attributes.get("email");
        String firstName = (String) attributes.get("given_name");
        String lastName = (String) attributes.get("family_name");
        String profileImageUrl = (String) attributes.get("picture");

        User user = userService.findOrCreateUser(provider, providerId, email, firstName, lastName, profileImageUrl);
        String token = jwtUtil.generateToken(user.getUsername());

        // The handshake runs on the canonical host (the funnel); set the JWT as
        // a Domain=esy.ge HttpOnly cookie here so it's already present when the
        // browser follows the redirect to the originating tenant subdomain —
        // and stays valid on every other *.esy.ge store (single sign-on).
        AuthCookie.add(request, response, token, jwtUtil.getExpirationSeconds());

        // Send the browser back to the tenant store it started on (falls back
        // to redirectBase: same origin in prod, the Vite origin in local dev).
        // No token in the URL — the cookie carries it (no leak via history /
        // Referer / server logs).
        String tenantOrigin = HttpCookieOAuth2AuthorizationRequestRepository.readTenantOrigin(request);
        String base = tenantOrigin != null ? tenantOrigin : redirectBase;

        response.sendRedirect(base + "/auth/callback");
    }
}
