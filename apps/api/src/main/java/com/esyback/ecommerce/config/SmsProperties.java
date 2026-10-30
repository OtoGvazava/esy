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
 * <p>With no key configured and {@code app.sms.dev-fallback} on, the code is
 * logged and returned to the caller, so local development needs no account.
 * Without the flag, no key means no codes at all. See
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

    /**
     * Whether a deployment WITHOUT a key may hand the code back to the browser.
     *
     * <p>Off unless set. Registration now requires a verified phone, so a hosted
     * deployment that lost its key would otherwise give every new account its
     * own code and the check would mean nothing. The docker-compose stack sets
     * it; Render must not.
     */
    @Value("${app.sms.dev-fallback:false}")
    private boolean devFallback;

    public boolean isDevFallback() {
        return devFallback;
    }

    public String getSender() {
        String s = config.get(SENDER_KEY, DEFAULT_SENDER);
        return s == null || s.isBlank() ? DEFAULT_SENDER : s.trim();
    }

    /** Set from the admin integrations screen; validated by the caller. */
    public void setSender(String value) {
        config.set(SENDER_KEY, value == null ? "" : value.trim());
    }

    /**
     * Master switch, on unless explicitly turned off.
     *
     * <p>Off means NO message leaves the platform, including the verification
     * code — which is required before paying, so checkout stops working too.
     * That is the honest behaviour for a kill switch and the admin screen says
     * so plainly; the alternative, quietly falling back to handing the code to
     * the browser, would turn a cost decision into a security hole.
     */
    public boolean isEnabled() {
        return !"false".equalsIgnoreCase(config.get(ENABLED_KEY, "true"));
    }

    public void setEnabled(boolean on) {
        config.set(ENABLED_KEY, Boolean.toString(on));
    }

    /** Whether admin writes can persist at all — the config store is Redis. */
    public boolean isStoreReady() {
        return config.ready();
    }

    private static final String SENDER_KEY = "app.sms.sender";
    private static final String ENABLED_KEY = "app.sms.enabled";
}
