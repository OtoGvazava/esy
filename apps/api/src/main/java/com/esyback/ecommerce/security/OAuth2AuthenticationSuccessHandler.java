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
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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

        // Auth completed on the canonical host; send the JWT back to the tenant
        // store the user actually started on. Falls back to redirectBase (same
        // origin in prod, the Vite origin in local dev) when there's no funnel.
        String tenantOrigin = HttpCookieOAuth2AuthorizationRequestRepository.readTenantOrigin(request);
        String base = tenantOrigin != null ? tenantOrigin : redirectBase;

        String target = base + "/auth/callback?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
        response.sendRedirect(target);
    }
}
