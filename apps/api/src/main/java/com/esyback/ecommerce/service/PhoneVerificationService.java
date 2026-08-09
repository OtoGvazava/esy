package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Dev stand-in phone verification: generates a 4-digit code, logs it (no real
 * SMS is sent) and checks it against an in-memory store. The HTTP contract is
 * the same one a real SMS provider would use, so swapping {@link #sendCode}
 * for a Georgian SMS aggregator later needs no controller or frontend changes.
 *
 * Four digits, not six: the design draws four cells and its copy says "a
 * four-digit code". The length is part of the interface, so the generator
 * follows the design rather than the other way round.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PhoneVerificationService {

    private record Pending(String code, Instant expiresAt) {}

    private static final long TTL_SECONDS = 600; // 10 minutes

    private final ConcurrentHashMap<Long, Pending> pending = new ConcurrentHashMap<>();
    private final UserService userService;

    /** Issues a fresh code for the user's current phone number. Returns it so
     *  the dev stand-in can surface it (a real provider would only SMS it). */
    public String sendCode(User user) {
        String phone = user.getPhoneNumber();
        if (phone == null || phone.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a phone number first");
        }
        String code = String.format("%04d", ThreadLocalRandom.current().nextInt(0, 10_000));
        pending.put(user.getId(), new Pending(code, Instant.now().plusSeconds(TTL_SECONDS)));
        log.info("DEV phone OTP for {} (user {}) = {}", phone, user.getId(), code);
        return code;
    }

    /** Verifies a submitted code and marks the user's phone verified. */
    public void verify(User user, String code) {
        Pending p = pending.get(user.getId());
        if (p == null || Instant.now().isAfter(p.expiresAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Code expired — request a new one");
        }
        if (code == null || !code.trim().equals(p.code())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Incorrect code");
        }
        pending.remove(user.getId());
        user.setPhoneVerified(true);
        userService.save(user);
    }
}
