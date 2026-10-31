package com.esyback.ecommerce.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The server's design rules against the browser's.
 *
 * <p>Both sides normalise the same design object, and the browser takes its
 * ids from {@code apps/web/src/core/design/schema.json}. If the web gains a
 * theme the server does not know, every store that picks it is silently
 * saved as the default; if the server keeps an id the web dropped, it hands
 * the storefront something it cannot draw. This test reads the file itself,
 * so the drift fails the build instead of reaching a merchant.
 *
 * <p>Ids are compared as sets: their order is the editor's display order,
 * which the server has no opinion about.
 */
class DesignSchemaParityTest {

    // `mvn test` runs from apps/api; an IDE often runs from the repo root.
    private static final List<String> CANDIDATES = List.of(
        "../web/src/core/design/schema.json",
        "apps/web/src/core/design/schema.json");

    private static JsonNode schema;

    @BeforeAll
    static void readSchema() throws IOException {
        Path file = CANDIDATES.stream().map(Path::of).filter(Files::isRegularFile).findFirst()
            .orElseThrow(() -> new AssertionError("schema.json not found: looked for " + CANDIDATES
                + " from " + Path.of("").toAbsolutePath()
                + ". The server's design whitelist is checked against it, so it must be readable."));
        schema = new ObjectMapper().readTree(file.toFile());
    }

    private static Set<String> names(JsonNode object) {
        Set<String> out = new LinkedHashSet<>();
        object.fieldNames().forEachRemaining(out::add);
        return out;
    }

    private static Set<String> strings(JsonNode array) {
        Set<String> out = new HashSet<>();
        array.forEach(v -> out.add(v.asText()));
        return out;
    }

    /** schema.json's defaults, flattened to the server's "style.btn" keys. */
    private static Map<String, String> flatDefaults() {
        Map<String, String> flat = new HashMap<>();
        schema.path("defaults").fields().forEachRemaining(e -> {
            if (e.getKey().equals("show")) return;
            if (e.getValue().isObject()) {
                e.getValue().fields().forEachRemaining(s ->
                    flat.put(e.getKey() + "." + s.getKey(), s.getValue().asText()));
            } else {
                flat.put(e.getKey(), e.getValue().asText());
            }
        });
        return flat;
    }

    @Test
    @DisplayName("no section the server does not mirror")
    void sections() {
        assertEquals(Set.of("v", "maxBytes", "options", "show", "looks", "defaults", "limits"), names(schema),
            "schema.json gained or lost a section: mirror it in DesignValidator and in this test");
    }

    @Test
    @DisplayName("same version, size cap and banner limits")
    void versionAndLimits() {
        assertEquals(DesignValidator.VERSION, schema.path("v").asInt(-1), "v");
        assertEquals(DesignValidator.MAX_BYTES, schema.path("maxBytes").asInt(-1), "maxBytes");

        Map<String, Integer> limits = new HashMap<>();
        schema.path("limits").fields().forEachRemaining(e -> limits.put(e.getKey(), e.getValue().asInt(-1)));
        assertEquals(Map.of(
            "bannerTitle", DesignValidator.BANNER_TITLE_MAX,
            "bannerSubtitle", DesignValidator.BANNER_SUBTITLE_MAX), limits, "limits");
    }

    @Test
    @DisplayName("same option keys, and the same ids under each")
    void options() {
        JsonNode options = schema.path("options");
        assertEquals(DesignValidator.OPTIONS.keySet(), names(options), "option keys");
        DesignValidator.OPTIONS.forEach((key, ids) ->
            assertEquals(Set.copyOf(ids), strings(options.get(key)), "options." + key));
    }

    @Test
    @DisplayName("same show switches and the same looks")
    void switchesAndLooks() {
        assertEquals(DesignValidator.SHOW.keySet(), strings(schema.path("show")), "show");
        assertEquals(Set.copyOf(DesignValidator.LOOKS), strings(schema.path("looks")), "looks");
    }

    @Test
    @DisplayName("same defaults")
    void defaults() {
        assertEquals(DesignValidator.DEFAULTS, flatDefaults(), "defaults");

        Map<String, Boolean> show = new HashMap<>();
        schema.path("defaults").path("show").fields()
            .forEachRemaining(e -> show.put(e.getKey(), e.getValue().asBoolean()));
        assertEquals(DesignValidator.SHOW, show, "defaults.show");
    }

    @Test
    @DisplayName("every default in schema.json is one of its own ids")
    void defaultsAreValidIds() {
        JsonNode options = schema.path("options");
        flatDefaults().forEach((key, value) ->
            assertTrue(strings(options.path(key)).contains(value),
                "defaults." + key + " = " + value + " is not one of options." + key));
    }

    @Test
    @DisplayName("the server's empty design is exactly schema.json's defaults")
    void normalisedEmptyIsTheSchemaDefault() {
        // End to end: whatever the maps say, this is what a store without a
        // design is actually served, and it must be what the web draws for one.
        ObjectNode expected = ((ObjectNode) schema.path("defaults")).deepCopy();
        expected.put("v", schema.path("v").asInt());
        assertEquals(expected, DesignValidator.normalize(null));
    }
}
