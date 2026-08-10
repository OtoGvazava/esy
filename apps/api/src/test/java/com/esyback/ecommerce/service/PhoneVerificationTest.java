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

}
