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
 * Phone verification: generates a 4-digit code, sends it by SMS and checks it
 * against an in-memory store.
 *
 * <p>Four digits, not six: the design draws four cells and its copy says "a
 * four-digit code". The length is part of the interface, so the generator
 * follows the design rather than the other way round.
 *
 * <p><b>The dev fallback is gated.</b> This used to return the code to the
 * caller unconditionally and log it, with no SMS behind it — which meant a
 * production sign-up handed the verification code straight back to whoever
 * asked for it, making the check worthless. The code is now returned ONLY when
 * no SMS account is configured, which is the local case; wire a key and the
 * only way to learn the code is to hold the phone.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PhoneVerificationService {

    private record Pending(String code, Instant expiresAt) {}

    private static final long TTL_SECONDS = 600; // 10 minutes

    private final ConcurrentHashMap<Long, Pending> pending = new ConcurrentHashMap<>();
    private final UserService userService;
    private final SmsSender sms;
    private final SmsTemplates templates;

    /**
     * Issues a fresh code for the user's current phone number and sends it.
     *
     * @return the code when running WITHOUT an SMS account (local development),
     *         so it can be entered without a real message; {@code null} when a
     *         real message was sent. Never returns the code in a configured
     *         environment.
     */
    public String sendCode(User user) {
        String phone = user.getPhoneNumber();
        if (phone == null || phone.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a phone number first");
        }
        String code = String.format("%04d", ThreadLocalRandom.current().nextInt(0, 10_000));

        // The master switch is off: no message can be sent, and falling back to
        // handing the code to the browser would turn a cost decision into a way
        // past verification. Say so instead.
        if (sms.isConfigured() && !sms.isSending()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "SMS is switched off. Turn it back on in admin integrations.");
        }

        if (!sms.isConfigured()) {
            pending.put(user.getId(), new Pending(code, Instant.now().plusSeconds(TTL_SECONDS)));
            log.info("DEV phone OTP for user {} = {} (no SMS account configured)", user.getId(), code);
            return code;
        }

        // Store only after the send succeeds. Storing first would leave a
        // pending code the person never received, and the next attempt would
        // replace it anyway — better that a failed send changes nothing.
        if (!sms.send(phone, templates.render(SmsTemplates.OTP, java.util.Map.of("code", code)))) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Could not send the code right now. Please try again.");
        }
        pending.put(user.getId(), new Pending(code, Instant.now().plusSeconds(TTL_SECONDS)));
        return null;
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
