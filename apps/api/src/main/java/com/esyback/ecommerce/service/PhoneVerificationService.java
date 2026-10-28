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

    /** Mutable because the attempt count changes without a new code. */
    private static final class Pending {
        final String code;
        final Instant expiresAt;
        int attempts;

        Pending(String code, Instant expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
        }
    }

    private static final long TTL_SECONDS = 600; // 10 minutes

    /**
     * Guesses allowed per issued code. Four digits is 10 000 combinations, so
     * unlimited attempts inside the ten-minute window is a few seconds of
     * scripting — the length is fixed by D13, which means the brute-force
     * defence has to be here rather than in a longer code.
     */
    private static final int MAX_ATTEMPTS = 5;

    /**
     * Minimum gap between sends for one account. Every message costs real
     * money and lands on someone's phone, so an unthrottled endpoint is both a
     * bill and a way to harass a number the requester does not own.
     */
    private static final long RESEND_COOLDOWN_SECONDS = 60;

    private final ConcurrentHashMap<Long, Pending> pending = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Instant> lastSentAt = new ConcurrentHashMap<>();
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
            throw refuse(user, HttpStatus.BAD_REQUEST, "Add a phone number first");
        }
        // Throttle before generating anything: a refused request must not
        // replace the code the person is currently typing.
        Instant last = lastSentAt.get(user.getId());
        if (last != null) {
            long wait = RESEND_COOLDOWN_SECONDS - java.time.Duration.between(last, Instant.now()).toSeconds();
            if (wait > 0) {
                throw refuse(user, HttpStatus.TOO_MANY_REQUESTS,
                    "Wait " + wait + "s before asking for another code");
            }
        }

        String code = String.format("%04d", ThreadLocalRandom.current().nextInt(0, 10_000));

        // The master switch is off: no message can be sent, and falling back to
        // handing the code to the browser would turn a cost decision into a way
        // past verification. Say so instead.
        if (sms.isConfigured() && !sms.isSending()) {
            throw refuse(user, HttpStatus.SERVICE_UNAVAILABLE,
                "SMS is switched off. Turn it back on in admin integrations.");
        }

        if (!sms.isConfigured()) {
            issue(user, code);
            log.info("DEV phone OTP for user {} = {} (no SMS account configured)", user.getId(), code);
            return code;
        }

        // Store only after the send succeeds. Storing first would leave a
        // pending code the person never received, and the next attempt would
        // replace it anyway — better that a failed send changes nothing.
        if (!sms.send(phone, templates.render(SmsTemplates.OTP, java.util.Map.of("code", code)))) {
            throw refuse(user, HttpStatus.SERVICE_UNAVAILABLE,
                "Could not send the code right now. Please try again.");
        }
        // issue(), not a bare pending.put(): it also records the send time, and
        // the cooldown above reads that. Setting it only on the dev path left
        // the throttle inert in exactly the deployment where a message costs
        // money — an account could ask for codes in a loop all day.
        issue(user, code);
        log.info("Phone OTP sent for user {}", user.getId());
        return null;
    }

    /**
     * Refuses a send, in the log as well as to the caller.
     *
     * <p>Every one of these paths used to return a status and nothing else.
     * {@link SmsSender} logs its own failures, so an operator reasonably reads
     * silence as "the provider accepted it" — but a refusal here never reaches
     * the provider, and a successful send was equally silent, so the log could
     * not tell the two apart. Chasing a live "verification does not work" came
     * down to guessing between four indistinguishable outcomes.
     */
    private ResponseStatusException refuse(User user, HttpStatus status, String reason) {
        log.warn("Phone OTP refused for user {}: {} ({})", user.getId(), reason, status.value());
        return new ResponseStatusException(status, reason);
    }


    /** Records a freshly issued code and the moment it went out. */
    private void issue(User user, String code) {
        pending.put(user.getId(), new Pending(code, Instant.now().plusSeconds(TTL_SECONDS)));
        lastSentAt.put(user.getId(), Instant.now());
    }

    /**
     * Verifies a submitted code and marks the user's phone verified.
     *
     * <p>A wrong guess costs one of {@link #MAX_ATTEMPTS}. Running out discards
     * the code entirely rather than merely refusing that guess: leaving it live
     * would let an attacker keep trying with a fresh request, and the whole
     * point is that a four-digit secret must not survive being guessed at.
     */
    public void verify(User user, String code) {
        Pending p = pending.get(user.getId());
        if (p == null || Instant.now().isAfter(p.expiresAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Code expired — request a new one");
        }
        if (code == null || !code.trim().equals(p.code)) {
            p.attempts++;
            if (p.attempts >= MAX_ATTEMPTS) {
                pending.remove(user.getId());
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many wrong codes — request a new one");
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Incorrect code");
        }
        pending.remove(user.getId());
        lastSentAt.remove(user.getId());
        user.setPhoneVerified(true);
        userService.save(user);
    }
}
