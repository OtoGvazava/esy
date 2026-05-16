package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.DevLoginRequest;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.service.UserService;
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

    /**
     * Local development login. Issues a real JWT for the given email without
     * requiring Google/Apple OAuth2 credentials. Creates the user in the current
     * tenant on first use. An email containing "admin" (or admin=true) gets the
     * ADMIN role so the admin product CRUD flow can be exercised end to end.
     */
    @PostMapping("/dev-login")
    public ResponseEntity<Map<String, Object>> devLogin(@RequestBody DevLoginRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        if (email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        String name = request.getName() == null ? "" : request.getName().trim();
        String firstName = "Dev";
        String lastName = "User";
        if (!name.isEmpty()) {
            String[] parts = name.split("\\s+", 2);
            firstName = parts[0];
            lastName = parts.length > 1 ? parts[1] : "";
        }

        User user = userService.findOrCreateUser("dev", email, email, firstName, lastName, null);

        boolean wantsAdmin = Boolean.TRUE.equals(request.getAdmin()) || email.contains("admin");
        boolean alreadyAdmin = user.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()));
        if (wantsAdmin && !alreadyAdmin) {
            userService.assignAdminRole(user.getId());
            user = userService.findByUsername(user.getUsername()).orElse(user);
        }

        String token = jwtUtil.generateToken(user.getUsername());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
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
        payload.put("roles", user.getRoles().stream().map(role -> role.getName()).toArray());
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
    public ResponseEntity<Map<String, String>> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Successfully logged out"));
    }
}
