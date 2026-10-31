package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.CreateTenantRequest;
import com.esyback.ecommerce.dto.UpdateStoreRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.TenantLogo;
import com.esyback.ecommerce.entity.TenantCover;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.service.MembershipService;
import com.esyback.ecommerce.service.OrderService;
import com.esyback.ecommerce.service.TenantContextService;
import com.esyback.ecommerce.service.TenantCoverService;
import com.esyback.ecommerce.service.TenantDesignService;
import com.esyback.ecommerce.service.TenantLogoService;
import com.esyback.ecommerce.service.TenantService;
import com.esyback.ecommerce.service.UserService;
import com.esyback.ecommerce.service.BogPaymentService;
import com.esyback.ecommerce.web.TenantMapper;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tenant")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TenantController {

    private final TenantContextService tenantContextService;
    private final TenantService tenantService;
    private final TenantLogoService tenantLogoService;
    private final UserService userService;
    private final MembershipService membershipService;
    private final OrderService orderService;
    private final ProductRepository productRepository;
    private final TenantDesignService tenantDesignService;
    private final TenantCoverService tenantCoverService;

    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentTenant() {
        Tenant tenant = tenantContextService.getCurrentTenant();
        Map<String, Object> body = TenantMapper.toMap(tenant);
        body.put("isPlatform", tenantContextService.isPlatformHost());
        // The design switch rides every response, the platform host's too:
        // registration reads it there to choose quick setup or today's brand
        // step. Read once, so `design` and `designEnabled` cannot disagree.
        boolean designOn = tenantDesignService.isEnabled();
        body.put("designEnabled", designOn);
        // The published design, colours merged in from primaryColor /
        // secondaryColor. Null when nothing is published or the switch is off,
        // and the storefront then draws today's chrome. Never the draft.
        body.put("design", designOn ? tenantDesignService.published(tenant) : null);
        // The cover header's photo, or null; an id-only lookup, never the bytes.
        body.put("coverUrl", tenantCoverService.currentCoverUrl(tenant));
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
        Map<String, Object> body = TenantMapper.toMap(created);
        // What quick setup published, as GET /current will serve it.
        body.put("design", tenantDesignService.storefrontDesign(created));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    // Edit the current store's branding. The store is resolved from the Host
    // header (same as everything else), and @storeAccess only lets the store's
    // OWNER (or a global ADMIN) through, so an owner can only edit their own.
    // OWNER-only (decision D5): store identity/branding is the store itself,
    // not day-to-day running — a MANAGER may not edit it.
    @PutMapping("/current")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> updateCurrentStore(@RequestBody UpdateStoreRequest request) {
        Tenant updated = tenantService.updateBranding(tenantContextService.getCurrentTenant(), request);
        return ResponseEntity.ok(TenantMapper.toMap(updated));
    }

    // ---- Store design (docs/plans/store-design-system.md, Phase 1) --------
    // OWNER-only, the same gate as the branding edit above: the design is the
    // store's identity, not day-to-day running, so a MANAGER gets 403 (D5).

    /** The editor's view: {@code {draft, published, draftUpdatedAt, publishedAt}}. */
    @GetMapping("/current/design")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> currentDesign() {
        return ResponseEntity.ok(tenantDesignService.ownerView(tenantContextService.getCurrentTenant()));
    }

    /**
     * Saves the draft and returns it normalised: unknown keys dropped, unknown
     * values defaulted. Taken as raw text so the 8 KB cap is measured on what
     * was actually sent; over it, or not a JSON object, is a 400.
     */
    @PutMapping("/current/design/draft")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<JsonNode> saveDesignDraft(@RequestBody String body) {
        return ResponseEntity.ok(tenantDesignService.saveDraft(tenantContextService.getCurrentTenant(), body));
    }

    /**
     * Draft → published: its colours go to primaryColor / secondaryColor, the
     * rest is stored without them, and the draft is cleared. 409 when there
     * is no draft, 503 while the design switch is off.
     */
    @PostMapping("/current/design/publish")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> publishDesign() {
        return ResponseEntity.ok(tenantDesignService.publish(tenantContextService.getCurrentTenant()));
    }

    /** Discards the draft; the published design stays live. */
    @DeleteMapping("/current/design/draft")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> discardDesignDraft() {
        return ResponseEntity.ok(tenantDesignService.discardDraft(tenantContextService.getCurrentTenant()));
    }

    // Owner/admin uploads the store logo (replaces any existing one). Stored in
    // our DB like product photos; the response is the fresh tenant whose
    // logoUrl now points at the served bytes.
    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> uploadLogo(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(TenantMapper.toMap(tenantLogoService.setLogo(file)));
    }

    // Owner/admin removes the store logo (clears logoUrl, drops the bytes).
    @DeleteMapping("/logo")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> deleteLogo() {
        return ResponseEntity.ok(TenantMapper.toMap(tenantLogoService.clearLogo()));
    }

    // Public: streams the logo bytes for an <img src>. Long-cached + ETag —
    // logo ids are immutable (a re-upload is a new id, new URL).
    @GetMapping("/logo/{logoId}")
    public ResponseEntity<byte[]> serveLogo(@PathVariable Long logoId) {
        TenantLogo logo = tenantLogoService.getForServing(logoId);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(logo.getContentType()))
            .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic())
            .eTag(String.valueOf(logo.getId()))
            .body(logo.getData());
    }

    // ---- Cover photo (store design plan, Phase 1) -------------------------
    // The logo's three endpoints, for the picture the cover header draws:
    // the same OWNER-only gate, the same validation, the same immutable,
    // long-cached ids. Answers the store with its new `coverUrl`.

    @PostMapping(value = "/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> uploadCover(@RequestParam("file") MultipartFile file) {
        String url = tenantCoverService.setCover(file);
        Map<String, Object> body = TenantMapper.toMap(tenantContextService.getCurrentTenant());
        body.put("coverUrl", url);
        return ResponseEntity.ok(body);
    }

    @DeleteMapping("/cover")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> deleteCover() {
        tenantCoverService.clearCover();
        Map<String, Object> body = TenantMapper.toMap(tenantContextService.getCurrentTenant());
        body.put("coverUrl", null);
        return ResponseEntity.ok(body);
    }

    // Public, for an <img src>. A re-upload is a new id and a new URL, so a
    // year's cache is safe.
    @GetMapping("/cover/{coverId}")
    public ResponseEntity<byte[]> serveCover(@PathVariable Long coverId) {
        TenantCover cover = tenantCoverService.getForServing(coverId);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(cover.getContentType()))
            .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic())
            .eTag(String.valueOf(cover.getId()))
            .body(cover.getData());
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
        body.put("serviceFeesOwed", orderService.serviceFeesOwed(tenant));
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

    /**
     * One order for the current store, with its line items.
     *
     * <p>The list endpoint returns an item COUNT, which is all a table row
     * needs; a detail screen needs the lines themselves. They are added here
     * rather than to the list so a store with hundreds of orders does not pay
     * for every line on every page load.
     */
    @GetMapping("/orders/{orderId}")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> currentStoreOrder(@PathVariable Long orderId) {
        Tenant tenant = tenantContextService.getCurrentTenant();
        return orderService.orderForTenant(tenant, orderId)
            .map(order -> {
                Map<String, Object> m = new java.util.HashMap<>(OrderController.toMap(order));
                m.put("lines", order.getItems().stream().map(it -> {
                    Map<String, Object> line = new java.util.HashMap<>();
                    line.put("id", it.getId());
                    line.put("productId", it.getProductId());
                    line.put("title", it.getTitle());
                    line.put("price", it.getPrice());
                    line.put("quantity", it.getQuantity());
                    line.put("variantLabel", it.getVariantLabel());
                    return line;
                }).collect(Collectors.toList()));
                return ResponseEntity.ok(m);
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Lightweight count of new (PLACED) orders for the current store, without
    // pulling the full list. Currently unused by the SPA: it drove the
    // storefront owner-bar badge, which the manager migration removed. Kept
    // deliberately — the manager design reinstates it as the Orders nav badge.
    @GetMapping("/orders/new-count")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> currentStoreNewOrderCount() {
        Tenant tenant = tenantContextService.getCurrentTenant();
        return ResponseEntity.ok(Map.of("count", orderService.newOrderCount(tenant)));
    }

    /**
     * Fulfilment transition for one of the current store's orders (decision
     * D1). Legal moves are enforced in OrderService: PLACED→SHIPPED→
     * OUT_FOR_DELIVERY→DELIVERED, cancel only from PLACED or SHIPPED. Body:
     * {"status": "SHIPPED"}.
     */
    @PatchMapping("/orders/{orderId}/status")
    @PreAuthorize("@storeAccess.canManageCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> updateOrderStatus(@PathVariable Long orderId,
                                                                 @RequestBody Map<String, String> body) {
        Order.Status next;
        try {
            next = Order.Status.valueOf(body.getOrDefault("status", "").trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown status");
        }
        Tenant tenant = tenantContextService.getCurrentTenant();
        return ResponseEntity.ok(OrderController.toMap(orderService.updateStatus(tenant, orderId, next)));
    }

    /**
     * Refunds money for one of the current store's orders (decision D2).
     *
     * <p>Owner-only, unlike the fulfilment transition above. A manager moves
     * orders along; sending money back out of the business is the owner's
     * decision, and the two should not share a permission.
     *
     * <p>Body: {@code {"amount": "10.50"}} for a partial refund, or {@code {}}
     * to return everything still refundable. D2 keeps this separate from
     * cancellation: the fulfilment status is not touched, because a delivered
     * order that was refunded was still delivered.
     *
     * <p>The response's paymentStatus will read {@code refund_pending}, not
     * {@code refunded} — BOG's refund API is asynchronous and only confirms
     * later, via the callback or the next receipt poll.
     */
    @PostMapping("/orders/{orderId}/refund")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<Map<String, Object>> refundOrder(@PathVariable Long orderId,
                                                           @RequestBody(required = false) Map<String, String> body) {
        String raw = body == null ? null : body.get("amount");
        java.math.BigDecimal amount = null;
        if (raw != null && !raw.isBlank()) {
            try {
                amount = new java.math.BigDecimal(raw.trim().replace(",", "."));
            } catch (NumberFormatException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "\"" + raw + "\" is not an amount");
            }
        }
        Tenant tenant = tenantContextService.getCurrentTenant();
        try {
            Order refunded = orderService.requestRefund(tenant, orderId, amount);
            Map<String, Object> m = new java.util.HashMap<>(OrderController.toMap(refunded));
            m.put("refunded", refunded.refundedOrZero());
            m.put("refundable", refunded.refundableAmount());
            return ResponseEntity.ok(m);
        } catch (BogPaymentService.BogUnreachableException e) {
            // 502 with the bank's silence spelled out. The claim was kept on
            // purpose, so the operator must check before retrying rather than
            // being invited to send the same money twice.
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, e.getMessage());
        }
    }

    // No local ResponseStatusException handler: ApiErrorAdvice writes the
    // same {error} plus message, status and, for an ApiRefusal, its code. The
    // copy that used to sit here won over the advice and dropped the code,
    // which the design endpoints' refusals need so the web can show them in
    // Georgian too.

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(Map.of("error", "Logo too large (max 5MB)"));
    }
}
