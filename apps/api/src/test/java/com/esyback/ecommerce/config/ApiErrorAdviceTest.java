package com.esyback.ecommerce.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The refusal reason the web client actually reads.
 *
 * <p>{@code api.js} resolves a failure message as {@code body.error ||
 * body.message}, so a body carrying neither renders Spring's bare status
 * phrase — "Service Unavailable" in place of "SMS is switched off. Turn it
 * back on in admin integrations." These assert the shape that contract
 * depends on.
 */
class ApiErrorAdviceTest {

    private final ApiErrorAdvice advice = new ApiErrorAdvice();

    @Test
    @DisplayName("the reason is the body's error AND message, under the thrown status")
    void carriesTheReason() {
        ResponseEntity<Map<String, Object>> res = advice.handle(new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE, "SMS is switched off. Turn it back on in admin integrations."));

        assertEquals(503, res.getStatusCode().value());
        Map<String, Object> body = res.getBody();
        assertEquals("SMS is switched off. Turn it back on in admin integrations.", body.get("error"));
        assertEquals("SMS is switched off. Turn it back on in admin integrations.", body.get("message"));
        assertEquals(503, body.get("status"));
    }

    @Test
    @DisplayName("a reasonless exception still says something, not null")
    void fallsBackToTheStatusPhrase() {
        Map<String, Object> body = advice.handle(
            new ResponseStatusException(HttpStatus.FORBIDDEN)).getBody();
        // Spring supplies "Forbidden" as the reason here; a blank one must not
        // reach the client as the literal text "null".
        assertEquals("Forbidden", body.get("error"));
    }

    @Test
    @DisplayName("headers attached to the refusal survive")
    void keepsHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Retry-After", "60");
        ResponseEntity<Map<String, Object>> res = advice.handle(new ResponseStatusException(
            HttpStatus.TOO_MANY_REQUESTS, "Wait 60s before asking for another code", null) {
            @Override
            public HttpHeaders getHeaders() {
                return headers;
            }
        });
        // Retry-After is the machine-readable half of a 429; dropping it in the
        // handler would leave only the sentence.
        assertEquals("60", res.getHeaders().getFirst("Retry-After"));
        assertEquals("Wait 60s before asking for another code", res.getBody().get("error"));
    }
}
