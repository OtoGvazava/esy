package com.esyback.ecommerce.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The text of every SMS the platform sends, editable from admin.esy.ge without
 * a redeploy.
 *
 * <p>Templates live in the {@link ConfigStore} rather than in a properties file
 * because their wording is operational, not structural: "the courier calls
 * before delivery" is the kind of sentence that gets changed after the first
 * week of real deliveries, and it should not need a release.
 *
 * <p><b>Georgian only, for now.</b> A shopper's language preference is held in
 * the browser (localStorage), not on the account, so at the moment an SMS is
 * sent there is nothing on the server that says which language this person
 * reads. D12 makes Georgian the platform's first language, so that is what
 * goes out. Adding a language column to the user is what unlocks a second set.
 *
 * <p><b>Placeholders are validated, not trusted.</b> {@link #REQUIRED} names
 * the token each template cannot lose — an OTP text without {@code {code}} is
 * a message that never delivers the one thing it exists to carry, and it would
 * fail silently for every person signing up.
 */
@Component
@RequiredArgsConstructor
public class SmsTemplates {

    /** Template keys, in the order the admin screen shows them. */
    public static final String OTP = "otp";
    public static final String ORDER_PLACED = "orderPlaced";
    public static final String ORDER_SHIPPED = "orderShipped";
    public static final String ORDER_OUT = "orderOut";
    public static final String ORDER_DELIVERED = "orderDelivered";

    public static final List<String> KEYS =
        List.of(OTP, ORDER_PLACED, ORDER_SHIPPED, ORDER_OUT, ORDER_DELIVERED);

    /**
     * Defaults, taken from the design's SMS thread. Each is one sentence: SMS
     * Office bills per unit and Georgian is Unicode, which is 70 characters a
     * unit rather than 160.
     */
    private static final Map<String, String> DEFAULTS = Map.of(
        OTP, "esy.ge — {code}. კოდი არავის გაუზიარო.",
        ORDER_PLACED, "შეკვეთა {order} მიღებულია. სტატუსი: {url}",
        ORDER_SHIPPED, "შეკვეთა {order} გაიგზავნა. კურიერი ჩაბარებამდე დაგირეკავთ.",
        ORDER_OUT, "შეკვეთა {order} კურიერთანაა და დღეს ჩაბარდება.",
        ORDER_DELIVERED, "შეკვეთა {order} ჩაბარდა. მადლობა! დაბრუნება 14 დღეშია შესაძლებელი."
    );

    /** Tokens each template may use. Anything else is a typo, not a variable. */
    private static final Map<String, Set<String>> ALLOWED = Map.of(
        OTP, Set.of("code"),
        ORDER_PLACED, Set.of("order", "store", "url"),
        ORDER_SHIPPED, Set.of("order", "store", "url"),
        ORDER_OUT, Set.of("order", "store", "url"),
        ORDER_DELIVERED, Set.of("order", "store", "url")
    );

    /**
     * The token a template must keep. Only the OTP has one: without {@code
     * {code}} the message is useless and the failure is invisible — the person
     * gets a text and still cannot verify. The order templates carry no such
     * obligation; a shop may legitimately want "your order has shipped" with
     * no number in it.
     */
    private static final Map<String, String> REQUIRED = Map.of(OTP, "code");

    private final ConfigStore config;

    public static boolean isKnown(String key) {
        return KEYS.contains(key);
    }

    public static String defaultFor(String key) {
        return DEFAULTS.getOrDefault(key, "");
    }

    public static Set<String> allowedTokens(String key) {
        return ALLOWED.getOrDefault(key, Set.of());
    }

    public static String requiredToken(String key) {
        return REQUIRED.get(key);
    }

    /** The live text for a template, falling back to the shipped default. */
    public String get(String key) {
        String v = config.get(configKey(key), null);
        return v == null || v.isBlank() ? defaultFor(key) : v;
    }

    public void set(String key, String value) {
        config.set(configKey(key), value == null ? "" : value.trim());
    }

    /**
     * Whether this message is sent at all, on unless turned off.
     *
     * <p>The OTP is deliberately NOT switchable: a shopper must verify a phone
     * before paying, so silencing that message does not save money, it stops
     * checkout. The four order notifications are courtesies and a shop watching
     * its SMS bill can legitimately drop any of them.
     */
    public boolean isEnabled(String key) {
        if (OTP.equals(key)) return true;
        return !"false".equalsIgnoreCase(config.get(enabledKey(key), "true"));
    }

    public void setEnabled(String key, boolean on) {
        if (OTP.equals(key)) return;   // not switchable; see isEnabled
        config.set(enabledKey(key), Boolean.toString(on));
    }

    /** The OTP is required by checkout, so it has no switch to render. */
    public static boolean isSwitchable(String key) {
        return !OTP.equals(key);
    }

    /** Every template with its current text — what the admin screen reads. */
    public Map<String, String> all() {
        Map<String, String> m = new LinkedHashMap<>();
        for (String k : KEYS) m.put(k, get(k));
        return m;
    }

    /**
     * Substitutes {@code {token}} values. A token with no value is removed
     * rather than left as a literal brace — a shopper should never receive
     * "your order {order} has shipped".
     */
    public String render(String key, Map<String, String> values) {
        String out = get(key);
        for (String token : allowedTokens(key)) {
            String v = values == null ? null : values.get(token);
            out = out.replace("{" + token + "}", v == null ? "" : v);
        }
        return out.replaceAll("\\s{2,}", " ").trim();
    }

    /**
     * @return null when the text is acceptable, otherwise the reason it is not
     */
    public static String validate(String key, String text) {
        if (!isKnown(key)) return "Unknown template";
        if (text == null || text.isBlank()) return "The message cannot be empty";
        if (text.length() > 1000) return "SMS Office accepts at most 1000 characters";
        String required = requiredToken(key);
        if (required != null && !text.contains("{" + required + "}")) {
            return "This message must contain {" + required + "}";
        }
        for (String token : tokensIn(text)) {
            if (!allowedTokens(key).contains(token)) {
                return "Unknown placeholder {" + token + "}";
            }
        }
        return null;
    }

    /** Every {token} appearing in the text. */
    static Set<String> tokensIn(String text) {
        Set<String> found = new java.util.LinkedHashSet<>();
        java.util.regex.Matcher m = java.util.regex.Pattern
            .compile("\\{([a-zA-Z]+)}").matcher(text == null ? "" : text);
        while (m.find()) found.add(m.group(1));
        return found;
    }

    /**
     * SMS billing units for the rendered length. Georgian is Unicode, so the
     * limits are 70 for one part and 67 per part once a message is split —
     * the admin screen shows this because the difference between one unit and
     * two is the difference between one bill and two.
     */
    public static int units(String text) {
        int len = text == null ? 0 : text.length();
        if (len == 0) return 0;
        return len <= 70 ? 1 : (int) Math.ceil(len / 67.0);
    }

    private static String configKey(String key) {
        return "app.sms.template." + key;
    }

    private static String enabledKey(String key) {
        return "app.sms.template." + key + ".enabled";
    }
}
