package com.esyback.ecommerce.config;

import com.esyback.ecommerce.service.ConfigStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Bank of Georgia settings, read live from the {@link ConfigStore} (Redis
 * override → env/yaml → default) at call time — so the admin UI can change them
 * with no redeploy. Same getter surface as before, so BogPaymentService is
 * unchanged; it stays a plain singleton (its token cache is preserved).
 */
@Component
@RequiredArgsConstructor
public class BogProperties {

    private final ConfigStore config;

    /** {@code live} (default) or {@code sandbox}. */
    public String getEnv() {
        return config.get("app.bog.env", "live");
    }

    /** Explicit OAuth token host override; blank = derive from env. */
    public String getAuthUrl() {
        return config.get("app.bog.auth-url", "");
    }

    /** Explicit API base host override; blank = derive from env. */
    public String getBaseUrl() {
        return config.get("app.bog.base-url", "");
    }

    /** Callback-signing public key (PEM); blank = skip signature verification. */
    public String getPublicKey() {
        return config.get("app.bog.public-key", "");
    }
}
