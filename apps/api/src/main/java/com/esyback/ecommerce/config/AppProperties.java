package com.esyback.ecommerce.config;

import com.esyback.ecommerce.service.ConfigStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Misc app-level settings, read live from the {@link ConfigStore} at call time.
 */
@Component
@RequiredArgsConstructor
public class AppProperties {

    private final ConfigStore config;

    /** Internet-reachable origin BOG redirects/calls back to; blank = derive from request. */
    public String getPublicBaseUrl() {
        return config.get("app.public-base-url", "");
    }
}
