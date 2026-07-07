package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.config.AppProperties;
import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.service.BogPaymentService;
import com.esyback.ecommerce.service.OrderService;
import com.esyback.ecommerce.service.TenantContextService;
import com.esyback.ecommerce.service.UserService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

/**
 * Bank of Georgia hosted-payment ("standard process") checkout, per tenant.
 *
 * <pre>
 *   POST /api/payments/bog/checkout  → create local order + BOG order, return redirect URL
 *   POST /api/payments/bog/callback  → BOG async webhook (signed, public)
 *   GET  /api/payments/bog/status    → poll order payment state (reconciles via receipt)
 * </pre>
 *
 * Auth model mirrors {@link OrderController}: SecurityConfig is permitAll, so
 * the user/eligibility gate is enforced here. The callback is intentionally
 * unauthenticated (server-to-server) and instead trusts the RSA signature.
 */
@RestController
@RequestMapping("/api/payments/bog")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final OrderService orderService;
    private final BogPaymentService bogPaymentService;
    private final UserService userService;
    private final TenantContextService tenantContextService;
    private final ObjectMapper objectMapper;
    // The internet-reachable origin BOG redirects/calls back to. Blank =
    // derive from the request. Read at call time from a refreshable bean so it
    // can change live without a redeploy.
    private final AppProperties appProperties;

    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> checkout(@RequestBody CreateOrderRequest request,
                                                        Authentication authentication,
                                                        HttpServletRequest http) {
        User user = currentUser(authentication);
        requireOrderEligible(user);
        Tenant tenant = tenantContextService.getCurrentTenant();
        if (!bogPaymentService.isConfigured(tenant)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "This store has not enabled card payments");
        }

        Order order = orderService.createOrder(user, tenant, request);

        String base = origin(http);
        String num = URLEncoder.encode(order.getOrderNumber(), StandardCharsets.UTF_8);
        BogPaymentService.PaymentSession session = bogPaymentService.createPayment(
            tenant, order,
            base + "/api/payments/bog/callback",
            base + "/pay/return?order=" + num + "&status=success",
            base + "/pay/return?order=" + num + "&status=fail");

        orderService.markBogPending(order, session.bogOrderId());
        return ResponseEntity.ok(Map.of(
            "orderNumber", order.getOrderNumber(),
            "redirectUrl", session.redirectUrl()));
    }

    /**
     * BOG async webhook. Verifies the RSA signature over the raw body, then
     * settles the order by external_order_id. Always 200 once authentic so
     * BOG stops retrying; 401 only when the signature is invalid.
     */
    @PostMapping("/callback")
    public ResponseEntity<String> callback(@RequestBody(required = false) byte[] rawBody,
                                           @RequestHeader(value = "Callback-Signature", required = false)
                                           String signature) {
        if (rawBody == null) rawBody = new byte[0];
        if (!bogPaymentService.verifyCallbackSignature(rawBody, signature)) {
            log.warn("Rejected BOG callback: bad signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("invalid signature");
        }
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            JsonNode body = root.path("body");
            String externalId = body.path("external_order_id").asText(null);
            String statusKey = body.path("order_status").path("key").asText(null);
            Order.PaymentStatus mapped = bogPaymentService.mapStatus(statusKey);
            log.info("BOG callback: order={} status={} -> {}", externalId, statusKey, mapped);
            orderService.settlePayment(externalId, mapped);
        } catch (Exception e) {
            // Acknowledge anyway: a parse error won't fix itself on retry, and
            // we never want BOG hammering a poison callback forever.
            log.error("BOG callback processing error", e);
        }
        return ResponseEntity.ok("ok");
    }

    /**
     * Payment state for the return page. If still PENDING (e.g. the callback
     * never reached us in local dev), reconcile once against BOG's receipt.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(@RequestParam("order") String orderNumber,
                                                      Authentication authentication) {
        User user = currentUser(authentication);
        Order order = orderService.findByOrderNumber(orderNumber)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown order"));
        if (order.getUser() == null || !order.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your order");
        }
        if (order.getPaymentStatus() == Order.PaymentStatus.PENDING) {
            Optional<Order.PaymentStatus> reconciled =
                bogPaymentService.fetchReceiptStatus(order.getTenant(), order.getBogOrderId());
            if (reconciled.isPresent()) {
                order = orderService.settlePayment(orderNumber, reconciled.get()).orElse(order);
            }
        }
        // Null-coalesce defensively: the column is NOT NULL with a DB default
        // ('NONE') and the entity defaults to NONE, so this should never be
        // null — but a legacy row read before a backfill must not NPE the API.
        Order.PaymentStatus ps = order.getPaymentStatus();
        return ResponseEntity.ok(Map.of(
            "orderNumber", order.getOrderNumber(),
            "paymentStatus", (ps == null ? Order.PaymentStatus.NONE : ps).name(),
            "total", order.getTotal()));
    }

    // ---- helpers (mirrors OrderController) ----------------------------------

    private String origin(HttpServletRequest req) {
        String publicBaseUrl = appProperties.getPublicBaseUrl();
        if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
            return publicBaseUrl.replaceAll("/+$", "");
        }
        String scheme = req.getScheme();
        String host = req.getServerName();
        int port = req.getServerPort();
        boolean defaultPort = ("https".equals(scheme) && port == 443)
            || ("http".equals(scheme) && port == 80);
        return scheme + "://" + host + (defaultPort ? "" : ":" + port);
    }

    private void requireOrderEligible(User user) {
        if (!AccountController.profileComplete(user)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Complete your profile before ordering");
        }
        if (!Boolean.TRUE.equals(user.getPhoneVerified())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Verify your phone number before ordering");
        }
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        return userService.findByUsername(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
