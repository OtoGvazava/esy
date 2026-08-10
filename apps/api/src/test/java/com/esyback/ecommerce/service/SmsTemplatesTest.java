package com.esyback.ecommerce.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Rules about the SMS templates that are easy to break silently.
 *
 * <p>The first test exists because it already happened: {@code orderPlaced}
 * shipped with a default text, a row on the admin screen and an on/off switch,
 * and nothing ever sent it — an order is created as PLACED and never
 * transitions into it, so the status-change path could not reach it. A switch
 * for a message that does not exist is worse than no switch, because an
 * operator turns it on and believes their buyers are being told.
 */
class SmsTemplatesTest {

    @Test
    @DisplayName("every template is actually sent from somewhere in the code")
    void everyTemplateHasASender() throws IOException {
        String source = readMainSources();
        List<String> orphans = new ArrayList<>();
        for (String key : SmsTemplates.KEYS) {
            // The constant name as referenced at a call site, e.g. ORDER_PLACED.
            String constant = constantNameFor(key);
            // Once for the declaration in SmsTemplates, again at a call site.
            long uses = source.split("SmsTemplates\\." + constant, -1).length - 1;
            if (uses == 0) orphans.add(key);
        }
        assertTrue(orphans.isEmpty(),
            "These templates are offered in admin but never sent: " + orphans);
    }

    @Test
    @DisplayName("the verification code cannot be switched off")
    void otpIsNotSwitchable() {
        assertFalse(SmsTemplates.isSwitchable(SmsTemplates.OTP));
        for (String key : SmsTemplates.KEYS) {
            if (!key.equals(SmsTemplates.OTP)) assertTrue(SmsTemplates.isSwitchable(key));
        }
    }

    @Test
    @DisplayName("a template losing its required token is refused")
    void validatesRequiredToken() {
        assertNotNull(SmsTemplates.validate(SmsTemplates.OTP, "no placeholder here"));
        assertNull(SmsTemplates.validate(SmsTemplates.OTP, "esy.ge — {code}"));
    }

    @Test
    @DisplayName("an unknown placeholder is refused rather than sent as a literal brace")
    void validatesUnknownToken() {
        assertNotNull(SmsTemplates.validate(SmsTemplates.ORDER_SHIPPED, "Order {nope} shipped"));
        assertNull(SmsTemplates.validate(SmsTemplates.ORDER_SHIPPED, "Order {order} shipped"));
    }

    @Test
    @DisplayName("empty and over-long messages are refused")
    void validatesLength() {
        assertNotNull(SmsTemplates.validate(SmsTemplates.ORDER_SHIPPED, "   "));
        assertNotNull(SmsTemplates.validate(SmsTemplates.ORDER_SHIPPED, "x".repeat(1001)));
    }

    @Test
    @DisplayName("billing units follow the Unicode limits, not the Latin ones")
    void countsUnits() {
        // Georgian is Unicode: 70 characters in one part, 67 per part after.
        assertEquals(0, SmsTemplates.units(""));
        assertEquals(1, SmsTemplates.units("x".repeat(70)));
        assertEquals(2, SmsTemplates.units("x".repeat(71)));
        assertEquals(2, SmsTemplates.units("x".repeat(134)));
        assertEquals(3, SmsTemplates.units("x".repeat(135)));
    }

    /** ORDER_PLACED for "orderPlaced", OTP for "otp". */
    private static String constantNameFor(String key) {
        if (SmsTemplates.OTP.equals(key)) return "OTP";
        return key.replaceAll("([a-z])([A-Z])", "$1_$2").toUpperCase();
    }

    private static String readMainSources() throws IOException {
        Path root = Path.of("src", "main", "java");
        StringBuilder sb = new StringBuilder();
        try (Stream<Path> files = Files.walk(root)) {
            for (Path p : files.filter(f -> f.toString().endsWith(".java")).toList()) {
                // Skip the definition file itself — a constant is declared
                // there by definition, which would mask an unused one.
                if (p.getFileName().toString().equals("SmsTemplates.java")) continue;
                sb.append(Files.readString(p)).append('\n');
            }
        }
        return sb.toString();
    }
}
