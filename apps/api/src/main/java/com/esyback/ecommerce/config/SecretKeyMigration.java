package com.esyback.ecommerce.config;

import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.security.SecretCipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Moves stored BOG secrets off the published development key (review M22).
 *
 * <p>While the default key is in use it says so, loudly, at every start. Once
 * {@code APP_SECRET_ENC_KEY} is set, every secret that still only opens with
 * the default is re-encrypted with the real key, so setting the key never
 * makes a store re-enter its credentials. Idempotent: a secret already under
 * the real key is left alone.
 */
@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
public class SecretKeyMigration implements CommandLineRunner {

    private final SecretCipher cipher;
    private final TenantRepository tenants;

    @Override
    @Transactional
    public void run(String... args) {
        if (cipher.usingDefaultKey()) {
            log.warn("APP_SECRET_ENC_KEY is not set: stores' BOG secrets are encrypted with the key "
                + "published in the repository. Set APP_SECRET_ENC_KEY to a long random value; "
                + "existing secrets are re-encrypted with it automatically on the next start.");
            return;
        }
        int moved = 0;
        for (Tenant t : tenants.findAll()) {
            String stored = t.getBogClientSecret();
            if (cipher.isUnderDefaultKey(stored)) {
                t.setBogClientSecret(cipher.encrypt(cipher.decrypt(stored)));
                tenants.save(t);
                moved++;
            }
        }
        if (moved > 0) {
            log.info("SecretKeyMigration: re-encrypted {} store BOG secret(s) with APP_SECRET_ENC_KEY", moved);
        }
    }
}
