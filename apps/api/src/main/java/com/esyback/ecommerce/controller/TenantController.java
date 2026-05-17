package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.CreateTenantRequest;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.service.MembershipService;
import com.esyback.ecommerce.service.TenantContextService;
import com.esyback.ecommerce.service.TenantService;
import com.esyback.ecommerce.service.UserService;
import com.esyback.ecommerce.web.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tenant")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TenantController {

    private final TenantContextService tenantContextService;
    private final TenantService tenantService;
    private final UserService userService;
    private final MembershipService membershipService;

    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentTenant() {
        Map<String, Object> body = TenantMapper.toMap(tenantContextService.getCurrentTenant());
        body.put("isPlatform", tenantContextService.isPlatformHost());
        return ResponseEntity.ok(body);
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listStores() {
        return ResponseEntity.ok(tenantService.listActiveStores().stream()
            .map(TenantMapper::toMap)
            .collect(Collectors.toList()));
    }

    @GetMapping("/subdomain")
    public ResponseEntity<Map<String, String>> getCurrentSubdomain() {
        String subdomain = tenantContextService.getCurrentSubdomain();
        return ResponseEntity.ok(Map.of("subdomain", subdomain));
    }

    @GetMapping("/available")
    public ResponseEntity<Map<String, Object>> checkSubdomain(@RequestParam String subdomain) {
        String status = tenantService.subdomainStatus(subdomain);
        return ResponseEntity.ok(Map.of("subdomain", subdomain, "status", status,
            "available", "available".equals(status)));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createTenant(@RequestBody CreateTenantRequest request,
                                                            Authentication authentication) {
        Tenant created = tenantService.createTenant(request);
        // The signed-in account that created it owns it (one account, many stores).
        if (authentication != null && authentication.isAuthenticated()) {
            userService.findByUsername(authentication.getName())
                .ifPresent(u -> membershipService.ensure(u, created, StoreMembership.Role.OWNER));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(TenantMapper.toMap(created));
    }

    // Surface the validation/conflict reason as { error }. Spring's default
    // error body masks the message (server.error.include-message=never), and
    // the SPA reads body.error.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
