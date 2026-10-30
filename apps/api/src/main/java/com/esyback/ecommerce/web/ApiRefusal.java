package com.esyback.ecommerce.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * A refusal with a stable {@code code} beside its sentence.
 *
 * <p>The reason is written for a person and is in English; the code is for the
 * web client, which has to show the refusal in Georgian too and so cannot key
 * its translations on English prose. {@code ApiErrorAdvice} puts both in the
 * body. Codes are part of the API: rename one and the client falls back to the
 * English reason.
 */
public class ApiRefusal extends ResponseStatusException {

    private final String code;

    public ApiRefusal(HttpStatus status, String code, String reason) {
        super(status, reason);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
