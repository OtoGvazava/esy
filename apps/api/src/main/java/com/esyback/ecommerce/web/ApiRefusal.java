package com.esyback.ecommerce.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A refusal with a stable {@code code} beside its sentence.
 *
 * <p>The reason is written for a person and is in English; the code is for the
 * web client, which has to show the refusal in Georgian too and so cannot key
 * its translations on English prose. {@code ApiErrorAdvice} puts both in the
 * body. Codes are part of the API: rename one and the client falls back to the
 * English reason.
 *
 * <p>Some sentences carry a value — the column a file is missing, how many rows
 * it had. Those values ride along as {@code details}, so the client can build
 * the same sentence in its own language instead of parsing ours.
 */
public class ApiRefusal extends ResponseStatusException {

    private final String code;
    private final Map<String, Object> details;

    public ApiRefusal(HttpStatus status, String code, String reason) {
        this(status, code, reason, Map.of());
    }

    public ApiRefusal(HttpStatus status, String code, String reason, Map<String, Object> details) {
        super(status, reason);
        this.code = code;
        // Insertion order kept, nulls dropped: a detail with no value says
        // nothing, and Map.copyOf would refuse it outright.
        Map<String, Object> kept = new LinkedHashMap<>();
        if (details != null) {
            details.forEach((k, v) -> { if (k != null && v != null) kept.put(k, v); });
        }
        this.details = java.util.Collections.unmodifiableMap(kept);
    }

    public String getCode() {
        return code;
    }

    /** The values the reason was built from; empty when the code says it all. */
    public Map<String, Object> getDetails() {
        return details;
    }
}
