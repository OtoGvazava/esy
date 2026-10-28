package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.OrderItem;
import com.esyback.ecommerce.config.BogProperties;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.security.SecretCipher;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bank of Georgia "standard process" e-commerce payment client, per tenant.
 *
 * <p>Each store carries its own BOG merchant credentials (issued on
 * bonline.bog.ge); this service mints/caches a bearer token per clientId,
 * creates the hosted-payment order, verifies the signed async callback, and
 * can reconcile a payment by polling BOG's receipt endpoint (used when the
 * callback can't reach us — e.g. local dev behind lvh.me).
 *
 * <p>Uses the JDK HTTP client + Jackson only (no new dependency).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class BogPaymentService {

    private final SecretCipher secretCipher;
    private final ObjectMapper objectMapper;
    // Runtime-refreshable config (env / host overrides / callback public key).
    // Read via getters at call time so an admin config change takes effect
    // without restarting — the service stays a singleton so tokenCache below is
    // preserved.
    private final BogProperties bog;

    // Live vs sandbox host pairs. Sandbox is BOG's fully-isolated test space
    // (no real charges; test cards on api.bog.ge/docs/sandbox/payments/test-cards).
    static final String LIVE_AUTH = "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";
    static final String LIVE_BASE = "https://api.bog.ge";
    static final String SANDBOX_AUTH = "https://oauth2-sandbox.bog.ge/auth/realms/bog/protocol/openid-connect/token";
    static final String SANDBOX_BASE = "https://api-sandbox.bog.ge";

    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    private record CachedToken(String token, long expiresAtMs) {}

    private final Map<String, CachedToken> tokenCache = new ConcurrentHashMap<>();

    /** Result of a successful create-order call. */
    public record PaymentSession(String bogOrderId, String redirectUrl) {}

    public boolean isConfigured(Tenant t) {
        return t != null
            && t.getBogClientId() != null && !t.getBogClientId().isBlank()
            && t.getBogClientSecret() != null && !t.getBogClientSecret().isBlank();
    }

    private boolean sandbox() {
        String e = bog.getEnv();
        return "sandbox".equalsIgnoreCase(e == null ? "" : e.trim());
    }

    /** Effective OAuth token endpoint — explicit override, else per {@code env}. */
    String authUrl() {
        String override = bog.getAuthUrl();
        return (override != null && !override.isBlank())
            ? override.trim() : (sandbox() ? SANDBOX_AUTH : LIVE_AUTH);
    }

    /** Effective API base URL — explicit override, else per {@code env}. */
    String baseUrl() {
        String override = bog.getBaseUrl();
        return (override != null && !override.isBlank())
            ? override.trim() : (sandbox() ? SANDBOX_BASE : LIVE_BASE);
    }

    /**
     * Read a response body as UTF-8, transparently gunzipping when needed. BOG
     * sometimes returns gzip-compressed responses (Content-Encoding: gzip, magic
     * bytes 0x1F 0x8B) that the JDK HttpClient neither negotiates away nor
     * auto-decodes — parsing the raw bytes as JSON otherwise throws
     * "Illegal character (CTRL-CHAR, code 31)".
     */
    String bodyString(HttpResponse<byte[]> res) {
        byte[] b = res.body();
        if (b == null || b.length == 0) return "";
        boolean gzip = b.length > 1 && (b[0] & 0xff) == 0x1f && (b[1] & 0xff) == 0x8b;
        if (!gzip) {
            gzip = res.headers().firstValue("content-encoding")
                .map(e -> e.toLowerCase().contains("gzip")).orElse(false);
        }
        if (gzip) {
            try (GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(b))) {
                return new String(gis.readAllBytes(), StandardCharsets.UTF_8);
            } catch (Exception e) {
                log.warn("BOG response looked gzip but failed to decode: {}", e.getMessage());
            }
        }
        return new String(b, StandardCharsets.UTF_8);
    }

    // ---- Create order -------------------------------------------------------

    /**
     * Create a BOG hosted-payment order for {@code order} on {@code tenant}'s
     * merchant account. {@code callbackUrl}/{@code successUrl}/{@code failUrl}
     * must be absolute, internet-reachable URLs (built from the public origin).
     */
    public PaymentSession createPayment(Tenant tenant, Order order,
                                        String callbackUrl, String successUrl, String failUrl) {
        if (!isConfigured(tenant)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "This store has not connected a payment provider");
        }
        String token = accessToken(tenant);

        List<Map<String, Object>> basket = new ArrayList<>();
        for (OrderItem it : order.getItems()) {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("product_id", String.valueOf(it.getProductId()));
            line.put("description", it.getTitle());
            line.put("quantity", it.getQuantity());
            line.put("unit_price", it.getPrice());
            basket.add(line);
        }

        Map<String, Object> purchaseUnits = new LinkedHashMap<>();
        purchaseUnits.put("currency", "GEL");
        // Charged amount is the server-persisted order total (== Σ basket),
        // never a client-supplied figure.
        purchaseUnits.put("total_amount", order.getTotal());
        purchaseUnits.put("basket", basket);

        Map<String, Object> redirectUrls = new LinkedHashMap<>();
        redirectUrls.put("success", successUrl);
        redirectUrls.put("fail", failUrl);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("callback_url", callbackUrl);
        body.put("external_order_id", order.getOrderNumber());
        body.put("purchase_units", purchaseUnits);
        body.put("redirect_urls", redirectUrls);

        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl() + "/payments/v1/ecommerce/orders"))
                .timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("Accept-Language", "ka")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();
            HttpResponse<byte[]> res = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
            String respBody = bodyString(res);
            if (res.statusCode() / 100 != 2) {
                log.warn("BOG create-order failed ({}): {}", res.statusCode(), respBody);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Payment provider rejected the order");
            }
            JsonNode json = objectMapper.readTree(respBody);
            String bogId = json.path("id").asText(null);
            String redirect = json.path("_links").path("redirect").path("href").asText(null);
            if (bogId == null || redirect == null) {
                log.warn("BOG create-order missing id/redirect: {}", respBody);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Payment provider returned an unexpected response");
            }
            return new PaymentSession(bogId, redirect);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("BOG create-order error", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach the payment provider");
        }
    }

    // ---- Token --------------------------------------------------------------

    private String accessToken(Tenant tenant) {
        String clientId = tenant.getBogClientId();
        CachedToken cached = tokenCache.get(clientId);
        if (cached != null && System.currentTimeMillis() < cached.expiresAtMs()) {
            return cached.token();
        }
        String clientSecret = secretCipher.decrypt(tenant.getBogClientSecret());
        String basic = Base64.getEncoder().encodeToString(
            (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(authUrl()))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Basic " + basic)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                .build();
            HttpResponse<byte[]> res = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
            String respBody = bodyString(res);
            if (res.statusCode() / 100 != 2) {
                log.warn("BOG auth failed ({}): {}", res.statusCode(), respBody);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Payment provider authentication failed");
            }
            JsonNode json = objectMapper.readTree(respBody);
            String token = json.path("access_token").asText(null);
            if (token == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Payment provider did not return a token");
            }
            // expires_in is documented as seconds; tolerate ms-like values.
            long expiresIn = json.path("expires_in").asLong(3600);
            if (expiresIn > 100_000) expiresIn = expiresIn / 1000;
            long ttlMs = Math.max(60, expiresIn - 60) * 1000L;
            tokenCache.put(clientId, new CachedToken(token, System.currentTimeMillis() + ttlMs));
            return token;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("BOG auth error", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach the payment provider");
        }
    }

    // ---- Callback signature -------------------------------------------------

    /**
     * Verify the {@code Callback-Signature} (base64, SHA256withRSA over the
     * raw request body) against BOG's public key. Returns {@code true} when
     * no public key is configured (dev) — fail-open is intentional there and
     * logged; production sets the key so it is fail-closed.
     */
    public boolean verifyCallbackSignature(byte[] rawBody, String signatureBase64) {
        String publicKeyPem = bog.getPublicKey();
        if (publicKeyPem == null || publicKeyPem.isBlank()) {
            log.warn("BOG_PUBLIC_KEY unset — skipping callback signature verification "
                + "(set it in production so callbacks are authenticated).");
            return true;
        }
        if (signatureBase64 == null || signatureBase64.isBlank()) {
            log.warn("BOG callback missing Callback-Signature header");
            return false;
        }
        try {
            String clean = publicKeyPem
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
            byte[] der = Base64.getDecoder().decode(clean);
            PublicKey key = KeyFactory.getInstance("RSA")
                .generatePublic(new X509EncodedKeySpec(der));
            Signature sig = Signature.getInstance("SHA256withRSA");
            sig.initVerify(key);
            sig.update(rawBody);
            return sig.verify(Base64.getDecoder().decode(signatureBase64));
        } catch (Exception e) {
            log.warn("BOG callback signature verification error: {}", e.getMessage());
            return false;
        }
    }

    // ---- Refund -------------------------------------------------------------

    /**
     * What BOG said about a refund request.
     *
     * @param accepted the request was taken (HTTP 2xx). NOT "the money moved" —
     *                 see below.
     * @param key      BOG's status key; {@code request_received} on acceptance
     * @param message  BOG's human-readable line, shown to the operator as-is
     *                 when something went wrong
     * @param actionId BOG's identifier for the action, worth keeping in the log
     *                 so a disputed refund can be traced with the bank
     */
    public record RefundResult(boolean accepted, String key, String message, String actionId) {}

    /**
     * Asks BOG to send money back.
     *
     * <p>{@code POST /payments/v1/payment/refund/{order_id}}, with {@code
     * amount} omitted for the whole order. Partial refunds may be repeated
     * until the processed total is reached.
     *
     * <p><b>This is asynchronous.</b> A 2xx means "request_received" — BOG has
     * accepted the instruction, not completed it. The settled outcome arrives
     * the same way a payment's does: a callback, or the next receipt poll,
     * where {@code refunded}/{@code refunded_partially} map to REFUNDED. So
     * acceptance must never be recorded as money returned.
     *
     * <p>An {@code Idempotency-Key} is sent on every attempt. BOG replays the
     * original response for a repeated key, which is the protection against a
     * retried HTTP call turning into two refunds.
     *
     * @param amount the partial amount, or null for the full order
     */
    public RefundResult refund(Tenant tenant, String bogOrderId, BigDecimal amount) {
        if (!isConfigured(tenant)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This store has no Bank of Georgia connection, so nothing can be refunded through it");
        }
        if (bogOrderId == null || bogOrderId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This order has no payment at the bank to refund");
        }
        // The documented example sends amount as a quoted decimal; an omitted
        // field means the full amount.
        String body = amount == null
            ? "{}"
            : "{\"amount\":\"" + amount.toPlainString() + "\"}";
        try {
            HttpRequest req = HttpRequest.newBuilder(
                    URI.create(baseUrl() + "/payments/v1/payment/refund/" + bogOrderId))
                .timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + accessToken(tenant))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
            HttpResponse<byte[]> res = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
            String raw = bodyString(res);
            String key = null;
            String message = null;
            String actionId = null;
            try {
                JsonNode json = objectMapper.readTree(raw);
                key = json.path("key").asText(null);
                message = json.path("message").asText(null);
                actionId = json.path("action_id").asText(null);
            } catch (Exception ignored) {
                // A body we cannot parse does not change whether it was accepted;
                // the status code decides, and the raw text goes to the log.
            }
            if (res.statusCode() / 100 != 2) {
                log.warn("BOG refund for {} -> HTTP {}: {}", bogOrderId, res.statusCode(), raw);
                return new RefundResult(false, key,
                    message != null ? message : "The bank refused the refund (HTTP " + res.statusCode() + ")",
                    actionId);
            }
            log.info("BOG refund accepted for {} (amount={}, key={}, action={})",
                bogOrderId, amount == null ? "full" : amount.toPlainString(), key, actionId);
            return new RefundResult(true, key, message, actionId);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            // Deliberately NOT turned into "refused". A timeout or a dropped
            // connection leaves the refund's real state unknown, and reporting
            // it as a failure would invite a second attempt at money that may
            // already be on its way back. The caller keeps its claim and tells
            // the operator to check with the bank.
            log.error("BOG refund call failed for {}: {}", bogOrderId, e.getClass().getSimpleName());
            throw new BogUnreachableException(
                "The refund was sent but the bank did not answer. Check the order at the bank "
                    + "before trying again — it may already be refunded.");
        }
    }

    /** The bank's answer never arrived; the refund's state is unknown. */
    public static class BogUnreachableException extends RuntimeException {
        public BogUnreachableException(String message) {
            super(message);
        }
    }

    // ---- Receipt reconcile (callback fallback) ------------------------------

    /** Poll BOG for the order's current status; empty if it can't be read. */
    public Optional<Order.PaymentStatus> fetchReceiptStatus(Tenant tenant, String bogOrderId) {
        if (!isConfigured(tenant) || bogOrderId == null) return Optional.empty();
        try {
            HttpRequest req = HttpRequest.newBuilder(
                    URI.create(baseUrl() + "/payments/v1/receipt/" + bogOrderId))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + accessToken(tenant))
                .header("Accept", "application/json")
                .GET()
                .build();
            HttpResponse<byte[]> res = http.send(req, HttpResponse.BodyHandlers.ofByteArray());
            if (res.statusCode() / 100 != 2) {
                log.debug("BOG receipt {} -> {}", bogOrderId, res.statusCode());
                return Optional.empty();
            }
            JsonNode json = objectMapper.readTree(bodyString(res));
            String key = json.path("order_status").path("key").asText(null);
            return Optional.ofNullable(mapStatus(key));
        } catch (Exception e) {
            log.debug("BOG receipt fetch error: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Map a BOG {@code order_status.key} to our {@link Order.PaymentStatus}.
     * null when the status is non-terminal (created/processing/…), so callers
     * leave the order PENDING.
     */
    public Order.PaymentStatus mapStatus(String bogStatusKey) {
        if (bogStatusKey == null) return null;
        return switch (bogStatusKey) {
            case "completed", "partial_completed" -> Order.PaymentStatus.PAID;
            case "rejected" -> Order.PaymentStatus.FAILED;
            case "refunded", "refunded_partially" -> Order.PaymentStatus.REFUNDED;
            default -> null; // created, processing, auth_requested, blocked …
        };
    }
}
