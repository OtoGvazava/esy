package com.esyback.ecommerce.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The email templates: what they render and what they refuse to accept.
 *
 * <p>The rendering rule that differs from SMS is whitespace. An SMS is one
 * line and its renderer collapses runs of space; an email body's blank lines
 * are its paragraphs, and flattening them would turn every message into a
 * single block.
 */
class EmailTemplatesTest {

    private EmailTemplates templates;

    @BeforeEach
    void setUp() {
        // No stored overrides: every read falls through to the shipped default,
        // which is the state a fresh deployment is in.
        ConfigStore config = mock(ConfigStore.class);
        when(config.get(anyString(), any())).thenAnswer(inv -> inv.getArgument(1));
        templates = new EmailTemplates(config);
    }

    @Test
    @DisplayName("every template ships with a subject and a body")
    void defaultsExist() {
        for (String key : EmailTemplates.KEYS) {
            assertFalse(EmailTemplates.defaultSubject(key).isBlank(), key + " has no subject");
            assertFalse(EmailTemplates.defaultBody(key).isBlank(), key + " has no body");
        }
        assertEquals(6, EmailTemplates.KEYS.size());
    }

    @Test
    @DisplayName("tokens are substituted in both the subject and the body")
    void rendersTokens() {
        Map<String, String> tokens = Map.of(
            "order", "ESY-1001",
            "store", "Studio Form",
            "url", "studio-form.esy.ge/orders",
            "total", "84 ₾");

        assertTrue(templates.renderSubject(EmailTemplates.ORDER_PLACED, tokens).contains("ESY-1001"));
        String body = templates.renderBody(EmailTemplates.ORDER_PLACED, tokens);
        assertTrue(body.contains("ESY-1001"));
        assertTrue(body.contains("Studio Form"));
        assertTrue(body.contains("studio-form.esy.ge/orders"));
        assertTrue(body.contains("84 ₾"));
    }

    @Test
    @DisplayName("paragraph breaks survive rendering")
    void keepsParagraphs() {
        // An SMS renderer collapses whitespace; doing that here would flatten
        // every email into one block.
        String body = templates.renderBody(EmailTemplates.ORDER_PLACED, Map.of("order", "ESY-1"));
        assertTrue(body.contains("\n\n"), "paragraph breaks were collapsed");
    }

    @Test
    @DisplayName("a token with no value leaves no literal braces behind")
    void dropsUnfilledTokens() {
        String body = templates.renderBody(EmailTemplates.ORDER_SHIPPED, Map.of());
        assertFalse(body.contains("{order}"));
        assertFalse(body.contains("{url}"));
    }

    @Test
    @DisplayName("the refund template can use the amount; the others cannot")
    void refundHasItsOwnToken() {
        assertTrue(EmailTemplates.allowedTokens(EmailTemplates.ORDER_REFUNDED).contains("amount"));
        assertFalse(EmailTemplates.allowedTokens(EmailTemplates.ORDER_PLACED).contains("amount"));

        // So a placed-order template referencing {amount} is a typo, and is
        // refused rather than silently rendering as nothing.
        assertNotNull(EmailTemplates.validate(
            EmailTemplates.ORDER_PLACED, "Order {order}", "We took {amount}"));
        assertNull(EmailTemplates.validate(
            EmailTemplates.ORDER_REFUNDED, "Order {order}", "Refunding {amount}"));
    }

    @Test
    @DisplayName("empty or oversized wording is refused")
    void validation() {
        assertNotNull(EmailTemplates.validate(EmailTemplates.ORDER_PLACED, "", "body"));
        assertNotNull(EmailTemplates.validate(EmailTemplates.ORDER_PLACED, "subject", ""));
        assertNotNull(EmailTemplates.validate(EmailTemplates.ORDER_PLACED, "s".repeat(201), "body"));
        assertNotNull(EmailTemplates.validate(EmailTemplates.ORDER_PLACED, "subject", "b".repeat(5001)));
        assertNotNull(EmailTemplates.validate("notAKey", "subject", "body"));
        assertNull(EmailTemplates.validate(EmailTemplates.ORDER_PLACED, "Order {order}", "Thanks."));
    }

    @Test
    @DisplayName("every email is switchable, unlike the verification text")
    void allSwitchable() {
        // Nothing in checkout waits on an email, so silencing one costs
        // courtesy and nothing else — the opposite of the OTP SMS.
        for (String key : EmailTemplates.KEYS) {
            assertTrue(templates.isEnabled(key), key + " should default to on");
        }
    }

    @Test
    @DisplayName("the admin listing reports every template with its wording")
    void listsForAdmin() {
        var rows = templates.all();
        assertEquals(EmailTemplates.KEYS.size(), rows.size());
        for (var row : rows) {
            assertNotNull(row.get("subject"));
            assertNotNull(row.get("body"));
            assertEquals(Boolean.TRUE, row.get("isDefault"));
            assertEquals(Boolean.TRUE, row.get("enabled"));
        }
    }
}
