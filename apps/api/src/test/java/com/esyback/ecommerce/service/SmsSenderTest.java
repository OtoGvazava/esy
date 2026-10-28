package com.esyback.ecommerce.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The pure pieces of the SMS Office client: turning a stored phone number into
 * the bare international form the API demands, reading the outcome out of its
 * response, and saying what that outcome means. All three are places where
 * being quietly wrong means the message silently never arrives.
 */
class SmsSenderTest {

    @Test
    @DisplayName("a stored, human-formatted number becomes a bare international one")
    void normalisesStoredFormat() {
        // What the app actually stores, straight from the profile screen.
        assertEquals("995555204188", SmsSender.normalise("+995 555 20 41 88"));
        assertEquals("995555204188", SmsSender.normalise("995555204188"));
        assertEquals("995555204188", SmsSender.normalise("00995555204188"));
    }

    @Test
    @DisplayName("a bare Georgian mobile gains its country code")
    void addsCountryCode() {
        // People type their number the way they say it out loud.
        assertEquals("995555204188", SmsSender.normalise("555204188"));
        assertEquals("995555204188", SmsSender.normalise("555 20 41 88"));
    }

    @Test
    @DisplayName("anything not usable as a destination is rejected rather than sent")
    void rejectsUnusable() {
        assertNull(SmsSender.normalise(null));
        assertNull(SmsSender.normalise(""));
        assertNull(SmsSender.normalise("not a phone"));
        assertNull(SmsSender.normalise("2041 88"));            // too short
        assertNull(SmsSender.normalise("9955552041889999999")); // too long
    }

    @Test
    @DisplayName("ErrorCode 0 is the only success; a missing field is not success")
    void readsErrorCode() {
        assertEquals(0, SmsSender.errorCode("{\"Success\":true,\"Message\":\"ok\",\"ErrorCode\":0}"));
        assertEquals(20, SmsSender.errorCode("{\"Success\":false,\"ErrorCode\":20}"));
        assertEquals(80, SmsSender.errorCode("{\"ErrorCode\": 80 ,\"Output\":null}"));
        // A body we cannot read must NOT look like success, or a failed send
        // would be reported as delivered and the person would wait for nothing.
        assertEquals(-1, SmsSender.errorCode("{\"Success\":true}"));
        assertEquals(-1, SmsSender.errorCode(null));
        assertEquals(-1, SmsSender.errorCode("not json"));
    }

    @Test
    @DisplayName("the codes SMS Office actually returns are named, not left numeric")
    void namesEveryDocumentedError() {
        // 150 is the one that happened first, and the original three-code
        // switch fell through to "see SMS Office docs" — useless to whoever
        // has to fix it, which is the entire reason the failure is surfaced.
        assertTrue(SmsSender.meaning(150).contains("not registered"));
        assertTrue(SmsSender.meaning(20).toLowerCase().contains("balance"));
        assertTrue(SmsSender.meaning(80).toLowerCase().contains("api key"));
        assertTrue(SmsSender.meaning(120).toLowerCase().contains("not activated"));
        assertTrue(SmsSender.meaning(-100).toLowerCase().contains("temporarily"));

        // Every documented code says something a person can act on.
        int[] documented = {10, 20, 40, 60, 70, 75, 76, 77, 80, 110, 120, 150, 500, 600, 700, 800, -100};
        for (int c : documented) {
            assertFalse(SmsSender.meaning(c).contains("see their documentation"),
                "code " + c + " should have a plain-words meaning");
        }

        // An undocumented code still carries its number rather than a shrug.
        assertTrue(SmsSender.meaning(999).contains("999"));
    }

    @Test
    @DisplayName("a logged destination shows the route, not the number")
    void masksTheDestination() {
        // Country code and a tail: enough to tell a correctly normalised
        // number from a mangled one, which is what the log is for.
        assertEquals("995*******88", SmsSender.mask("995555204188"));
        assertFalse(SmsSender.mask("995555204188").contains("5552041"));
        // Never crashes on what normalise() would have rejected anyway.
        assertEquals("??", SmsSender.mask(null));
        assertEquals("??", SmsSender.mask("123"));
    }
}
