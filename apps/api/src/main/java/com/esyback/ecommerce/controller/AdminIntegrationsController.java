package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.config.EmailProperties;
import com.esyback.ecommerce.config.SmsProperties;
import com.esyback.ecommerce.service.ConfigStore;
import com.esyback.ecommerce.service.EmailSender;
import com.esyback.ecommerce.service.EmailTemplates;
import com.esyback.ecommerce.service.SmsSender;
import com.esyback.ecommerce.service.SmsTemplates;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ADMIN-only integrations: the outbound channels the platform speaks through.
 * Today that is SMS Office; email joins it when a provider is wired.
 *
 * <p>The API key is <b>never returned</b>, only whether one is set. It comes
 * from the environment and is a secret; this screen is a read-write UI that
 * anyone holding ADMIN can open, and echoing a credential back into a browser
 * to render a "current value" field is how secrets end up in screenshots and
 * bug reports. Rotating the key is a deployment action, and the screen says so.
 *
 * <p>Everything else here — the sender name and the message templates — is
 * operational wording that changes with experience, so it lives in the
 * {@link ConfigStore} and takes effect within its cache TTL, no redeploy.
 */
@RestController
@RequestMapping("/api/admin/integrations")
@RequiredArgsConstructor
public class AdminIntegrationsController {

    private final SmsProperties smsProperties;
    private final SmsTemplates templates;
    private final SmsSender smsSender;
    private final EmailProperties emailProperties;
    private final EmailTemplates emailTemplates;
    private final EmailSender emailSender;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> current() {
        Map<String, Object> sms = new LinkedHashMap<>();
        // Whether, not what.
        sms.put("configured", smsProperties.isConfigured());
        sms.put("enabled", smsProperties.isEnabled());
        sms.put("sender", smsProperties.getSender());
        sms.put("endpoint", "https://smsoffice.ge/api/v2/send/");
        // Every switch and text on this screen is written to the config store.
        // If that store is down the screen still renders current values but no
        // edit can be saved, so the UI has to be able to say so up front rather
        // than let an admin discover it one failed save at a time.
        sms.put("storeReady", smsProperties.isStoreReady());
        // Why the last send failed, straight from the provider. Without this a
        // merchant sees only "could not send the code" and the answer sits in a
        // log on a host nobody opens.
        SmsSender.Failure f = smsSender.getLastFailure();
        if (f != null) {
            Map<String, Object> last = new LinkedHashMap<>();
            last.put("reason", f.reason());
            last.put("errorCode", f.errorCode());
            last.put("at", f.at());
            sms.put("lastFailure", last);
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (String key : SmsTemplates.KEYS) {
            String text = templates.get(key);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("key", key);
            row.put("text", text);
            row.put("isDefault", text.equals(SmsTemplates.defaultFor(key)));
            row.put("defaultText", SmsTemplates.defaultFor(key));
            row.put("tokens", SmsTemplates.allowedTokens(key).stream().sorted().toList());
            row.put("requiredToken", SmsTemplates.requiredToken(key));
            row.put("enabled", templates.isEnabled(key));
            // The OTP has no switch: silencing it does not save money, it stops
            // checkout, because a phone must be verified before paying.
            row.put("switchable", SmsTemplates.isSwitchable(key));
            // Shown beside each template: Georgian is Unicode, so 70 characters
            // is one billed unit and 71 is two.
            row.put("length", text.length());
            row.put("units", SmsTemplates.units(text));
            rows.add(row);
        }
        sms.put("templates", rows);

        Map<String, Object> email = new LinkedHashMap<>();
        // Whether, not what — the API key is never echoed back, same as SMS.
        email.put("configured", emailProperties.isConfigured());
        email.put("enabled", emailProperties.isEnabled());
        email.put("from", emailProperties.getFrom());
        email.put("endpoint", "https://api.resend.com/emails");
        email.put("storeReady", emailProperties.isStoreReady());
        EmailSender.Failure ef = emailSender.getLastFailure();
        if (ef != null) {
            Map<String, Object> last = new LinkedHashMap<>();
            last.put("reason", ef.reason());
            last.put("statusCode", ef.statusCode());
            last.put("at", ef.at());
            email.put("lastFailure", last);
        }
        email.put("templates", emailTemplates.all());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sms", sms);
        body.put("email", email);
        return body;
    }

    /**
     * Update the sender name and/or any subset of templates. Only the keys
     * present in the body are written, so one row can be saved on its own.
     *
     * <p>Body: {@code {"sender": "...", "templates": {"otp": "...", ...}}}
     */
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> update(@RequestBody Map<String, Object> body) {
        if (body == null) throw bad("Nothing to update");

        if (body.get("sender") instanceof String sender) {
            String s = sender.trim();
            // SMS Office: at most 11 characters, alphanumeric plus hyphen and
            // period. A rejected sender fails EVERY message, so it is checked
            // here rather than discovered one failed sign-up at a time.
            if (s.isEmpty()) throw bad("Sender name cannot be empty");
            if (s.length() > 11) throw bad("Sender name is at most 11 characters");
            if (!s.matches("[A-Za-z0-9.-]+")) {
                throw bad("Sender name may use letters, digits, hyphen and period only");
            }
            smsProperties.setSender(s);
        }

        if (body.get("enabled") instanceof Boolean on) {
            smsProperties.setEnabled(on);
        }

        // Per-message switches: {"templateEnabled": {"orderShipped": false}}
        if (body.get("templateEnabled") instanceof Map<?, ?> flags) {
            for (Map.Entry<?, ?> e : flags.entrySet()) {
                String key = String.valueOf(e.getKey());
                if (!SmsTemplates.isKnown(key)) throw bad("Unknown template " + key);
                if (!SmsTemplates.isSwitchable(key)) {
                    throw bad("The verification code cannot be switched off — checkout needs it");
                }
                templates.setEnabled(key, Boolean.TRUE.equals(e.getValue()));
            }
        }

        if (body.get("templates") instanceof Map<?, ?> t) {
            for (Map.Entry<?, ?> e : t.entrySet()) {
                String key = String.valueOf(e.getKey());
                String text = e.getValue() == null ? "" : String.valueOf(e.getValue());
                String problem = SmsTemplates.validate(key, text);
                if (problem != null) throw bad(problem);
                templates.set(key, text);
            }
        }

        // ---- Email (Resend) -------------------------------------------------
        // Nested under "email" so the two integrations cannot collide on a key
        // name as they grow; the SMS fields stay top-level for compatibility
        // with the screen that already reads them.
        if (body.get("email") instanceof Map<?, ?> em) {
            if (em.get("from") instanceof String from) {
                String f = from.trim();
                if (f.isEmpty()) throw bad("The from-address cannot be empty");
                if (f.length() > 200) throw bad("The from-address is too long");
                // Accepts both "a@b.ge" and "Name <a@b.ge>", which is what
                // Resend takes. The address inside is what has to be valid.
                String bare = f.matches(".*<.+>\\s*$")
                    ? f.substring(f.lastIndexOf('<') + 1, f.lastIndexOf('>')).trim()
                    : f;
                if (!EmailSender.looksLikeAddress(bare)) {
                    throw bad("\"" + f + "\" is not an address Resend will accept");
                }
                emailProperties.setFrom(f);
            }

            if (em.get("enabled") instanceof Boolean on) {
                emailProperties.setEnabled(on);
            }

            if (em.get("templateEnabled") instanceof Map<?, ?> flags) {
                for (Map.Entry<?, ?> e : flags.entrySet()) {
                    String key = String.valueOf(e.getKey());
                    if (!EmailTemplates.isKnown(key)) throw bad("Unknown email template " + key);
                    emailTemplates.setEnabled(key, Boolean.TRUE.equals(e.getValue()));
                }
            }

            // {"templates": {"orderPlaced": {"subject": "...", "body": "..."}}}
            // Subject and body are validated together, because a template is
            // only usable if both are — saving one and rejecting the other
            // would leave a half-edited message live.
            if (em.get("templates") instanceof Map<?, ?> t) {
                for (Map.Entry<?, ?> e : t.entrySet()) {
                    String key = String.valueOf(e.getKey());
                    if (!EmailTemplates.isKnown(key)) throw bad("Unknown email template " + key);
                    if (!(e.getValue() instanceof Map<?, ?> row)) {
                        throw bad("Each email template needs a subject and a body");
                    }
                    String subject = row.get("subject") == null
                        ? emailTemplates.subject(key) : String.valueOf(row.get("subject"));
                    String text = row.get("body") == null
                        ? emailTemplates.body(key) : String.valueOf(row.get("body"));
                    String problem = EmailTemplates.validate(key, subject, text);
                    if (problem != null) throw bad(problem);
                    emailTemplates.setSubject(key, subject);
                    emailTemplates.setBody(key, text);
                }
            }
        }

        return ResponseEntity.ok(Map.of(
            "ok", true,
            "note", "Written to the config store; the change applies within a few seconds."));
    }

    private ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, msg);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
