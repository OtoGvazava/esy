package com.esyback.ecommerce.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Bank of Georgia settings, bound from {@code app.bog.*}. A dedicated
 * {@code @ConfigurationProperties} bean (rather than field {@code @Value}s on
 * the service) so the values can be re-sourced and refreshed at runtime:
 * Spring Cloud's {@code ConfigurationPropertiesRebinder} re-binds this bean on
 * a {@code /actuator/refresh} (e.g. after a Consul KV change), and because
 * {@code BogPaymentService} reads the getters at call time, the new values take
 * effect with no redeploy. The service itself stays a plain singleton so its
 * per-store token cache survives.
 */
@Component
@ConfigurationProperties(prefix = "app.bog")
@Getter
@Setter
public class BogProperties {

    /** Environment selector: {@code live} (default) or {@code sandbox}. */
    private String env = "live";

    /** Explicit OAuth token host override; blank = derive from {@link #env}. */
    private String authUrl = "";

    /** Explicit API base host override; blank = derive from {@link #env}. */
    private String baseUrl = "";

    /** Callback-signing public key (PEM); blank = skip signature verification. */
    private String publicKey = "";
}
