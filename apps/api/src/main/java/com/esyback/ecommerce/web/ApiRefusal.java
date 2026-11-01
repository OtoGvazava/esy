package com.esyback.ecommerce.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

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
 * <p>{@code details} carries the numbers a translated sentence needs — "3 tries
 * left" has to be rebuilt in Georgian, and parsing it back out of the English
 * reason would tie the client to its wording. The advice adds them to the body
 * beside the code; they never replace {@code error}, {@code message},
 * {@code status} or {@code code}.
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
        this.details = details == null ? Map.of() : Map.copyOf(details);
    }

    public String getCode() {
        return code;
    }

    /** What the client needs to say it in its own words; empty for most refusals. */
    public Map<String, Object> getDetails() {
        return details;
    }
}
