package com.esyback.ecommerce.config;

import com.esyback.ecommerce.service.ConfigStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Platform tunables, read live from the {@link ConfigStore} at call time so
 * e.g. the service-fee rate changes with no redeploy.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class PlatformProperties {

    private static final BigDecimal DEFAULT_FEE = new BigDecimal("0.02");

    private final ConfigStore config;

    /** Platform service fee as a fraction of order total (0.02 = 2%). */
    public BigDecimal getServiceFeeRate() {
        String v = config.get("app.platform.service-fee-rate", "0.02");
        try {
            return new BigDecimal(v.trim());
        } catch (RuntimeException e) {
            log.warn("Invalid service-fee-rate '{}' in config store; using {}", v, DEFAULT_FEE);
            return DEFAULT_FEE;
        }
    }
}
