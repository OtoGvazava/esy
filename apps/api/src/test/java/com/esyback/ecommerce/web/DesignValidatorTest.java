package com.esyback.ecommerce.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The design object's rules (store design plan, "The design object (v1)").
 *
 * <p>The browser runs the same rules, so every case here is one where the two
 * sides must agree: a design the editor saved has to come back from the
 * server meaning the same thing, and anything else that arrives (an old
 * client, a later schema, a hand-written request) has to come out as a design
 * the storefront can draw without ever putting an unknown string in the DOM.
 */
class DesignValidatorTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private static ObjectNode norm(String json) throws Exception {
        return DesignValidator.normalize(JSON.readTree(json));
    }

    private static List<String> keys(JsonNode node) {
        List<String> out = new ArrayList<>();
        node.fieldNames().forEachRemaining(out::add);
        return out;
    }

    private static String codeOf(Runnable call) {
        try {
            call.run();
        } catch (DesignValidator.Rejected e) {
            return e.getCode();
        }
        throw new AssertionError("expected the design to be refused");
    }

    @Test
    @DisplayName("an empty object is the default design, at v1, and invents nothing")
    void emptyIsTheDefault() throws Exception {
        ObjectNode d = norm("{}");

        assertThat(d.get("v").asInt()).isEqualTo(1);
        assertThat(d.get("theme").asText()).isEqualTo("glow");
        assertThat(d.get("menu").asText()).isEqualTo("tabs");
        assertThat(d.get("productLayout").asText()).isEqualTo("grid2");
        assertThat(d.get("header").asText()).isEqualTo("compact");
        assertThat(d.get("style").get("density").asText()).isEqualTo("normal");
        assertThat(d.get("style").get("addbtn").asText()).isEqualTo("plus");
        assertThat(d.get("show").get("banner").asBoolean()).isFalse();
        assertThat(d.get("show").get("stories").asBoolean()).isTrue();
        // A store that has not chosen a look, a colour or a banner has none.
        assertThat(d.has("look")).isFalse();
        assertThat(d.has("colours")).isFalse();
        assertThat(d.has("banner")).isFalse();
    }

    @Test
    @DisplayName("unknown keys are dropped at every level")
    void unknownKeysAreDropped() throws Exception {
        ObjectNode d = norm("""
            {"theme":"neon","onclick":"alert(1)",
             "style":{"btn":"pill","css":"position:fixed"},
             "show":{"ratings":true,"price":false},
             "colours":{"primary":"#112233","accent":"#445566"},
             "banner":{"title":"Hi","html":"<b>x</b>"}}""");

        assertThat(keys(d)).containsExactlyInAnyOrder(
            "v", "theme", "menu", "productLayout", "header", "style", "colours", "show", "banner");
        assertThat(keys(d.get("style"))).doesNotContain("css").hasSize(10);
        // No ratings in v1: there are no reviews, and a store must never show
        // invented ones, so the switch cannot even be stored.
        assertThat(keys(d.get("show"))).doesNotContain("ratings").hasSize(7);
        assertThat(keys(d.get("colours"))).containsExactly("primary");
        assertThat(keys(d.get("banner"))).containsExactly("title");
        assertThat(d.get("show").get("price").asBoolean()).isFalse();
    }

    @Test
    @DisplayName("an unknown value takes the default, and only an exact id counts")
    void unknownValuesTakeTheDefault() throws Exception {
        ObjectNode d = norm("""
            {"theme":"purple","menu":"Capsule","productLayout":" grid3","header":3,
             "style":{"btn":"huge","corner":["round"],"density":"airy"}}""");

        assertThat(d.get("theme").asText()).isEqualTo("glow");
        // Case and whitespace are not forgiven: the browser compares exactly,
        // and the two sides must read the same object the same way.
        assertThat(d.get("menu").asText()).isEqualTo("tabs");
        assertThat(d.get("productLayout").asText()).isEqualTo("grid2");
        assertThat(d.get("header").asText()).isEqualTo("compact");
        assertThat(d.get("style").get("btn").asText()).isEqualTo("theme");
        assertThat(d.get("style").get("corner").asText()).isEqualTo("theme");
        // One bad value does not cost the valid one beside it.
        assertThat(d.get("style").get("density").asText()).isEqualTo("airy");
    }

    @Test
    @DisplayName("a show switch must be a real boolean")
    void switchesAreBooleans() throws Exception {
        ObjectNode show = (ObjectNode) norm("""
            {"show":{"stories":"false","banner":1,"labels":false,"tick":null}}""").get("show");

        assertThat(show.get("stories").asBoolean()).isTrue();
        assertThat(show.get("banner").asBoolean()).isFalse();
        assertThat(show.get("labels").asBoolean()).isFalse();
        assertThat(show.get("tick").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("look survives only when it is a known look")
    void lookIsWhitelisted() throws Exception {
        assertThat(norm("{\"look\":\"boutique\"}").get("look").asText()).isEqualTo("boutique");
        assertThat(norm("{\"look\":\"brutalist\"}").has("look")).isFalse();
        assertThat(norm("{\"look\":7}").has("look")).isFalse();
    }

    @Test
    @DisplayName("colours must be #rrggbb, written as they were sent")
    void coloursMustBeHex() throws Exception {
        assertThat(norm("{\"colours\":{\"primary\":\"#a1B2c3\"}}").get("colours").get("primary").asText())
            .isEqualTo("#a1B2c3");

        for (String bad : List.of("\"#abc\"", "\"a1b2c3\"", "\"#a1b2c3ff\"", "\"#a1b2c3\\n\"",
                                  "\"#gggggg\"", "\"red\"", "123456", "[\"#a1b2c3\"]", "null")) {
            assertThat(norm("{\"colours\":{\"primary\":" + bad + ",\"second\":" + bad + "}}").has("colours"))
                .as(bad).isFalse();
        }
    }

    @Test
    @DisplayName("banner text is trimmed and then cut to its limit")
    void bannerTextIsTrimmedAndCut() throws Exception {
        ObjectNode b = (ObjectNode) norm("{\"banner\":{\"title\":\"   " + "t".repeat(70)
            + "  \",\"subtitle\":\"" + "s".repeat(130) + "\"}}").get("banner");

        assertThat(b.get("title").asText()).isEqualTo("t".repeat(DesignValidator.BANNER_TITLE_MAX));
        assertThat(b.get("subtitle").asText()).isEqualTo("s".repeat(DesignValidator.BANNER_SUBTITLE_MAX));

        // Blank or not text: no banner field at all.
        assertThat(norm("{\"banner\":{\"title\":\"   \",\"subtitle\":5}}").has("banner")).isFalse();

        // The browser's trim() also removes a no-break space and a BOM, which
        // Java's trim() does not; both sides must cut the same characters.
        assertThat(norm("{\"banner\":{\"title\":\"\\u00a0Sale\\ufeff\"}}").get("banner").get("title").asText())
            .isEqualTo("Sale");
        assertThat(DesignValidator.jsTrim("\u2028\u3000 Sale \t\r\n")).isEqualTo("Sale");
    }

    @Test
    @DisplayName("a cut never keeps half of an emoji")
    void theCutKeepsSurrogatePairsWhole() throws Exception {
        // 59 letters and a fire emoji (two UTF-16 units, at 59 and 60): a plain
        // cut at 60 would keep the first half, which cannot be stored as UTF-8.
        String title = "x".repeat(59) + "\uD83D\uDD25";
        ObjectNode d = DesignValidator.normalize(
            JSON.createObjectNode().set("banner", JSON.createObjectNode().put("title", title)));

        assertThat(d.get("banner").get("title").asText()).isEqualTo("x".repeat(59));
    }

    @Test
    @DisplayName("banner productId survives only as a positive integer")
    void productIdIsAPositiveInteger() throws Exception {
        assertThat(norm("{\"banner\":{\"productId\":7}}").get("banner").get("productId").asLong()).isEqualTo(7);
        // JSON has one number type and the browser's Number.isInteger(7.0) is true.
        assertThat(norm("{\"banner\":{\"productId\":7.0}}").get("banner").get("productId").isIntegralNumber()).isTrue();
        assertThat(norm("{\"banner\":{\"productId\":12345678901}}").get("banner").get("productId").asLong())
            .isEqualTo(12345678901L);

        for (String bad : List.of("0", "-3", "7.5", "\"7\"", "true", "1e30", "99999999999999999999")) {
            assertThat(norm("{\"banner\":{\"productId\":" + bad + "}}").has("banner")).as(bad).isFalse();
        }
    }

    @Test
    @DisplayName("a later version's object is read as v1, never refused")
    void aLaterVersionReadsAsV1() throws Exception {
        ObjectNode d = norm("{\"v\":2,\"theme\":\"soft\",\"layers\":[{\"kind\":\"hero\"}],\"menu\":\"orbit\"}");

        assertThat(d.get("v").asInt()).isEqualTo(1);
        assertThat(d.get("theme").asText()).isEqualTo("soft");
        assertThat(d.get("menu").asText()).isEqualTo("tabs");
        assertThat(d.has("layers")).isFalse();
    }

    @Test
    @DisplayName("normalising twice changes nothing")
    void normalisingIsIdempotent() throws Exception {
        ObjectNode once = norm("""
            {"look":"nightdrop","theme":"neon","menu":"drawer","productLayout":"feed","header":"center",
             "style":{"ratio":"portrait","addbtn":"heart","bogus":1},
             "colours":{"primary":"#ff00aa","second":"nope"},
             "show":{"badge":false},"banner":{"title":" Drop 04 ","productId":3}}""");

        assertThat(DesignValidator.normalize(once)).isEqualTo(once);
        assertThat(DesignValidator.validate(DesignValidator.toJson(once))).isEqualTo(once);
    }

    @Test
    @DisplayName("a non-object normalises to the default design, but is refused as a request")
    void nonObjects() throws Exception {
        ObjectNode defaults = norm("{}");
        assertThat(DesignValidator.normalize(null)).isEqualTo(defaults);
        assertThat(DesignValidator.normalize(JSON.readTree("[1,2]"))).isEqualTo(defaults);
        assertThat(DesignValidator.normalize(JSON.readTree("\"soft\""))).isEqualTo(defaults);

        for (String body : List.of("[]", "\"soft\"", "null", "42", "", "{\"theme\":", "{} {}", "{} junk")) {
            assertThat(codeOf(() -> DesignValidator.validate(body))).as(body).isEqualTo(DesignValidator.INVALID);
        }
        assertThat(codeOf(() -> DesignValidator.validate((String) null))).isEqualTo(DesignValidator.INVALID);
        assertThat(codeOf(() -> DesignValidator.validate(JSON.createArrayNode()))).isEqualTo(DesignValidator.INVALID);
    }

    @Test
    @DisplayName("more than 8192 bytes is refused, counted in bytes rather than characters")
    void theSizeCapIsInBytes() {
        String prefix = "{\"banner\":{\"title\":\"";
        String suffix = "\"}}";
        String atLimit = prefix + "x".repeat(DesignValidator.MAX_BYTES - prefix.length() - suffix.length()) + suffix;
        assertThat(atLimit.length()).isEqualTo(DesignValidator.MAX_BYTES);

        // Exactly at the cap is fine (and the title is cut as usual)...
        assertThat(DesignValidator.validate(atLimit).get("banner").get("title").asText())
            .hasSize(DesignValidator.BANNER_TITLE_MAX);
        // ...one byte over is not.
        assertThat(codeOf(() -> DesignValidator.validate(atLimit.replace("{\"banner", " {\"banner"))))
            .isEqualTo(DesignValidator.TOO_LARGE);

        // Georgian is three bytes a letter: 3,000 letters are well under 8192
        // characters and well over 8192 bytes.
        String georgian = prefix + "\u10d0".repeat(3000) + suffix;
        assertThat(georgian.length()).isLessThan(DesignValidator.MAX_BYTES);
        assertThat(codeOf(() -> DesignValidator.validate(georgian))).isEqualTo(DesignValidator.TOO_LARGE);
    }

    @Test
    @DisplayName("a design inside a larger request is measured as serialised")
    void treesAreMeasuredAsSerialised() {
        ObjectNode small = JSON.createObjectNode().put("theme", "soft");
        assertThat(DesignValidator.validate(small).get("theme").asText()).isEqualTo("soft");

        ObjectNode big = JSON.createObjectNode();
        big.putObject("banner").put("title", "x".repeat(DesignValidator.MAX_BYTES));
        assertThat(codeOf(() -> DesignValidator.validate(big))).isEqualTo(DesignValidator.TOO_LARGE);
    }

    @Test
    @DisplayName("colours move between the design and the colour columns")
    void colourHelpers() throws Exception {
        ObjectNode d = norm("{\"theme\":\"soft\",\"colours\":{\"primary\":\"#111111\",\"second\":\"#222222\"}}");

        assertThat(DesignValidator.colour(d, "primary")).isEqualTo("#111111");
        assertThat(DesignValidator.colour(d, "second")).isEqualTo("#222222");
        assertThat(DesignValidator.colour(null, "primary")).isNull();
        assertThat(DesignValidator.colour(norm("{}"), "primary")).isNull();

        ObjectNode stored = DesignValidator.withoutColours(d);
        assertThat(stored.has("colours")).isFalse();
        assertThat(stored.get("theme").asText()).isEqualTo("soft");

        // The columns win, and a column that is empty or not a colour is left out.
        ObjectNode served = DesignValidator.withColours(d, "#333333", "not-a-colour");
        assertThat(served.get("colours").get("primary").asText()).isEqualTo("#333333");
        assertThat(served.get("colours").has("second")).isFalse();
        assertThat(DesignValidator.withColours(stored, null, null).has("colours")).isFalse();
    }

    @Test
    @DisplayName("a stored row that cannot be read is no design, never an exception")
    void damagedRowsReadAsNone() {
        assertThat(DesignValidator.readStored(null)).isNull();
        assertThat(DesignValidator.readStored("  ")).isNull();
        assertThat(DesignValidator.readStored("{oops")).isNull();
        assertThat(DesignValidator.readStored("[1]")).isNull();
        assertThat(DesignValidator.readStored("{\"theme\":\"neon\",\"x\":1}").get("theme").asText()).isEqualTo("neon");
        assertThat(DesignValidator.readStored("{\"theme\":\"neon\",\"x\":1}").has("x")).isFalse();
    }

    @Test
    @DisplayName("bad input is refused with a reason a person can read")
    void refusalsCarryAReason() {
        assertThatThrownBy(() -> DesignValidator.validate("[]"))
            .isInstanceOf(DesignValidator.Rejected.class)
            .hasMessageContaining("JSON object");
        assertThatThrownBy(() -> DesignValidator.validate("{" + " ".repeat(9000) + "}"))
            .hasMessageContaining("8192");
    }
}
