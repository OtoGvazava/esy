package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.web.ApiRefusal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
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
 * <p><b>The number travels with the code.</b> A verified phone is required to
 * register, so an account must never be left without one. The number being
 * verified is therefore held beside the pending code and written to the
 * account only when the code is confirmed — changing a number keeps the old
 * one in force until then, instead of the old behaviour of clearing
 * verification the moment a new number was typed.
 *
 * <p><b>One number, one account.</b> Checked when a code is requested, so
 * nobody is charged an SMS for a number they cannot have, and again on
 * confirm, where the unique index on {@code verified_phone} settles a race
 * between two accounts.
 *
 * <p><b>The dev fallback is gated twice.</b> The code is returned to the caller
 * only when no SMS account is configured AND {@code app.sms.dev-fallback} is
 * on. Returning it whenever the key was missing used to be merely weak; with
 * registration depending on it, a hosted deployment that lost its key would
 * hand every new account its own code.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PhoneVerificationService {

    /** Mutable because the attempt count changes without a new code. */
    private static final class Pending {
        final String code;
        final String number;      // as the person typed it, for display
        final String normalised;  // as it will be stored in verified_phone
        final Instant expiresAt;
        int attempts;

        Pending(String code, String number, String normalised, Instant expiresAt) {
            this.code = code;
            this.number = number;
            this.normalised = normalised;
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
    static final int MAX_ATTEMPTS = 5;

    /**
     * Minimum gap between sends for one account. Every message costs real
     * money and lands on someone's phone, so an unthrottled endpoint is both a
     * bill and a way to harass a number the requester does not own.
     */
    private static final long RESEND_COOLDOWN_SECONDS = 60;

    /**
     * Sends to one NUMBER per day, across all accounts. Registration now forces
     * an SMS, so a script creating Google accounts could otherwise spend money
     * texting one victim from many accounts, each inside its own cooldown.
     */
    static final int MAX_SENDS_PER_NUMBER_PER_DAY = 5;

    private final ConcurrentHashMap<Long, Pending> pending = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Instant> lastSentAt = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Deque<Instant>> sendsByNumber = new ConcurrentHashMap<>();
    private final UserService userService;
    private final UserRepository userRepository;
    private final SmsSender sms;
    private final SmsTemplates templates;

    /**
     * Issues a fresh code for {@code requestedNumber} (or the account's current
     * number when it is blank) and sends it.
     *
     * @return the code when the dev fallback is allowed (local development),
     *         so it can be entered without a real message; {@code null} when a
     *         real message was sent. Never returns the code in a configured
     *         environment.
     */
    public String sendCode(User user, String requestedNumber) {
        String phone = requestedNumber == null || requestedNumber.isBlank()
            ? user.getPhoneNumber() : requestedNumber.trim();
        if (phone == null || phone.isBlank()) {
            throw refuse(user, HttpStatus.BAD_REQUEST, "PHONE_MISSING", "Add a phone number first");
        }
        // A number no message can reach is the caller's mistake, not a
        // transient fault: the generic "could not send, please try again" that
        // a failed send produces would invite them to retry forever. Say what
        // is actually wrong, and say it before a code is generated.
        String normalised = SmsSender.normalisePhone(phone);
        if (normalised == null) {
            throw refuse(user, HttpStatus.BAD_REQUEST, "PHONE_INVALID",
                "That phone number does not look right — check it and try again");
        }
        if (userRepository.existsByVerifiedPhoneAndIdNot(normalised, user.getId())) {
            throw refuse(user, HttpStatus.CONFLICT, "PHONE_TAKEN",
                "That number is already verified on another esy account");
        }
        // Throttle before generating anything: a refused request must not
        // replace the code the person is currently typing.
        Instant last = lastSentAt.get(user.getId());
        if (last != null) {
            long wait = RESEND_COOLDOWN_SECONDS - Duration.between(last, Instant.now()).toSeconds();
            if (wait > 0) {
                throw refuse(user, HttpStatus.TOO_MANY_REQUESTS, "PHONE_COOLDOWN",
                    "Wait " + wait + "s before asking for another code");
            }
        }
        if (recentSends(normalised) >= MAX_SENDS_PER_NUMBER_PER_DAY) {
            throw refuse(user, HttpStatus.TOO_MANY_REQUESTS, "PHONE_CAP",
                "Too many codes sent to this number today — try again tomorrow");
        }

        String code = String.format("%04d", ThreadLocalRandom.current().nextInt(0, 10_000));

        // The master switch is off: no message can be sent, and falling back to
        // handing the code to the browser would turn a cost decision into a way
        // past verification. Say so instead.
        if (sms.isConfigured() && !sms.isSending()) {
            throw refuse(user, HttpStatus.SERVICE_UNAVAILABLE, "SMS_UNAVAILABLE",
                "SMS is switched off. Turn it back on in admin integrations.");
        }

        if (!sms.isConfigured()) {
            if (!sms.allowsDevFallback()) {
                throw refuse(user, HttpStatus.SERVICE_UNAVAILABLE, "SMS_UNAVAILABLE",
                    "Codes cannot be sent right now. Please try again later.");
            }
            issue(user, code, phone, normalised);
            log.info("DEV phone OTP for user {} = {} (no SMS account configured)", user.getId(), code);
            return code;
        }

        // Store only after the send succeeds. Storing first would leave a
        // pending code the person never received, and the next attempt would
        // replace it anyway — better that a failed send changes nothing.
        if (!sms.send(phone, templates.render(SmsTemplates.OTP, java.util.Map.of("code", code)))) {
            throw refuse(user, HttpStatus.SERVICE_UNAVAILABLE, "SMS_UNAVAILABLE",
                "Could not send the code right now. Please try again.");
        }
        // issue(), not a bare pending.put(): it also records the send time, and
        // the cooldown above reads that. Setting it only on the dev path left
        // the throttle inert in exactly the deployment where a message costs
        // money — an account could ask for codes in a loop all day.
        issue(user, code, phone, normalised);
        log.info("Phone OTP sent for user {}", user.getId());
        return null;
    }

    /** {@link #sendCode(User, String)} for the number already on the account. */
    public String sendCode(User user) {
        return sendCode(user, null);
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
    private ApiRefusal refuse(User user, HttpStatus status, String code, String reason) {
        log.warn("Phone OTP refused for user {}: {} ({})", user.getId(), reason, status.value());
        return new ApiRefusal(status, code, reason);
    }

    /** Records a freshly issued code, the number it is for, and the send. */
    private void issue(User user, String code, String phone, String normalised) {
        Instant now = Instant.now();
        pending.put(user.getId(), new Pending(code, phone, normalised, now.plusSeconds(TTL_SECONDS)));
        lastSentAt.put(user.getId(), now);
        sendsByNumber.computeIfAbsent(normalised, k -> new ArrayDeque<>()).addLast(now);
    }

    /** Sends to this number in the last 24 hours, dropping older entries. */
    private int recentSends(String normalised) {
        Deque<Instant> sends = sendsByNumber.get(normalised);
        if (sends == null) return 0;
        synchronized (sends) {
            Instant cutoff = Instant.now().minus(Duration.ofDays(1));
            while (!sends.isEmpty() && sends.peekFirst().isBefore(cutoff)) sends.pollFirst();
            return sends.size();
        }
    }

    /**
     * Verifies a submitted code and makes its number the account's verified
     * phone.
     *
     * <p>A wrong guess costs one of {@link #MAX_ATTEMPTS}. Running out discards
     * the code entirely rather than merely refusing that guess: leaving it live
     * would let an attacker keep trying with a fresh request, and the whole
     * point is that a four-digit secret must not survive being guessed at.
     */
    public void verify(User user, String code) {
        Pending p = pending.get(user.getId());
        if (p == null || Instant.now().isAfter(p.expiresAt)) {
            throw new ApiRefusal(HttpStatus.BAD_REQUEST, "CODE_EXPIRED", "Code expired — request a new one");
        }
        if (code == null || !code.trim().equals(p.code)) {
            p.attempts++;
            if (p.attempts >= MAX_ATTEMPTS) {
                pending.remove(user.getId());
                throw new ApiRefusal(HttpStatus.TOO_MANY_REQUESTS, "CODE_LOCKED",
                    "Too many wrong codes — request a new one");
            }
            int left = MAX_ATTEMPTS - p.attempts;
            throw new ApiRefusal(HttpStatus.BAD_REQUEST, "CODE_WRONG",
                "Incorrect code — " + left + (left == 1 ? " try" : " tries") + " left");
        }
        // Someone may have verified the same number since the code was sent.
        if (userRepository.existsByVerifiedPhoneAndIdNot(p.normalised, user.getId())) {
            pending.remove(user.getId());
            throw new ApiRefusal(HttpStatus.CONFLICT, "PHONE_TAKEN",
                "That number is already verified on another esy account");
        }
        user.setPhoneNumber(p.number);
        user.setVerifiedPhone(p.normalised);
        user.setPhoneVerified(true);
        try {
            userService.save(user);
        } catch (DataIntegrityViolationException e) {
            // Lost the race on users_verified_phone_uk.
            throw new ApiRefusal(HttpStatus.CONFLICT, "PHONE_TAKEN",
                "That number is already verified on another esy account");
        }
        pending.remove(user.getId());
        lastSentAt.remove(user.getId());
    }
}
