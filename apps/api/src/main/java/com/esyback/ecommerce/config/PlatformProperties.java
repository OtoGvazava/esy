package com.esyback.ecommerce.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Platform-level tunables, bound from {@code app.platform.*}. Refreshable at
 * runtime (see {@link BogProperties}) so e.g. the service-fee rate can change
 * live without a redeploy. Read the getter at call time, never cache it.
 */
@Component
@ConfigurationProperties(prefix = "app.platform")
@Getter
@Setter
public class PlatformProperties {

    /** Platform service fee as a fraction of order total (0.02 = 2%). */
    private BigDecimal serviceFeeRate = new BigDecimal("0.02");
}
