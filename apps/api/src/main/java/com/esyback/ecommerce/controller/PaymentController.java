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

        // The callback goes to the public base URL, which BOG can reach. The
        // shopper goes back to the STORE they paid on: the base URL is the
        // platform's (www.esy.ge), which has no /pay/return, so every return
        // landed on a 404 and the shopper never saw a confirmation (review
        // M2). An origin that is not one of ours falls back to the base.
        String base = origin(http);
        String storeOrigin = com.esyback.ecommerce.security.TenantOrigins.of(http);
        String back = com.esyback.ecommerce.security.TenantOrigins.isAllowed(storeOrigin) ? storeOrigin : base;
        String num = URLEncoder.encode(order.getOrderNumber(), StandardCharsets.UTF_8);
        BogPaymentService.PaymentSession session = bogPaymentService.createPayment(
            tenant, order,
            base + "/api/payments/bog/callback",
            back + "/pay/return?order=" + num + "&status=success",
            back + "/pay/return?order=" + num + "&status=fail");

        orderService.markBogPending(order, session.bogOrderId());
        return ResponseEntity.ok(Map.of(
            "orderNumber", order.getOrderNumber(),
            "redirectUrl", session.redirectUrl()));
    }

    /**
     * BOG async webhook. Verifies the RSA signature over the raw body, then
     * settles the order by external_order_id — but only when the callback's
     * BOG {@code order_id} is the one BOG issued for THIS order at checkout
     * (under the store's own credentials). One public key signs callbacks for
     * every BOG merchant, so a genuinely signed callback about some other
     * merchant's payment must not settle our order just because it names our
     * order number. Always 200 once authentic so BOG stops retrying; 401 only
     * when the signature is invalid.
     */
    @PostMapping("/callback")
    public ResponseEntity<String> callback(@RequestBody(required = false) byte[] rawBody,
                                           @RequestHeader(value = "Callback-Signature", required = false)
                                           String signature) {
        if (rawBody == null) rawBody = new byte[0];
        // With a key, the body is trusted once its signature checks out. With
        // none, nothing in the body is believed: the callback only says "look
        // again", and the outcome comes from BOG's receipt, read with the
        // store's own credentials. So refunds and payments whose shopper
        // never came back still settle, and a forged body settles nothing.
        boolean keyed = bogPaymentService.hasCallbackKey();
        if (keyed && !bogPaymentService.verifyCallbackSignature(rawBody, signature)) {
            log.warn("Rejected BOG callback: bad signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("invalid signature");
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            // Acknowledged: a body that does not parse will not parse on a
            // retry either, and BOG must not hammer a poison callback forever.
            log.error("BOG callback body does not parse", e);
            return ResponseEntity.ok("ok");
        }
        try {
            JsonNode body = root.path("body");
            String externalId = body.path("external_order_id").asText(null);
            String bogOrderId = body.path("order_id").asText(null);
            String statusKey = body.path("order_status").path("key").asText(null);
            Order order = orderService.findByOrderNumber(externalId).orElse(null);
            if (order == null || order.getBogOrderId() == null || bogOrderId == null
                    || !order.getBogOrderId().equals(bogOrderId)) {
                log.warn("Ignored BOG callback: order={} bogOrderId={} does not match the payment issued for it",
                    externalId, bogOrderId);
                return ResponseEntity.ok("ok");
            }
            Order.PaymentStatus mapped = keyed
                ? bogPaymentService.mapStatus(statusKey)
                : bogPaymentService.fetchReceiptStatus(order.getTenant(), order.getBogOrderId()).orElse(null);
            log.info("BOG callback: order={} status={} -> {} ({})", externalId, statusKey, mapped,
                keyed ? "signed" : "from receipt, no key");
            orderService.settlePayment(externalId, mapped);
        } catch (Exception e) {
            // NOT acknowledged: a database hiccup while settling used to answer
            // 200, BOG stopped retrying, and a taken payment stayed PENDING
            // (review M32). settlePayment is idempotent, so a retry is safe.
            log.error("BOG callback could not be settled; asking BOG to retry", e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("retry");
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

    // No local ResponseStatusException handler: ApiErrorAdvice writes the
    // same {error} plus message, status and, for an ApiRefusal, its code. The
    // copy that sat here dropped the code, so screens could not tell
    // CARD_ONLY or STORE_SUSPENDED from any other refusal.
}
