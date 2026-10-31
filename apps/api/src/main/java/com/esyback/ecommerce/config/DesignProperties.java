package com.esyback.ecommerce.config;

import com.esyback.ecommerce.service.ConfigStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * The store design system's kill switch ({@code app.design.enabled}), read
 * live from the {@link ConfigStore} so admin.esy.ge/config can flip it with no
 * redeploy.
 *
 * <p>Off means the platform behaves as it did before designs existed:
 * {@code GET /api/tenant/current} sends {@code design: null} (the storefront
 * draws today's chrome), store creation ignores a design, and nothing can be
 * published, because publishing writes the store's colour columns, which
 * today's storefront already draws. Owners' drafts are kept and can still be
 * saved; none of that is visible.
 *
 * <p>On unless explicitly {@code false}, like the SMS and email switches. Set
 * it in the Render environment too when it matters: the free Key Value store
 * is non-persistent, so an admin override can vanish on its restart and fall
 * back to the environment.
 */
@Component
@RequiredArgsConstructor
public class DesignProperties {

    public static final String ENABLED_KEY = "app.design.enabled";

    private final ConfigStore config;

    public boolean isEnabled() {
        String v = config.get(ENABLED_KEY, "true");
        return v == null || !"false".equalsIgnoreCase(v.trim());
    }

    /** Set from the admin config screen; the caller validates the input. */
    public void setEnabled(boolean on) {
        config.set(ENABLED_KEY, Boolean.toString(on));
    }
}
