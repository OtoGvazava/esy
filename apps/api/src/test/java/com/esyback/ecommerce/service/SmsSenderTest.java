package com.esyback.ecommerce.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * The two pure pieces of the SMS Office client: turning a stored phone number
 * into the bare international form the API demands, and reading the outcome
 * out of its response. Both are places where being quietly wrong means the
 * message silently never arrives.
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
}
