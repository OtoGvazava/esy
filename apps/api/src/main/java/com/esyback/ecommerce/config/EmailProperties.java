package com.esyback.ecommerce.config;

import com.esyback.ecommerce.service.ConfigStore;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Resend credentials and the address mail goes out as.
 *
 * <p>Shaped exactly like {@link SmsProperties}, and for the same reasons: the
 * API key comes from the environment because it is a secret and the live-config
 * screen is a read-write UI an admin can see, while the from-address and the
 * master switch are read live so they can be changed without a redeploy.
 *
 * <p>With no key configured nothing is sent and nothing fails — an order still
 * completes, it just goes unannounced by mail. That is the same degradation SMS
 * has, and it is what lets the whole feature ship before the domain is verified
 * with the provider.
 */
@Component
@RequiredArgsConstructor
public class EmailProperties {

    /**
     * Must be on a domain verified with Resend, or every send is refused. The
     * default matches the platform's own domain; it is read through the config
     * store so it can be corrected live while that verification is sorted out —
     * the lesson from the SMS sender name, which took a production outage to
     * learn.
     */
    private static final String DEFAULT_FROM = "esy.ge <no-reply@esy.ge>";

    private final ConfigStore config;

    @Value("${app.email.key:}")
    private String apiKey;

    /** Blank when no account is wired up; nothing is sent. */
    public String getApiKey() {
        return apiKey == null ? "" : apiKey.trim();
    }

    public boolean isConfigured() {
        return !getApiKey().isEmpty();
    }

    public String getFrom() {
        String s = config.get(FROM_KEY, DEFAULT_FROM);
        return s == null || s.isBlank() ? DEFAULT_FROM : s.trim();
    }

    public void setFrom(String value) {
        config.set(FROM_KEY, value == null ? "" : value.trim());
    }

    /**
     * Master switch, on unless explicitly turned off.
     *
     * <p>Unlike the SMS switch this one is safe to leave off: no part of
     * checkout depends on an email arriving, so turning it off costs courtesy
     * rather than function.
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

    private static final String FROM_KEY = "app.email.from";
    private static final String ENABLED_KEY = "app.email.enabled";
}
