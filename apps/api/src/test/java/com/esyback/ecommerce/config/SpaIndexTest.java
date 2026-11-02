package com.esyback.ecommerce.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The store inlined into index.html: where it goes, and that nothing a
 * merchant types into the store's name or description can end the script it
 * sits in.
 */
class SpaIndexTest {

    private static final String PAGE = "<head><!--esy:boot--><script>paint()</script></head>";

    @Test
    @DisplayName("the store's JSON takes the mark's place, in a script the browser never runs")
    void injectsAtTheMark() {
        String out = SpaIndex.inject(PAGE, "{\"name\":\"Studio\"}");
        assertEquals("<head><script id=\"esy-boot\" type=\"application/json\">{\"name\":\"Studio\"}</script>"
            + "<script>paint()</script></head>", out);
    }

    @Test
    @DisplayName("no store to inline leaves the page as it was, minus the mark")
    void withoutAStore() {
        assertEquals("<head><script>paint()</script></head>", SpaIndex.inject(PAGE, null));
        assertEquals("<html></html>", SpaIndex.inject("<html></html>", "{}"));
    }

    @Test
    @DisplayName("a name that tries to close the script stays inside it, and parses back unchanged")
    void escapesWhatCouldEndTheScript() throws Exception {
        String name = "</script><script>alert(1)</script><!-- &  ";
        String json = new ObjectMapper().writeValueAsString(Map.of("name", name));
        String out = SpaIndex.inject(PAGE, json);
        String open = "<script id=\"esy-boot\" type=\"application/json\">";
        int from = out.indexOf(open) + open.length();
        String inside = out.substring(from, out.indexOf("</script>", from));
        assertFalse(inside.contains("<"));
        assertFalse(inside.contains(">"));
        assertFalse(inside.contains("&"));
        assertFalse(inside.contains(" "));
        assertTrue(out.endsWith("<script>paint()</script></head>"));
        assertEquals(name, new ObjectMapper().readTree(inside).get("name").asText());
    }
}
