package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.config.AppProperties;
import com.esyback.ecommerce.config.BogProperties;
import com.esyback.ecommerce.config.PlatformProperties;
import com.esyback.ecommerce.service.ConsulConfigWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/**
 * ADMIN-only live config. GET returns the currently-effective values (read from
 * the refreshable {@code @ConfigurationProperties} beans); PUT validates and
 * writes changed keys to Consul KV, which the config watch then hot-refreshes
 * into those beans — no redeploy. Gated by {@code @PreAuthorize} (method
 * security is enabled), so the URL being permitAll is fine.
 */
@RestController
@RequestMapping("/api/admin/config")
@RequiredArgsConstructor
public class AdminConfigController {

    private final BogProperties bog;
    private final PlatformProperties platform;
    private final AppProperties app;
    private final ConsulConfigWriter consul;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> current() {
        Map<String, Object> m = new HashMap<>();
        m.put("serviceFeeRate", platform.getServiceFeeRate());
        m.put("bogEnv", bog.getEnv());
        m.put("bogAuthUrl", bog.getAuthUrl());
        m.put("bogBaseUrl", bog.getBaseUrl());
        m.put("publicBaseUrl", app.getPublicBaseUrl());
        // Whether writes are possible right now (Consul reachable/enabled).
        m.put("consulEnabled", consul.isEnabled());
        return m;
    }

    /**
     * Update any subset of keys. Only keys present in the body are written, so
     * the UI can save a single field. Each write is validated server-side —
     * a live edit takes effect in seconds with no PR/review gate.
     */
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> update(@RequestBody Map<String, String> body) {
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
            consul.put("app.platform.service-fee-rate", rate.toPlainString());
        }
        if (body.containsKey("bogEnv")) {
            String env = body.get("bogEnv") == null ? "" : body.get("bogEnv").trim().toLowerCase();
            if (!env.equals("live") && !env.equals("sandbox")) {
                throw bad("bogEnv must be 'live' or 'sandbox'");
            }
            consul.put("app.bog.env", env);
        }
        if (body.containsKey("bogAuthUrl")) {
            consul.put("app.bog.auth-url", validUrlOrBlank(body.get("bogAuthUrl")));
        }
        if (body.containsKey("bogBaseUrl")) {
            consul.put("app.bog.base-url", validUrlOrBlank(body.get("bogBaseUrl")));
        }
        if (body.containsKey("publicBaseUrl")) {
            consul.put("app.public-base-url", validUrlOrBlank(body.get("publicBaseUrl")));
        }
        return ResponseEntity.ok(Map.of(
            "ok", true,
            "note", "Written to Consul; the change applies within a few seconds via the config watch."));
    }

    private String validUrlOrBlank(String value) {
        String s = value == null ? "" : value.trim();
        if (!s.isEmpty() && !s.startsWith("http://") && !s.startsWith("https://")) {
            throw bad("URL must start with http:// or https:// (or be blank to use the default)");
        }
        return s;
    }

    private ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, msg);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
