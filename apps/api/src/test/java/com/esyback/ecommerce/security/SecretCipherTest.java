package com.esyback.ecommerce.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Moving off the published key must not lose any store's BOG secret (review
 * M22): old secrets still open, are flagged for re-encryption, and come out
 * under the real key.
 */
class SecretCipherTest {

    @Test
    @DisplayName("the published default and a blank key both count as 'no real key'")
    void defaultDetected() {
        assertThat(new SecretCipher(SecretCipher.DEV_DEFAULT_KEY).usingDefaultKey()).isTrue();
        assertThat(new SecretCipher("").usingDefaultKey()).isTrue();
        assertThat(new SecretCipher("a-long-random-production-key").usingDefaultKey()).isFalse();
    }

    @Test
    @DisplayName("a secret stored under the default (or blank) key still opens once a real key is set, and is flagged")
    void legacySecretsMigrate() {
        SecretCipher real = new SecretCipher("a-long-random-production-key");
        for (String oldKey : new String[] {SecretCipher.DEV_DEFAULT_KEY, ""}) {
            String old = new SecretCipher(oldKey).encrypt("client-secret");
            assertThat(real.decrypt(old)).isEqualTo("client-secret");
            assertThat(real.isUnderDefaultKey(old)).isTrue();

            String moved = real.encrypt(real.decrypt(old));
            assertThat(real.isUnderDefaultKey(moved)).isFalse();
            assertThat(real.decrypt(moved)).isEqualTo("client-secret");
            // ...and the published key can no longer open it.
            assertThatThrownBy(() -> new SecretCipher(SecretCipher.DEV_DEFAULT_KEY).decrypt(moved))
                .isInstanceOf(IllegalStateException.class);
        }
    }

    @Test
    @DisplayName("a secret under some other real key is not silently accepted")
    void otherRealKeyFails() {
        String other = new SecretCipher("some-other-real-key").encrypt("client-secret");
        SecretCipher real = new SecretCipher("a-long-random-production-key");
        assertThat(real.isUnderDefaultKey(other)).isFalse();
        assertThatThrownBy(() -> real.decrypt(other)).isInstanceOf(IllegalStateException.class);
    }
}
