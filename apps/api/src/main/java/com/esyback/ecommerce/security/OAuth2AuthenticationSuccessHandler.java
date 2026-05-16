package com.esyback.ecommerce.security;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.service.TenantContextService;
import com.esyback.ecommerce.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
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
    private final TenantContextService tenantContextService;
    
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
        
        // Find or create user
        User user = userService.findOrCreateUser(provider, providerId, email, firstName, lastName, profileImageUrl);
        
        // Generate JWT token
        String token = jwtUtil.generateToken(user.getUsername());
        
        // Get current subdomain for redirect
        String subdomain = tenantContextService.getCurrentSubdomain();
        
        // Redirect to frontend with token and subdomain
        String redirectUrl = String.format("https://%s.esy.ge/auth/callback?token=%s", subdomain, token);
        response.sendRedirect(redirectUrl);
    }
    
    private String determineProvider(Map<String, Object> attributes) {
        if (attributes.containsKey("sub") && attributes.containsKey("iss")) {
            return "apple";
        }
        return "google";
    }
    
    private String getProviderId(Map<String, Object> attributes, String provider) {
        if ("apple".equals(provider)) {
            return (String) attributes.get("sub");
        }
        return (String) attributes.get("id");
    }
    
    private String getEmail(Map<String, Object> attributes, String provider) {
        if ("apple".equals(provider)) {
            return (String) attributes.get("email");
        }
        return (String) attributes.get("email");
    }
    
    private String getFirstName(Map<String, Object> attributes, String provider) {
        if ("apple".equals(provider)) {
            return (String) attributes.get("given_name");
        }
        return (String) attributes.get("given_name");
    }
    
    private String getLastName(Map<String, Object> attributes, String provider) {
        if ("apple".equals(provider)) {
            return (String) attributes.get("family_name");
        }
        return (String) attributes.get("family_name");
    }
    
    private String getProfileImageUrl(Map<String, Object> attributes, String provider) {
        if ("apple".equals(provider)) {
            return null; // Apple doesn't provide profile images
        }
        return (String) attributes.get("picture");
    }
}
