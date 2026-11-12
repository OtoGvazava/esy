package com.esyback.ecommerce.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * A shopper's display settings (store design plan, Phase 7): what
 * {@code PUT /api/account/display-prefs} accepts and how a stored row reads
 * back. The browser keeps the same lists in
 * {@code apps/web/src/core/display/prefs.js}.
 *
 * <ul>
 *   <li>{@code lang} ka | en, {@code appearance} light | dark | auto,
 *       {@code text} s | m | l | xl;
 *   <li>{@code stores}: how the store directory (esy.ge/stores) draws its
 *       stores, photos | compact | list | cover. Absent is photos;
 *   <li>{@code solid} (reduce transparency), {@code motion} (reduce motion) and
 *       {@code saver} (data saver), each true or false;
 *   <li>{@code views}: the product view a shopper picked in a store, keyed by
 *       the store's subdomain, grid2 | grid3 | list. A store without an entry
 *       shows its owner's layout.
 * </ul>
 *
 * <p>Unknown keys are dropped, so an older server never fails a newer client.
 * A known key with a value off its list is refused: the browser only ever
 * sends what its own controls offer, so anything else is a bug or a probe,
 * and quietly storing a default would hide it. {@code null} on a known key
 * means "not chosen" — the device's own setting decides — and is dropped.
 * The output order is fixed, so equal settings serialise equally.
 *
 * <p>Pure on purpose (no Spring, no I/O), like {@link DesignValidator}.
 */
public final class DisplayPrefsValidator {

    private DisplayPrefsValidator() {}

    /** Everything the screen can set is about 200 bytes; forty stores' views fit well inside this. */
    public static final int MAX_BYTES = 4096;
    public static final int MAX_VIEWS = 40;

    /** Refusal codes, carried to the client by {@link ApiRefusal}. */
    public static final String TOO_LARGE = "DISPLAY_PREFS_TOO_LARGE";
    public static final String INVALID = "DISPLAY_PREFS_INVALID";

    /** The single-choice keys and their values, in output order. */
    public static final Map<String, List<String>> CHOICES;

    static {
        Map<String, List<String>> choices = new LinkedHashMap<>();
        choices.put("lang", List.of("ka", "en"));
        choices.put("appearance", List.of("light", "dark", "auto"));
        choices.put("text", List.of("s", "m", "l", "xl"));
        choices.put("stores", List.of("photos", "compact", "list", "cover"));
        CHOICES = Collections.unmodifiableMap(choices);
    }

    /** The on/off keys, in output order. */
    public static final List<String> SWITCHES = List.of("solid", "motion", "saver");

    /** The product views a shopper can pick; the store's own layout is the absence of one. */
    public static final List<String> VIEWS = List.of("grid2", "grid3", "list");

    /** A DNS label: every storefront subdomain is one. */
    private static final Pattern STORE = Pattern.compile("^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$");

    private static final JsonNodeFactory NODES = JsonNodeFactory.instance;

    // Trailing tokens are refused: without the flag, "{} junk" parses as {}.
    private static final ObjectMapper MAPPER = new ObjectMapper()
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);

    /**
     * Settings sent as JSON text (a request body): refused when over
     * {@link #MAX_BYTES} bytes, not a JSON object, or carrying a value off a
     * known key's list; normalised otherwise.
     */
    public static ObjectNode validate(String raw) {
        if (raw == null) throw new Rejected(INVALID, "Display settings must be a JSON object");
        // Every UTF-16 unit is at least one UTF-8 byte, so a long string is
        // refused before it is encoded.
        if (raw.length() > MAX_BYTES || raw.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new Rejected(TOO_LARGE, "Display settings are at most " + MAX_BYTES + " bytes");
        }
        JsonNode node;
        try {
            node = MAPPER.readTree(raw);
        } catch (JsonProcessingException e) {
            throw new Rejected(INVALID, "Those display settings are not valid JSON");
        }
        if (node == null || !node.isObject()) throw new Rejected(INVALID, "Display settings must be a JSON object");
        return normalize(node, true);
    }

    /**
     * Settings read back from the database. Null when there are none, and
     * also when the text cannot be read: the browser then treats the account
     * as having none and uploads what it has. A value that no longer passes
     * (a list shrank) is dropped rather than failing the read.
     */
    public static ObjectNode readStored(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            JsonNode node = MAPPER.readTree(json);
            return node != null && node.isObject() ? normalize(node, false) : null;
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    public static String toJson(JsonNode prefs) {
        try {
            return MAPPER.writeValueAsString(prefs);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Display settings could not be written as JSON", e);
        }
    }

    /** Strict refuses a bad value; lenient (a stored row) drops it. */
    private static ObjectNode normalize(JsonNode in, boolean strict) {
        ObjectNode out = NODES.objectNode();

        for (Map.Entry<String, List<String>> c : CHOICES.entrySet()) {
            JsonNode v = in.get(c.getKey());
            if (v == null || v.isNull()) continue;
            if (v.isTextual() && c.getValue().contains(v.textValue())) {
                out.put(c.getKey(), v.textValue());
            } else if (strict) {
                throw new Rejected(INVALID, "\"" + c.getKey() + "\" must be one of " + c.getValue());
            }
        }

        for (String key : SWITCHES) {
            JsonNode v = in.get(key);
            if (v == null || v.isNull()) continue;
            if (v.isBoolean()) {
                out.put(key, v.booleanValue());
            } else if (strict) {
                throw new Rejected(INVALID, "\"" + key + "\" must be true or false");
            }
        }

        JsonNode views = in.get("views");
        if (views != null && !views.isNull()) {
            if (!views.isObject()) {
                if (strict) throw new Rejected(INVALID, "\"views\" must be an object keyed by store subdomain");
            } else {
                ObjectNode kept = NODES.objectNode();
                Iterator<Map.Entry<String, JsonNode>> it = views.fields();
                while (it.hasNext()) {
                    Map.Entry<String, JsonNode> e = it.next();
                    JsonNode v = e.getValue();
                    if (v == null || v.isNull()) continue;
                    boolean ok = STORE.matcher(e.getKey()).matches()
                        && v.isTextual() && VIEWS.contains(v.textValue());
                    if (ok) {
                        kept.put(e.getKey(), v.textValue());
                    } else if (strict) {
                        throw new Rejected(INVALID, "Each view must be a store subdomain and one of " + VIEWS);
                    }
                }
                if (kept.size() > MAX_VIEWS) {
                    if (strict) throw new Rejected(TOO_LARGE, "Views are kept for at most " + MAX_VIEWS + " stores");
                    // A stored row past the cap keeps its first entries.
                    ObjectNode first = NODES.objectNode();
                    Iterator<Map.Entry<String, JsonNode>> k = kept.fields();
                    while (k.hasNext() && first.size() < MAX_VIEWS) {
                        Map.Entry<String, JsonNode> e = k.next();
                        first.set(e.getKey(), e.getValue());
                    }
                    kept = first;
                }
                if (!kept.isEmpty()) out.set("views", kept);
            }
        }
        return out;
    }

    /** Why display settings were refused: a stable code for the client and a sentence for a person. */
    public static final class Rejected extends IllegalArgumentException {

        private final String code;

        Rejected(String code, String message) {
            super(message);
            this.code = code;
        }

        public String getCode() {
            return code;
        }
    }
}
