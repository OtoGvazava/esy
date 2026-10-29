package com.esyback.ecommerce.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The pure pieces of the Resend client.
 *
 * <p>Two of these decide whether a message is even attempted, and two decide
 * what the recipient sees. The escaping one matters most: template text comes
 * from an admin textarea, so an ampersand in a shop's own wording must not
 * become markup in the email it sends out.
 */
class EmailSenderTest {

    @Test
    @DisplayName("a usable address is accepted and an unusable one is not")
    void addressCheck() {
        assertTrue(EmailSender.looksLikeAddress("nino@example.ge"));
        assertTrue(EmailSender.looksLikeAddress("first.last+tag@sub.example.co.uk"));

        assertFalse(EmailSender.looksLikeAddress(null));
        assertFalse(EmailSender.looksLikeAddress(""));
        assertFalse(EmailSender.looksLikeAddress("nino"));
        assertFalse(EmailSender.looksLikeAddress("@example.ge"));
        assertFalse(EmailSender.looksLikeAddress("nino@"));
        assertFalse(EmailSender.looksLikeAddress("nino@localhost"));     // no dot
        assertFalse(EmailSender.looksLikeAddress("a@b@example.ge"));     // two @
        assertFalse(EmailSender.looksLikeAddress("ni no@example.ge"));   // space
    }

    @Test
    @DisplayName("a logged address keeps the domain and hides the person")
    void masksAddress() {
        assertEquals("ni***@example.ge", EmailSender.mask("nino@example.ge"));
        // A one-character local part cannot be partly hidden; it is not padded
        // out to pretend otherwise.
        assertEquals("a***@example.ge", EmailSender.mask("a@example.ge"));
        assertEquals("??", EmailSender.mask(null));
        assertEquals("??", EmailSender.mask("not-an-address"));
    }

    @Test
    @DisplayName("template text is escaped before it becomes HTML")
    void escapesBeforeWrapping() {
        String out = EmailSender.html("Tom & Jerry's <b>shop</b>");
        assertTrue(out.contains("Tom &amp; Jerry's &lt;b&gt;shop&lt;/b&gt;"));
        // The point: the admin's text cannot inject markup into the email.
        assertFalse(out.contains("<b>shop</b>"));
    }

    @Test
    @DisplayName("blank lines become paragraphs and single ones become breaks")
    void paragraphs() {
        String out = EmailSender.html("First line\nsame paragraph\n\nSecond paragraph");
        assertTrue(out.contains("First line<br>same paragraph"));
        assertEquals(2, out.split("<p>").length - 1);
    }

    @Test
    @DisplayName("a JSON string literal survives quotes and newlines")
    void jsonEscaping() {
        // The body is assembled by hand, so this is what stands between a
        // template containing a quote and an unparseable request.
        assertEquals("\"say \\\"hi\\\"\"", EmailSender.json("say \"hi\""));
        assertEquals("\"a\\nb\"", EmailSender.json("a\nb"));
        assertEquals("\"back\\\\slash\"", EmailSender.json("back\\slash"));
        assertEquals("\"\"", EmailSender.json(null));
        // Georgian text is passed through as-is; Resend takes UTF-8.
        assertEquals("\"შეკვეთა\"", EmailSender.json("შეკვეთა"));
    }

    @Test
    @DisplayName("Resend's own reason is pulled out of an error body")
    void readsProviderReason() {
        // This is the field that says "domain is not verified", which is the
        // one thing an operator can act on without leaving the screen.
        assertEquals("The esy.ge domain is not verified.",
            EmailSender.reasonFrom("{\"statusCode\":403,\"message\":\"The esy.ge domain is not verified.\",\"name\":\"validation_error\"}"));
        assertEquals("quoted \"thing\" here",
            EmailSender.reasonFrom("{\"message\":\"quoted \\\"thing\\\" here\"}"));
        assertNull(EmailSender.reasonFrom(null));
        assertNull(EmailSender.reasonFrom("not json"));
        assertNull(EmailSender.reasonFrom("{\"statusCode\":500}"));
    }
}
