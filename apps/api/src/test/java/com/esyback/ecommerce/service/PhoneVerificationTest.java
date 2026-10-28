package com.esyback.ecommerce.service;

import com.esyback.ecommerce.config.SmsProperties;
import com.esyback.ecommerce.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The limits that make a four-digit code safe.
 *
 * <p>D13 fixes the length at four digits because the design draws four cells,
 * which is 10 000 combinations — so the defence cannot be a longer code and has
 * to be a bounded number of guesses. These tests exist because both bounds were
 * missing: verify() accepted unlimited attempts inside the ten-minute window,
 * and sendCode() could be called in a loop, spending real money and texting a
 * number the caller may not own.
 */
class PhoneVerificationTest {

    private PhoneVerificationService service;
    private User user;

    /** No SMS account configured → the dev path, which returns the code. */
    @BeforeEach
    void setUp() {
        SmsProperties props = mock(SmsProperties.class);
        when(props.isConfigured()).thenReturn(false);   // dev path: returns the code
        SmsSender sender = new SmsSender(props);
        UserService users = mock(UserService.class);
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        service = new PhoneVerificationService(users, sender, mock(SmsTemplates.class));
        user = new User();
        user.setId(1L);
        user.setPhoneNumber("+995 555 20 41 88");
    }

    @Test
    @DisplayName("the right code verifies the phone")
    void happyPath() {
        String code = service.sendCode(user);
        assertFalse(Boolean.TRUE.equals(user.getPhoneVerified()));
        service.verify(user, code);
        assertTrue(user.getPhoneVerified());
    }

    @Test
    @DisplayName("guessing is capped, and running out discards the code")
    void bruteForceIsBounded() {
        String code = service.sendCode(user);
        String wrong = code.equals("0000") ? "1111" : "0000";

        // Four wrong guesses are refused one at a time.
        for (int i = 0; i < 4; i++) {
            ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> service.verify(user, wrong));
            assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
        }

        // The fifth exhausts the allowance.
        ResponseStatusException tooMany = assertThrows(ResponseStatusException.class,
            () -> service.verify(user, wrong));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, tooMany.getStatusCode());

        // And the code is gone — the RIGHT one no longer works either, so an
        // attacker cannot simply resume guessing where they left off.
        assertThrows(ResponseStatusException.class, () -> service.verify(user, code));
        assertFalse(Boolean.TRUE.equals(user.getPhoneVerified()));
    }

    @Test
    @DisplayName("a second code cannot be requested immediately")
    void resendIsThrottled() {
        service.sendCode(user);
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
            () -> service.sendCode(user));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, e.getStatusCode());
    }

    @Test
    @DisplayName("a refused resend does not replace the code being typed")
    void throttledResendKeepsTheLiveCode() {
        String code = service.sendCode(user);
        assertThrows(ResponseStatusException.class, () -> service.sendCode(user));
        // The original still works: the throttle rejects before generating.
        service.verify(user, code);
        assertTrue(user.getPhoneVerified());
    }

    @Test
    @DisplayName("a phone number is required before a code can be sent")
    void needsAPhoneNumber() {
        user.setPhoneNumber(null);
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
            () -> service.sendCode(user));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
    }

    /**
     * The same limits, on the path that costs money.
     *
     * <p>Every test above runs with no SMS account, because that is the path
     * that hands the code back and is easy to assert on. The throttle recorded
     * the send time only on that path, so the cooldown was inert in precisely
     * the deployment where each message is billed and lands on a real phone —
     * the bound existed in the test suite and nowhere else.
     */
    private PhoneVerificationService configured(SmsSender sender) {
        UserService users = mock(UserService.class);
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        SmsTemplates templates = mock(SmsTemplates.class);
        when(templates.render(any(), any())).thenReturn("esy.ge — 1234");
        return new PhoneVerificationService(users, sender, templates);
    }

    private static SmsSender sendingSender(boolean sendSucceeds) {
        SmsSender sender = mock(SmsSender.class);
        when(sender.isConfigured()).thenReturn(true);
        when(sender.isSending()).thenReturn(true);
        when(sender.send(any(), any())).thenReturn(sendSucceeds);
        return sender;
    }

    @Test
    @DisplayName("with a real SMS account the code is not handed back, and a resend is throttled")
    void throttledOnTheConfiguredPathToo() {
        PhoneVerificationService real = configured(sendingSender(true));

        // Nothing is returned: the only way to learn the code is the phone.
        assertNull(real.sendCode(user));

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
            () -> real.sendCode(user));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, e.getStatusCode());
    }

    @Test
    @DisplayName("a send the provider refuses leaves no code and no cooldown")
    void refusedSendChangesNothing() {
        PhoneVerificationService real = configured(sendingSender(false));

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
            () -> real.sendCode(user));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, e.getStatusCode());

        // Not throttled by a send that never happened — the person must be able
        // to try again immediately — and no code is left pending.
        ResponseStatusException retry = assertThrows(ResponseStatusException.class,
            () -> real.sendCode(user));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, retry.getStatusCode());
        assertThrows(ResponseStatusException.class, () -> real.verify(user, "1234"));
    }

    @Test
    @DisplayName("the master switch off is a refusal, never a code in the response")
    void masterSwitchOffDoesNotFallBackToDevMode() {
        SmsSender off = mock(SmsSender.class);
        when(off.isConfigured()).thenReturn(true);
        when(off.isSending()).thenReturn(false);   // key present, switch off

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
            () -> configured(off).sendCode(user));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, e.getStatusCode());
        // The reason has to name the switch: this is the one refusal an
        // operator can fix themselves, and it is reached without the provider
        // ever being called, so nothing else in the system reports it.
        assertTrue(e.getReason().contains("switched off"));
    }
}
