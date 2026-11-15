package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.config.AppProperties;
import com.esyback.ecommerce.config.BogProperties;
import com.esyback.ecommerce.config.DesignProperties;
import com.esyback.ecommerce.config.PlatformProperties;
import com.esyback.ecommerce.entity.AuditLog;
import com.esyback.ecommerce.repository.AuditLogRepository;
import com.esyback.ecommerce.service.ConfigStore;
import com.esyback.ecommerce.service.TenantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * ADMIN-only live config. GET returns the currently-effective values (read from
 * the config beans); PUT validates and writes changed keys to the {@link
 * ConfigStore} (Redis/Valkey), which the beans then read on their next call —
 * within the store's short cache TTL, no redeploy. Gated by {@code @PreAuthorize}
 * (method security is enabled), so the URL being permitAll is fine.
 */
@RestController
@RequestMapping("/api/admin/config")
@RequiredArgsConstructor
public class AdminConfigController {

    private final BogProperties bog;
    private final PlatformProperties platform;
    private final AppProperties app;
    private final ConfigStore store;
    private final DesignProperties design;
    private final AuditLogRepository auditLog;

    /** The JSON field each editable value travels under, and its config-store key. */
    private static final Map<String, String> FIELD_KEYS = new LinkedHashMap<>();
    static {
        FIELD_KEYS.put("serviceFeeRate", "app.platform.service-fee-rate");
        FIELD_KEYS.put("bogEnv", "app.bog.env");
        FIELD_KEYS.put("bogAuthUrl", "app.bog.auth-url");
        FIELD_KEYS.put("bogBaseUrl", "app.bog.base-url");
        FIELD_KEYS.put("publicBaseUrl", "app.public-base-url");
        FIELD_KEYS.put("designEnabled", DesignProperties.ENABLED_KEY);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> current() {
        Map<String, Object> m = new HashMap<>();
        m.put("serviceFeeRate", platform.getServiceFeeRate());
        m.put("bogEnv", bog.getEnv());
        m.put("bogAuthUrl", bog.getAuthUrl());
        m.put("bogBaseUrl", bog.getBaseUrl());
        m.put("publicBaseUrl", app.getPublicBaseUrl());
        // Store design kill switch (app.design.enabled), a boolean.
        m.put("designEnabled", design.isEnabled());
        // Whether writes are possible right now (config store reachable).
        m.put("storeReady", store.ready());
        // Per field: is the value in effect an override written from this
        // screen ("override") or the environment's ("env"), and what the
        // environment says underneath — the value an override falls back to
        // when it is cleared or lost with the Key Value instance. None of
        // these keys is a secret.
        Map<String, String> sources = new LinkedHashMap<>();
        Map<String, String> envValues = new LinkedHashMap<>();
        FIELD_KEYS.forEach((field, key) -> {
            sources.put(field, store.source(key));
            envValues.put(field, store.envValue(key));
        });
        m.put("sources", sources);
        m.put("envValues", envValues);
        // Read-only: the names no merchant can register. The admin config screen
        // shows these beside the editable values because they are the other half
        // of "what is fixed about this platform", and sorted so the list reads
        // the same on every request.
        m.put("reservedSubdomains", TenantService.reservedSubdomains().stream().sorted().toList());
        return m;
    }

    /**
     * Update any subset of keys. Only keys present in the body are written, so
     * the UI can save a single field. Each write is validated server-side —
     * a live edit takes effect in seconds with no PR/review gate.
     */
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> update(@RequestBody Map<String, String> body,
                                                      Authentication authentication) {
        String actor = authentication == null ? null : authentication.getName();
        // Every value is validated before any is written: validating as it
        // went, a body whose last field was bad answered 422 with the fee rate
        // before it already live.
        Map<String, String> writes = new LinkedHashMap<>();
        if (body.containsKey("serviceFeeRate")) {
            BigDecimal rate;
            try {
                rate = new BigDecimal(body.get("serviceFeeRate").trim());
            } catch (Exception e) {
                throw bad("serviceFeeRate must be a number, e.g. 0.02");
            }
            if (rate.signum() < 0 || rate.compareTo(BigDecimal.ONE) > 0) {
                throw bad("serviceFeeRate must be between 0 and 1 (0.02 = 2%)");
            }
            writes.put("serviceFeeRate", rate.toPlainString());
        }
        if (body.containsKey("bogEnv")) {
            String env = body.get("bogEnv") == null ? "" : body.get("bogEnv").trim().toLowerCase();
            if (!env.equals("live") && !env.equals("sandbox")) {
                throw bad("bogEnv must be 'live' or 'sandbox'");
            }
            writes.put("bogEnv", env);
        }
        // Every merchant's decrypted BOG secret is POSTed to the auth URL, and
        // shoppers are sent to pay at the base URL, so both may only point at
        // BOG itself, over https (review M26).
        if (body.containsKey("bogAuthUrl")) {
            writes.put("bogAuthUrl", validBogUrlOrBlank(body.get("bogAuthUrl")));
        }
        if (body.containsKey("bogBaseUrl")) {
            writes.put("bogBaseUrl", validBogUrlOrBlank(body.get("bogBaseUrl")));
        }
        if (body.containsKey("publicBaseUrl")) {
            writes.put("publicBaseUrl", validUrlOrBlank(body.get("publicBaseUrl")));
        }
        // Off: storefronts draw today's chrome, registration keeps today's
        // brand step and nothing can be published (see DesignProperties).
        // "true"/"false" only — a JSON boolean binds to the same strings.
        if (body.containsKey("designEnabled")) {
            String on = body.get("designEnabled") == null ? "" : body.get("designEnabled").trim().toLowerCase();
            if (!on.equals("true") && !on.equals("false")) {
                throw bad("designEnabled must be true or false");
            }
            writes.put("designEnabled", on);
        }

        // Then written as one: all of them land or none (ConfigStore.inOneWrite),
        // and only then audited, each with who changed it from what.
        Map<String, String> before = new LinkedHashMap<>();
        writes.keySet().forEach(field -> before.put(field, effectiveValue(field)));
        store.inOneWrite(() -> writes.forEach((field, value) -> {
            if (field.equals("designEnabled")) design.setEnabled(value.equals("true"));
            else store.set(FIELD_KEYS.get(field), value);
        }));
        writes.forEach((field, value) -> audit(actor, field, before.get(field) + " -> " + value));
        return ResponseEntity.ok(Map.of(
            "ok", true,
            "note", "Written to the config store; the change applies within a few seconds."));
    }

    /** Blank, or an https URL on bog.ge or one of its subdomains. */
    static String validBogUrlOrBlank(String value) {
        String s = value == null ? "" : value.trim();
        if (s.isEmpty()) return s;
        java.net.URI uri;
        try {
            uri = new java.net.URI(s);
        } catch (java.net.URISyntaxException e) {
            throw bad("That is not a valid URL");
        }
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getUserInfo() != null
                || !(host.equals("bog.ge") || host.endsWith(".bog.ge"))) {
            throw bad("A Bank of Georgia URL must be https:// on bog.ge (or be blank to use the default)");
        }
        return s;
    }

    /** The value in effect for a field before a write, for the audit trail. */
    private String effectiveValue(String field) {
        Object v = switch (field) {
            case "serviceFeeRate" -> platform.getServiceFeeRate();
            case "bogEnv" -> bog.getEnv();
            case "bogAuthUrl" -> bog.getAuthUrl();
            case "bogBaseUrl" -> bog.getBaseUrl();
            case "publicBaseUrl" -> app.getPublicBaseUrl();
            case "designEnabled" -> design.isEnabled();
            default -> null;
        };
        return v == null ? "" : (v instanceof BigDecimal d ? d.toPlainString() : String.valueOf(v));
    }

    private void audit(String actor, String key, String value) {
        auditLog.save(AuditLog.of(actor == null ? "unknown" : actor, "CONFIG_CHANGED", "CONFIG", key, value));
    }

    private String validUrlOrBlank(String value) {
        String s = value == null ? "" : value.trim();
        if (!s.isEmpty() && !s.startsWith("http://") && !s.startsWith("https://")) {
            throw bad("URL must start with http:// or https:// (or be blank to use the default)");
        }
        return s;
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, msg);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
