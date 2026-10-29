package com.esyback.ecommerce.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The text of every email the platform sends, editable from admin.esy.ge.
 *
 * <p>Same reasoning as {@link SmsTemplates}: this wording is operational, not
 * structural, and gets rewritten after the first week of real orders. Each
 * template is a subject and a plain-text body — never HTML. {@link EmailSender}
 * escapes and wraps the body, so a shop cannot break an email's markup by
 * editing its own copy, and the admin screen stays a pair of text fields.
 *
 * <p><b>Six templates, each tied to something the platform actually does.</b>
 * Four mirror the order SMS; cancellation and refund are email-only on purpose.
 * A cancellation is a conversation, often about money, and a text is the wrong
 * way to open one — but a written record of it is exactly right. A refund is the
 * same, with the added point that the money moves later than the message, so
 * the wording has to say "on its way" rather than "done".
 *
 * <p><b>Georgian, for now</b>, for the reason SmsTemplates records: a shopper's
 * language lives in their browser, not on their account, so at the moment a
 * message is sent there is nothing on the server that says which language this
 * person reads. D12 makes Georgian first.
 */
@Component
@RequiredArgsConstructor
public class EmailTemplates {

    public static final String ORDER_PLACED = "orderPlaced";
    public static final String ORDER_SHIPPED = "orderShipped";
    public static final String ORDER_OUT = "orderOut";
    public static final String ORDER_DELIVERED = "orderDelivered";
    public static final String ORDER_CANCELLED = "orderCancelled";
    public static final String ORDER_REFUNDED = "orderRefunded";

    public static final List<String> KEYS = List.of(
        ORDER_PLACED, ORDER_SHIPPED, ORDER_OUT, ORDER_DELIVERED,
        ORDER_CANCELLED, ORDER_REFUNDED);

    private static final Map<String, String> DEFAULT_SUBJECTS = Map.of(
        ORDER_PLACED, "შეკვეთა {order} მიღებულია",
        ORDER_SHIPPED, "შეკვეთა {order} გაიგზავნა",
        ORDER_OUT, "შეკვეთა {order} კურიერთანაა",
        ORDER_DELIVERED, "შეკვეთა {order} ჩაბარდა",
        ORDER_CANCELLED, "შეკვეთა {order} გაუქმდა",
        ORDER_REFUNDED, "შეკვეთა {order} — თანხის დაბრუნება"
    );

    private static final Map<String, String> DEFAULT_BODIES = Map.of(
        ORDER_PLACED, """
            გმადლობთ შეკვეთისთვის.

            შეკვეთა {order} მიღებულია მაღაზიისგან {store}. ჯამი: {total}.

            სტატუსს ნებისმიერ დროს ნახავთ აქ: {url}""",
        ORDER_SHIPPED, """
            შეკვეთა {order} გაიგზავნა.

            კურიერი ჩაბარებამდე დაგირეკავთ. სტატუსი: {url}""",
        ORDER_OUT, """
            შეკვეთა {order} კურიერთანაა და დღეს ჩაბარდება.

            სტატუსი: {url}""",
        ORDER_DELIVERED, """
            შეკვეთა {order} ჩაბარდა. მადლობა!

            დაბრუნება შესაძლებელია 14 დღის განმავლობაში. დეტალები: {url}""",
        ORDER_CANCELLED, """
            შეკვეთა {order} გაუქმდა.

            თუ თანხა უკვე გადახდილი იყო, დაბრუნება ცალკე მოხდება და ამის
            შესახებ ცალკე მიიღებთ შეტყობინებას.

            კითხვების შემთხვევაში დაგვიკავშირდით: {store}""",
        ORDER_REFUNDED, """
            შეკვეთა {order} — თანხა {amount} დაბრუნების პროცესშია.

            ბანკს შეიძლება დასჭირდეს რამდენიმე სამუშაო დღე, სანამ თანხა
            თქვენს ანგარიშზე აისახება.

            დეტალები: {url}"""
    );

    /** Tokens each template may use; anything else is a typo, not a variable. */
    private static final Set<String> ORDER_TOKENS = Set.of("order", "store", "url", "total");
    private static final Set<String> REFUND_TOKENS = Set.of("order", "store", "url", "total", "amount");

    private final ConfigStore config;

    public static boolean isKnown(String key) {
        return KEYS.contains(key);
    }

    public static String defaultSubject(String key) {
        return DEFAULT_SUBJECTS.getOrDefault(key, "");
    }

    public static String defaultBody(String key) {
        return DEFAULT_BODIES.getOrDefault(key, "");
    }

    public static Set<String> allowedTokens(String key) {
        return ORDER_REFUNDED.equals(key) ? REFUND_TOKENS : ORDER_TOKENS;
    }

    public String subject(String key) {
        String v = config.get(subjectKey(key), null);
        return v == null || v.isBlank() ? defaultSubject(key) : v;
    }

    public String body(String key) {
        String v = config.get(bodyKey(key), null);
        return v == null || v.isBlank() ? defaultBody(key) : v;
    }

    public void setSubject(String key, String value) {
        config.set(subjectKey(key), value == null ? "" : value.trim());
    }

    public void setBody(String key, String value) {
        config.set(bodyKey(key), value == null ? "" : value.trim());
    }

    /**
     * Whether this email is sent at all, on unless turned off.
     *
     * <p>Every one of them is switchable, unlike the OTP text: no part of
     * checkout waits on an email, so silencing one costs courtesy and nothing
     * else.
     */
    public boolean isEnabled(String key) {
        return !"false".equalsIgnoreCase(config.get(enabledKey(key), "true"));
    }

    public void setEnabled(String key, boolean on) {
        config.set(enabledKey(key), Boolean.toString(on));
    }

    /** Every template with its current wording — what the admin screen reads. */
    public List<Map<String, Object>> all() {
        List<Map<String, Object>> rows = new java.util.ArrayList<>();
        for (String key : KEYS) {
            Map<String, Object> row = new LinkedHashMap<>();
            String subject = subject(key);
            String body = body(key);
            row.put("key", key);
            row.put("subject", subject);
            row.put("body", body);
            row.put("defaultSubject", defaultSubject(key));
            row.put("defaultBody", defaultBody(key));
            row.put("isDefault", subject.equals(defaultSubject(key)) && body.equals(defaultBody(key)));
            row.put("tokens", allowedTokens(key).stream().sorted().toList());
            row.put("enabled", isEnabled(key));
            rows.add(row);
        }
        return rows;
    }

    /** Substitutes {@code {token}} values in both the subject and the body. */
    public String renderSubject(String key, Map<String, String> values) {
        return substitute(subject(key), key, values);
    }

    public String renderBody(String key, Map<String, String> values) {
        return substitute(body(key), key, values);
    }

    /**
     * A token with no value is removed rather than left as a literal brace: a
     * shopper should never receive "your order {order} has shipped". Unlike the
     * SMS renderer this does NOT collapse runs of whitespace — the blank lines
     * between paragraphs are the body's only structure.
     */
    private String substitute(String text, String key, Map<String, String> values) {
        String out = text;
        for (String token : allowedTokens(key)) {
            String v = values == null ? null : values.get(token);
            out = out.replace("{" + token + "}", v == null ? "" : v);
        }
        // Trailing spaces left by a removed token, but not the line breaks.
        return out.replaceAll("[ \\t]{2,}", " ").trim();
    }

    /**
     * @return null when the wording is acceptable, otherwise why it is not
     */
    public static String validate(String key, String subject, String body) {
        if (!isKnown(key)) return "Unknown template";
        if (subject == null || subject.isBlank()) return "The subject cannot be empty";
        if (subject.length() > 200) return "The subject is longer than 200 characters";
        if (body == null || body.isBlank()) return "The message cannot be empty";
        if (body.length() > 5000) return "The message is longer than 5000 characters";
        for (String token : SmsTemplates.tokensIn(subject + " " + body)) {
            if (!allowedTokens(key).contains(token)) {
                return "Unknown placeholder {" + token + "}";
            }
        }
        return null;
    }

    private static String subjectKey(String key) {
        return "app.email.template." + key + ".subject";
    }

    private static String bodyKey(String key) {
        return "app.email.template." + key + ".body";
    }

    private static String enabledKey(String key) {
        return "app.email.template." + key + ".enabled";
    }
}
