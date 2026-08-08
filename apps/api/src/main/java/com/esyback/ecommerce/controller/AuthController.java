package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.security.AuthCookie;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.service.MembershipService;
import com.esyback.ecommerce.service.TenantContextService;
import com.esyback.ecommerce.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private UserService userService;

    @Autowired
    private MembershipService membershipService;

    @Autowired
    private TenantContextService tenantContextService;
    
    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
        
        User user = userService.findByUsername(authentication.getName()).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("authenticated", true);
        response.put("user", userPayload(user));

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> userPayload(User user) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", user.getId());
        payload.put("username", user.getUsername());
        payload.put("email", user.getEmail());
        payload.put("firstName", user.getFirstName());
        payload.put("lastName", user.getLastName());
        payload.put("profileImageUrl", user.getProfileImageUrl());
        payload.put("dateOfBirth", user.getDateOfBirth() == null ? null : user.getDateOfBirth().toString());
        payload.put("phoneNumber", user.getPhoneNumber());
        payload.put("phoneVerified", Boolean.TRUE.equals(user.getPhoneVerified()));
        payload.put("profileComplete", AccountController.profileComplete(user));
        payload.put("roles", user.getRoles().stream().map(role -> role.getName()).toArray());
        // Lets the SPA show owner actions for *this* store. Resolved from the
        // request Host (same tenant the storefront is showing); false on the
        // platform front door where there's no store to manage. The manager
        // host is platform-faced but ?tenant=<sub> selects a store there, so
        // it resolves against that selection (decision D5: OWNER or MANAGER
        // both count as "can manage"; owner-only rights are checked
        // server-side per endpoint regardless of what the UI shows).
        boolean onStore = !tenantContextService.isPlatformHost()
            || tenantContextService.isManagerHost();
        boolean ownsCurrentStore = onStore
            && membershipService.canManage(user, tenantContextService.getCurrentTenant());
        payload.put("ownsCurrentStore", ownsCurrentStore);
        // Separate OWNER-only signal: store settings / logo / integrations are
        // OWNER-gated server-side (D5), so the UI needs to know the difference
        // or it shows MANAGERs screens whose every save 403s.
        boolean ownerOfCurrentStore = onStore
            && membershipService.isOwner(user, tenantContextService.getCurrentTenant());
        payload.put("ownerOfCurrentStore", ownerOfCurrentStore);
        return payload;
    }
    
    @PostMapping("/token")
    public ResponseEntity<Map<String, String>> generateToken(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not authenticated"));
        }
        
        String token = jwtUtil.generateToken(authentication);
        return ResponseEntity.ok(Map.of("token", token));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request,
                                                      HttpServletResponse response) {
        // Expire the shared esy.ge session cookie so logout takes effect on
        // every subdomain, not just the store the user clicked it on.
        AuthCookie.clear(request, response);
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Successfully logged out"));
    }
}
