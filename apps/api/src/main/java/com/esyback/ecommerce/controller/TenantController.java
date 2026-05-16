package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.service.TenantContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tenant")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TenantController {
    
    private final TenantContextService tenantContextService;
    
    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentTenant() {
        Tenant tenant = tenantContextService.getCurrentTenant();
        
        Map<String, Object> response = Map.of(
            "id", tenant.getId(),
            "name", tenant.getName(),
            "subdomain", tenant.getSubdomain(),
            "displayName", tenant.getDisplayName(),
            "description", tenant.getDescription(),
            "logoUrl", tenant.getLogoUrl(),
            "primaryColor", tenant.getPrimaryColor(),
            "secondaryColor", tenant.getSecondaryColor(),
            "isActive", tenant.getIsActive()
        );
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/subdomain")
    public ResponseEntity<Map<String, String>> getCurrentSubdomain() {
        String subdomain = tenantContextService.getCurrentSubdomain();
        return ResponseEntity.ok(Map.of("subdomain", subdomain));
    }
}
