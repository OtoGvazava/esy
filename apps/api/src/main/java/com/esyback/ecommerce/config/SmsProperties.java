package com.esyback.ecommerce.config;

import com.esyback.ecommerce.service.ConfigStore;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * SMS Office (smsoffice.ge) credentials and sender name.
 *
 * <p>The API key comes from the environment, never the {@link ConfigStore}: it
 * is a secret, and the live-config screen is a read-write UI that an admin can
 * see. The sender name is not a secret and is read live, because it has to be
 * registered and activated on the SMS Office side and may need changing without
 * a redeploy while that is sorted out.
 *
 * <p>With no key configured the app runs exactly as before — the code is logged
 * and returned to the caller — so local development needs no account. See
 * {@code PhoneVerificationService} for why that fallback is gated.
 */
@Component
@RequiredArgsConstructor
public class SmsProperties {

    /**
     * Sender names are limited to 11 characters, alphanumeric plus hyphen and
     * period. "esy.ge" fits and is what a recipient expects to see.
     */
    private static final String DEFAULT_SENDER = "esy.ge";

    private final ConfigStore config;

    @Value("${app.sms.key:}")
    private String apiKey;

    /** Blank when no account is wired up — the caller falls back to dev mode. */
    public String getApiKey() {
        return apiKey == null ? "" : apiKey.trim();
    }

    public boolean isConfigured() {
        return !getApiKey().isEmpty();
    }

    public String getSender() {
        String s = config.get(SENDER_KEY, DEFAULT_SENDER);
        return s == null || s.isBlank() ? DEFAULT_SENDER : s.trim();
    }

    /** Set from the admin integrations screen; validated by the caller. */
    public void setSender(String value) {
        config.set(SENDER_KEY, value == null ? "" : value.trim());
    }

    private static final String SENDER_KEY = "app.sms.sender";
}
