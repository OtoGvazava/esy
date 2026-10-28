package com.esyback.ecommerce.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The short half of the store's short/long description pair.
 *
 * <p>The design draws a tagline in the hero and a paragraph on the About page.
 * The tagline gets one line in the hero and one line in a directory card, and
 * it is a {@code varchar(255)} — so pasting the paragraph into it has to be
 * survivable rather than either a database error or a broken layout.
 */
class TenantTaglineTest {

    @Test
    @DisplayName("an empty tagline is null, so readers fall back to the long form")
    void blankBecomesNull() {
        // Null is what makes the fallback work: the hero shows `description`
        // for every store that predates the split, and the About strip spots
        // that the two are the same and omits its paragraph.
        assertNull(TenantService.clampTagline(null));
        assertNull(TenantService.clampTagline(""));
        assertNull(TenantService.clampTagline("   "));
        assertNull(TenantService.clampTagline("\n\t "));
    }

    @Test
    @DisplayName("a tagline is one line, whatever was pasted in")
    void collapsesToOneLine() {
        assertEquals("Handmade ceramics from Tbilisi",
            TenantService.clampTagline("  Handmade ceramics\n  from   Tbilisi  "));
    }

    @Test
    @DisplayName("a pasted paragraph is cut, not rejected")
    void clampsToTheColumnWidth() {
        String paragraph = "x".repeat(400);
        String out = TenantService.clampTagline(paragraph);
        assertEquals(TenantService.TAGLINE_MAX, out.length());

        // And the cut never leaves trailing whitespace behind, which would
        // render as a stray gap at the end of the hero line.
        String endingInSpace = "y".repeat(TenantService.TAGLINE_MAX - 1) + "   tail";
        assertTrue(TenantService.clampTagline(endingInSpace).endsWith("y"));
    }

    @Test
    @DisplayName("a tagline that already fits is left exactly as written")
    void shortTaglineUntouched() {
        assertEquals("Open daily", TenantService.clampTagline("Open daily"));
    }
}
