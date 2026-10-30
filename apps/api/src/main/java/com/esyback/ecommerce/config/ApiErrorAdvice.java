package com.esyback.ecommerce.config;

import com.esyback.ecommerce.web.ApiRefusal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Puts the reason of a {@link ResponseStatusException} in the response body,
 * for every controller rather than the nine that each copied the same handler.
 *
 * <p>The codebase refuses requests with a sentence a person can act on — "Add
 * a phone number first", "Wait 42s before asking for another code", "SMS is
 * switched off. Turn it back on in admin integrations." Nine controllers carry
 * an identical private {@code @ExceptionHandler} to pass that reason on;
 * {@code AuthController}, {@code ContactChannelController},
 * {@code DeliveryController} and {@code StoreTeamController} do not, so theirs
 * fell through to Spring Boot's default error body — which omits
 * {@code message} unless {@code server.error.include-message} is set, leaving
 * {@code {"error":"Not Found"}}. The web client reads
 * {@code body.error || body.message}, so those refusals rendered as the bare
 * status phrase. One advice covers all of them; the per-controller copies still
 * win where they exist and can be deleted as they are touched.
 *
 * <p>This is an advice rather than {@code include-message: always} on purpose.
 * That flag also publishes the message of any <em>unhandled</em> exception —
 * a constraint-violation string, a driver error, a stack-trace-adjacent detail
 * — to anyone who can provoke one. A {@code ResponseStatusException} reason is
 * written to be read by the person who hit it; nothing else here is.
 */
@RestControllerAdvice
@Slf4j
public class ApiErrorAdvice {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException e) {
        HttpStatusCode status = e.getStatusCode();
        String reason = e.getReason();
        if (reason == null || reason.isBlank()) {
            // No reason was given: fall back to the status phrase, which is
            // what the client used to show for every one of these anyway.
            HttpStatus resolved = HttpStatus.resolve(status.value());
            reason = resolved == null ? "Request failed" : resolved.getReasonPhrase();
        }
        Map<String, Object> body = new LinkedHashMap<>();
        // "error" and "message" both carry it: the web client prefers "error",
        // and anything reading Spring's old shape finds "message" unchanged.
        body.put("error", reason);
        body.put("message", reason);
        body.put("status", status.value());
        if (e instanceof ApiRefusal refusal) body.put("code", refusal.getCode());
        // Headers the thrower attached are part of the refusal (Retry-After,
        // WWW-Authenticate) and are lost if this handler drops them.
        return ResponseEntity.status(status).headers(e.getHeaders()).body(body);
    }
}
