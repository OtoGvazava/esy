package com.esyback.ecommerce.service;

import com.esyback.ecommerce.config.SmsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Sends SMS through SMS Office (smsoffice.ge).
 *
 * <p>POST {@code https://smsoffice.ge/api/v2/send/} — form-encoded, with the
 * trailing slash the API requires on POST. Parameters: {@code key},
 * {@code destination}, {@code sender}, {@code content}. The response is JSON
 * carrying {@code Success} and {@code ErrorCode}, where 0 means accepted;
 * 20 is insufficient balance and 80 an unknown key.
 *
 * <p>Two things this deliberately does NOT do:
 *
 * <ul>
 *   <li><b>Log the message body.</b> The only SMS the platform sends today
 *       carries a one-time code, and a verification code in an application log
 *       is a credential in an application log.</li>
 *   <li><b>Retry.</b> A failed send returns false and the caller tells the
 *       person to try again. Retrying automatically risks delivering two codes
 *       for one request, and the second would invalidate the first — the user
 *       would be typing a code that has already been replaced.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SmsSender {

    private static final URI ENDPOINT = URI.create("https://smsoffice.ge/api/v2/send/");
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final SmsProperties props;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();

    /**
     * Why the last send failed, for the admin integrations screen.
     *
     * <p>The provider tells us exactly what is wrong — wrong key, no balance,
     * unregistered sender — and until now that answer went only to the
     * application log, which on a hosted deployment is the one place the person
     * who can fix it is least likely to look. A failed verification showed them
     * "could not send the code" and nothing else. It is held in memory rather
     * than the config store because it is a diagnostic, not configuration, and
     * must remain readable when that store is exactly what is broken.
     */
    private volatile Failure lastFailure;

    public record Failure(String reason, Integer errorCode, Instant at) {}

    public Failure getLastFailure() {
        return lastFailure;
    }

    private boolean fail(String reason, Integer errorCode) {
        lastFailure = new Failure(reason, errorCode, Instant.now());
        return false;
    }

    public boolean isConfigured() {
        return props.isConfigured();
    }

    /** A key exists AND the master switch is on. */
    public boolean isSending() {
        return props.isConfigured() && props.isEnabled();
    }

    /**
     * Sends one message. Returns false on any failure — an unconfigured
     * account, a rejected request, a network fault — so the caller can decide
     * what to tell the person rather than having an exception decide for it.
     *
     * @param phone recipient in any human format; normalised here
     */
    public boolean send(String phone, String text) {
        if (!props.isConfigured()) return false;
        if (!props.isEnabled()) {
            log.info("SMS suppressed: the master switch is off in admin integrations");
            return false;
        }
        String destination = normalise(phone);
        if (destination == null) {
            log.warn("SMS not sent: phone number is not a usable Georgian mobile");
            return fail("The phone number is not a usable Georgian mobile", null);
        }
        try {
            String body = form(Map.of(
                "key", props.getApiKey(),
                "destination", destination,
                "sender", props.getSender(),
                "content", text));
            HttpRequest req = HttpRequest.newBuilder(ENDPOINT)
                .timeout(TIMEOUT)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (res.statusCode() / 100 != 2) {
                log.warn("SMS Office returned HTTP {}", res.statusCode());
                return fail("SMS Office returned HTTP " + res.statusCode(), null);
            }
            // The body is small and flat; the one field that decides the
            // outcome is ErrorCode, where 0 is "accepted for delivery".
            int errorCode = errorCode(res.body());
            if (errorCode != 0) {
                log.warn("SMS Office rejected the message, ErrorCode={} ({})", errorCode, meaning(errorCode));
                return fail(meaning(errorCode), errorCode);
            }
            lastFailure = null;
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("SMS send interrupted");
            return fail("The send was interrupted", null);
        } catch (Exception e) {
            log.warn("SMS send failed: {}", e.getClass().getSimpleName());
            return fail("Could not reach SMS Office (" + e.getClass().getSimpleName() + ")", null);
        }
    }

    /**
     * SMS Office wants a bare international number — {@code 995577123456}, with
     * no leading {@code +} or {@code 00} and no spaces. Stored numbers are
     * human-formatted ("+995 555 20 41 88"), and a local number may arrive
     * without its country code.
     */
    static String normalise(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("\\D", "");
        if (digits.startsWith("00")) digits = digits.substring(2);
        // A bare 9-digit mobile (5xxxxxxxx) is Georgian; prefix the country code.
        if (digits.length() == 9 && digits.startsWith("5")) digits = "995" + digits;
        return digits.length() >= 11 && digits.length() <= 15 ? digits : null;
    }

    private static String form(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        params.forEach((k, v) -> {
            if (sb.length() > 0) sb.append('&');
            sb.append(URLEncoder.encode(k, StandardCharsets.UTF_8))
              .append('=')
              .append(URLEncoder.encode(v == null ? "" : v, StandardCharsets.UTF_8));
        });
        return sb.toString();
    }

    /** Pulls ErrorCode out of the JSON without pulling in a parser for one field. */
    static int errorCode(String json) {
        if (json == null) return -1;
        int i = json.indexOf("\"ErrorCode\"");
        if (i < 0) return -1;
        int colon = json.indexOf(':', i);
        if (colon < 0) return -1;
        StringBuilder num = new StringBuilder();
        for (int p = colon + 1; p < json.length(); p++) {
            char c = json.charAt(p);
            if (Character.isDigit(c) || (c == '-' && num.length() == 0)) num.append(c);
            else if (num.length() > 0) break;
        }
        try {
            return num.length() == 0 ? -1 : Integer.parseInt(num.toString());
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    /** Only the codes worth naming in a log; everything else stays numeric. */
    private static String meaning(int code) {
        return switch (code) {
            case 20 -> "insufficient balance";
            case 80 -> "no user for this API key";
            case 120 -> "API access disabled in the SMS Office profile";
            default -> "see SMS Office docs";
        };
    }
}
