package com.esyback.ecommerce.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * The store design object (docs/plans/store-design-system.md, "The design
 * object (v1)"): its whitelists, its defaults and the normaliser.
 *
 * <p>The browser runs the same rules in {@code apps/web/src/core/design/normalize.js}
 * and takes its ids from {@code apps/web/src/core/design/schema.json}. The
 * copy here is kept honest by {@code DesignSchemaParityTest}, which reads that
 * file and fails if a whitelist, a default or a limit differs from it.
 *
 * <ul>
 *   <li>Unknown keys are dropped, unknown values fall back to the default and
 *       missing keys take the default, so a v1 reader never fails on a later
 *       object and nothing but a whitelisted id leaves here. The output is
 *       always {@code "v": 1}.
 *   <li>{@code look} survives only if it is a known look. There is no default.
 *   <li>Colours must be {@code #rrggbb}; anything else is dropped.
 *   <li>Banner text is trimmed and cut to its limit; {@code productId}
 *       survives only as a positive integer.
 *   <li>More than {@link #MAX_BYTES} of input is refused outright.
 * </ul>
 *
 * <p>Pure on purpose (no Spring, no I/O), so the rules can be read and tested
 * without an application context.
 */
public final class DesignValidator {

    private DesignValidator() {}

    public static final int VERSION = 1;
    public static final int MAX_BYTES = 8192;
    public static final int BANNER_TITLE_MAX = 60;
    public static final int BANNER_SUBTITLE_MAX = 120;

    /** Refusal codes, carried to the client by {@link ApiRefusal}. */
    public static final String TOO_LARGE = "DESIGN_TOO_LARGE";
    public static final String INVALID = "DESIGN_INVALID";

    /**
     * A single-choice key, its ids and its default. A dotted key is nested:
     * {@code style.btn} is {@code design.style.btn}, exactly as schema.json
     * names it under "options".
     */
    private record Choice(String key, String fallback, List<String> ids) {}

    // Output order; a nested group is written where its first key appears.
    private static final List<Choice> CHOICES = List.of(
        new Choice("theme", "glow", List.of("glow", "soft", "neon")),
        new Choice("menu", "tabs", List.of("tabs", "capsule", "mini", "top", "drawer", "fab")),
        new Choice("productLayout", "grid2", List.of("grid2", "grid3", "feed", "list")),
        new Choice("header", "compact", List.of("compact", "center", "cover")),
        new Choice("style.btn", "theme", List.of("theme", "pill", "round", "square")),
        new Choice("style.corner", "theme", List.of("theme", "round", "subtle", "sharp")),
        new Choice("style.card", "theme", List.of("theme", "flat", "outline", "shadow", "glass")),
        new Choice("style.font", "theme", List.of("theme", "sans", "serif", "rounded", "mono")),
        new Choice("style.icon", "theme", List.of("theme", "thin", "regular", "bold")),
        new Choice("style.density", "normal", List.of("normal", "compact", "airy")),
        new Choice("style.ratio", "theme", List.of("theme", "square", "portrait", "landscape")),
        new Choice("style.price", "below", List.of("below", "photo")),
        new Choice("style.addbtn", "plus", List.of("plus", "heart", "none")),
        new Choice("style.bg", "theme", List.of("theme", "plain", "tinted", "gradient"))
    );

    /** Every single-choice key and its ids, keyed as schema.json "options". */
    public static final Map<String, List<String>> OPTIONS;

    /** The default of every key in {@link #OPTIONS}. */
    public static final Map<String, String> DEFAULTS;

    static {
        Map<String, List<String>> options = new LinkedHashMap<>();
        Map<String, String> defaults = new LinkedHashMap<>();
        for (Choice c : CHOICES) {
            options.put(c.key(), c.ids());
            defaults.put(c.key(), c.fallback());
        }
        OPTIONS = Collections.unmodifiableMap(options);
        DEFAULTS = Collections.unmodifiableMap(defaults);
    }

    /** The show/hide switches and their defaults, in output order. */
    public static final Map<String, Boolean> SHOW;

    static {
        Map<String, Boolean> show = new LinkedHashMap<>();
        show.put("stories", true);
        show.put("banner", false);
        show.put("labels", true);
        show.put("price", true);
        show.put("badge", true);
        show.put("tick", true);
        show.put("socials", true);
        SHOW = Collections.unmodifiableMap(show);
    }

    /** The ready-made looks. The looks themselves are web code; only the ids are checked here. */
    public static final List<String> LOOKS = List.of(
        "social", "boutique", "nightdrop", "bakery", "market", "coffee", "glowup",
        "pastel", "sneaker", "gadget", "cleantech", "studio", "gallerywall", "toybox");

    private static final List<String> COLOURS = List.of("primary", "second");

    /** The existing {@code safeAccent} precondition, and TenantService's colour rule. */
    private static final Pattern HEX = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private static final JsonNodeFactory NODES = JsonNodeFactory.instance;

    // Trailing tokens are refused: without the flag, "{} junk" parses as {}.
    private static final ObjectMapper MAPPER = new ObjectMapper()
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);

    // ---- Entry points -------------------------------------------------------

    /**
     * A design sent as JSON text, such as a request body: refused when it is
     * over {@link #MAX_BYTES} bytes or is not a JSON object, normalised
     * otherwise.
     */
    public static ObjectNode validate(String raw) {
        if (raw == null) throw new Rejected(INVALID, "A design must be a JSON object");
        // Every UTF-16 unit is at least one UTF-8 byte, so a long string is
        // refused before it is encoded.
        if (raw.length() > MAX_BYTES || raw.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw tooLarge();
        }
        JsonNode node;
        try {
            node = MAPPER.readTree(raw);
        } catch (JsonProcessingException e) {
            throw new Rejected(INVALID, "That design is not valid JSON");
        }
        if (node == null || !node.isObject()) throw new Rejected(INVALID, "A design must be a JSON object");
        return normalize(node);
    }

    /**
     * A design that arrived inside a larger JSON request (store creation), so
     * its raw bytes are not separately known: it is measured as serialised.
     */
    public static ObjectNode validate(JsonNode node) {
        if (node == null || !node.isObject()) throw new Rejected(INVALID, "A design must be a JSON object");
        if (serialisedSize(node) > MAX_BYTES) throw tooLarge();
        return normalize(node);
    }

    /**
     * A design read back from the database. Null when there is none, and also
     * when the text cannot be read: a damaged row draws the default design
     * rather than failing the storefront.
     */
    public static ObjectNode readStored(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            JsonNode node = MAPPER.readTree(json);
            return node != null && node.isObject() ? normalize(node) : null;
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    public static String toJson(JsonNode design) {
        try {
            return MAPPER.writeValueAsString(design);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("A design could not be written as JSON", e);
        }
    }

    // ---- The normaliser -----------------------------------------------------

    /**
     * Any input to a valid v1 design. Lenient by design: a non-object reads as
     * {@code {}}, which is the all-defaults design. The size and shape checks
     * belong to {@link #validate}.
     */
    public static ObjectNode normalize(JsonNode input) {
        ObjectNode in = objectOrEmpty(input);
        ObjectNode out = NODES.objectNode();
        out.put("v", VERSION);

        String look = text(in.get("look"));
        if (look != null && LOOKS.contains(look)) out.put("look", look);

        for (Choice c : CHOICES) {
            int dot = c.key().indexOf('.');
            if (dot < 0) {
                out.put(c.key(), pick(in.get(c.key()), c));
            } else {
                String group = c.key().substring(0, dot);
                String name = c.key().substring(dot + 1);
                ObjectNode target = out.get(group) instanceof ObjectNode existing ? existing : out.putObject(group);
                target.put(name, pick(objectOrEmpty(in.get(group)).get(name), c));
            }
        }

        ObjectNode coloursIn = objectOrEmpty(in.get("colours"));
        ObjectNode colours = NODES.objectNode();
        for (String key : COLOURS) {
            String hex = text(coloursIn.get(key));
            if (hex != null && HEX.matcher(hex).matches()) colours.put(key, hex);
        }
        if (!colours.isEmpty()) out.set("colours", colours);

        ObjectNode showIn = objectOrEmpty(in.get("show"));
        ObjectNode show = out.putObject("show");
        for (Map.Entry<String, Boolean> e : SHOW.entrySet()) {
            JsonNode v = showIn.get(e.getKey());
            show.put(e.getKey(), v != null && v.isBoolean() ? v.booleanValue() : e.getValue());
        }

        ObjectNode bannerIn = objectOrEmpty(in.get("banner"));
        ObjectNode banner = NODES.objectNode();
        String title = clamp(bannerIn.get("title"), BANNER_TITLE_MAX);
        if (title != null) banner.put("title", title);
        String subtitle = clamp(bannerIn.get("subtitle"), BANNER_SUBTITLE_MAX);
        if (subtitle != null) banner.put("subtitle", subtitle);
        Long productId = positiveInteger(bannerIn.get("productId"));
        if (productId != null) banner.put("productId", productId);
        if (!banner.isEmpty()) out.set("banner", banner);

        return out;
    }

    // ---- Colours ------------------------------------------------------------
    // Published colours live in Tenant.primaryColor / secondaryColor, not in
    // the stored design. These move them between the two.

    /** The design's {@code primary} or {@code second} colour, or null. */
    public static String colour(JsonNode design, String key) {
        if (design == null) return null;
        String hex = text(design.path("colours").get(key));
        return hex != null && HEX.matcher(hex).matches() ? hex : null;
    }

    /** The design with its colours replaced by these; a null or invalid one is left out. */
    public static ObjectNode withColours(JsonNode design, String primary, String second) {
        ObjectNode copy = objectOrEmpty(design).deepCopy();
        ObjectNode colours = copy.putObject("colours");
        if (primary != null) colours.put("primary", primary);
        if (second != null) colours.put("second", second);
        return normalize(copy);
    }

    /** The design as it is stored once published: everything but the colours. */
    public static ObjectNode withoutColours(JsonNode design) {
        ObjectNode out = normalize(design);
        out.remove("colours");
        return out;
    }

    // ---- Helpers ------------------------------------------------------------

    private static String pick(JsonNode value, Choice c) {
        // Exact match, as in the browser: "Soft" or " soft" is not an id.
        String s = text(value);
        return s != null && c.ids().contains(s) ? s : c.fallback();
    }

    private static String clamp(JsonNode value, int max) {
        String s = text(value);
        if (s == null) return null;
        s = jsTrim(s);
        if (s.isEmpty()) return null;
        if (s.length() <= max) return s;
        // Never keep half of a surrogate pair (an emoji) at the cut; the
        // browser's slice() would, and the lone half cannot be stored as UTF-8.
        int end = Character.isHighSurrogate(s.charAt(max - 1)) ? max - 1 : max;
        return s.substring(0, end);
    }

    /**
     * {@code String.prototype.trim()}: ECMAScript white space and line
     * terminators, which is not the set {@code String.trim()} or
     * {@code strip()} removes (no-break space, BOM). Both sides must trim the
     * same characters or the same title normalises two ways.
     */
    static String jsTrim(String s) {
        int start = 0;
        int end = s.length();
        while (start < end && isJsSpace(s.charAt(start))) start++;
        while (end > start && isJsSpace(s.charAt(end - 1))) end--;
        return s.substring(start, end);
    }

    private static boolean isJsSpace(char c) {
        return c == '\t' || c == '\n' || c == '\u000B' || c == '\f' || c == '\r'
            || c == '\u2028' || c == '\u2029' || c == '\uFEFF'
            || Character.getType(c) == Character.SPACE_SEPARATOR;
    }

    private static Long positiveInteger(JsonNode value) {
        // JSON has one number type and Number.isInteger(7.0) is true, so 7.0 is
        // read as 7, as the browser reads it. Ids are longs; anything past
        // that range is not a product.
        if (value == null || !value.isNumber()
            || !value.canConvertToExactIntegral() || !value.canConvertToLong()) {
            return null;
        }
        long v = value.longValue();
        return v > 0 ? v : null;
    }

    private static String text(JsonNode value) {
        return value != null && value.isTextual() ? value.textValue() : null;
    }

    private static ObjectNode objectOrEmpty(JsonNode value) {
        return value instanceof ObjectNode o ? o : NODES.objectNode();
    }

    private static int serialisedSize(JsonNode node) {
        try {
            return MAPPER.writeValueAsBytes(node).length;
        } catch (JsonProcessingException e) {
            throw new Rejected(INVALID, "A design must be a JSON object");
        }
    }

    private static Rejected tooLarge() {
        return new Rejected(TOO_LARGE, "A design is at most " + MAX_BYTES + " bytes");
    }

    /** Why a design was refused: a stable code for the client and a sentence for a person. */
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
