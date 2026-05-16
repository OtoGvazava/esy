package com.esyback.ecommerce.security;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
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

        String provider = determineProvider(attributes);
        String providerId = getProviderId(attributes, provider);
        String email = getEmail(attributes, provider);
        String firstName = getFirstName(attributes, provider);
        String lastName = getLastName(attributes, provider);
        String profileImageUrl = getProfileImageUrl(attributes, provider);

        User user = userService.findOrCreateUser(provider, providerId, email, firstName, lastName, profileImageUrl);
        String token = jwtUtil.generateToken(user.getUsername());

        // Hand the JWT back to the SPA, which stores it and restores the session.
        String target = redirectBase + "/auth/callback?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
        response.sendRedirect(target);
    }

    private String determineProvider(Map<String, Object> attributes) {
        if (attributes.containsKey("sub") && attributes.containsKey("iss")) {
            return "apple";
        }
        return "google";
    }

    private String getProviderId(Map<String, Object> attributes, String provider) {
        return "apple".equals(provider) ? (String) attributes.get("sub") : (String) attributes.get("id");
    }

    private String getEmail(Map<String, Object> attributes, String provider) {
        return (String) attributes.get("email");
    }

    private String getFirstName(Map<String, Object> attributes, String provider) {
        return (String) attributes.get("given_name");
    }

    private String getLastName(Map<String, Object> attributes, String provider) {
        return (String) attributes.get("family_name");
    }

    private String getProfileImageUrl(Map<String, Object> attributes, String provider) {
        return "apple".equals(provider) ? null : (String) attributes.get("picture");
    }
}
