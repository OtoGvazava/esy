package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.service.StoreStatsService;
import com.esyback.ecommerce.service.TenantContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * The current store's analytics and finances (the back office's X1 and X2),
 * beside the lifetime totals of {@code GET /api/tenant/stats}. The same gate:
 * the store's owner or a manager, resolved from the Host (or {@code ?tenant=}
 * on the back office host).
 */
@RestController
@RequestMapping("/api/tenant/stats")
@RequiredArgsConstructor
public class StoreStatsController {

    private final StoreStatsService storeStatsService;
    private final TenantContextService tenantContextService;

    /** {@code ?days=7|30|90}, or none for all time; any other value is a 400. */
    @GetMapping("/period")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> period(@RequestParam(required = false) Integer days) {
        return ResponseEntity.ok(storeStatsService.period(tenantContextService.getCurrentTenant(), days));
    }

    /** Revenue and the commission owed, month by month, newest first. */
    @GetMapping("/months")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> months() {
        return ResponseEntity.ok(storeStatsService.months(tenantContextService.getCurrentTenant()));
    }
}
