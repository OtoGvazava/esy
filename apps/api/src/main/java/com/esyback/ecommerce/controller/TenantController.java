package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.CreateTenantRequest;
import com.esyback.ecommerce.dto.UpdateStoreRequest;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.StoreFollowRepository;
import com.esyback.ecommerce.service.MembershipService;
import com.esyback.ecommerce.service.OrderService;
import com.esyback.ecommerce.service.TenantContextService;
import com.esyback.ecommerce.service.TenantService;
import com.esyback.ecommerce.service.UserService;
import com.esyback.ecommerce.web.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    private final OrderService orderService;
    private final ProductRepository productRepository;
    private final StoreFollowRepository storeFollowRepository;

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

    // Edit the current store's branding. The store is resolved from the Host
    // header (same as everything else), and @storeAccess only lets the store's
    // OWNER (or a global ADMIN) through, so an owner can only edit their own.
    @PutMapping("/current")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> updateCurrentStore(@RequestBody UpdateStoreRequest request) {
        Tenant updated = tenantService.updateBranding(tenantContextService.getCurrentTenant(), request);
        return ResponseEntity.ok(TenantMapper.toMap(updated));
    }

    // Owner/admin dashboard numbers for the current store (Host-resolved).
    // Same @storeAccess gate as the branding edit, so only the store's owner
    // (or a global admin) can read its stats.
    @GetMapping("/stats")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> currentStoreStats() {
        Tenant tenant = tenantContextService.getCurrentTenant();
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("store", TenantMapper.toMap(tenant));
        body.put("products", productRepository.countByTenant(tenant));
        body.put("orders", orderService.orderCount(tenant));
        body.put("revenue", orderService.revenue(tenant));
        body.put("followers", storeFollowRepository.countByTenant(tenant));
        return ResponseEntity.ok(body);
    }

    // Orders placed against the current store, newest first. Same owner/admin
    // gate as /stats; the storefront's owner Orders page lists these.
    @GetMapping("/orders")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<List<Map<String, Object>>> currentStoreOrders() {
        Tenant tenant = tenantContextService.getCurrentTenant();
        return ResponseEntity.ok(orderService.ordersForTenant(tenant).stream()
            .map(OrderController::toMap)
            .collect(Collectors.toList()));
    }

    // Lightweight count of new (PLACED) orders for the current store — drives
    // the storefront owner-bar Orders badge without pulling the full list.
    @GetMapping("/orders/new-count")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> currentStoreNewOrderCount() {
        Tenant tenant = tenantContextService.getCurrentTenant();
        return ResponseEntity.ok(Map.of("count", orderService.newOrderCount(tenant)));
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
