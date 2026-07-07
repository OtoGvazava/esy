package com.esyback.ecommerce.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Miscellaneous app-level settings bound from {@code app.*}. Unknown {@code app.*}
 * subkeys (oauth2, secret, bog, platform — their own beans) are ignored.
 * Refreshable at runtime like the other config beans.
 */
@Component
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppProperties {

    /** Internet-reachable origin BOG redirects/calls back to; blank = derive from request. */
    private String publicBaseUrl = "";
}
