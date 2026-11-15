package com.esyback.ecommerce.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM symmetric cipher for secrets that must be stored at rest but
 * later used in plaintext (per-tenant BOG client secrets). Output is
 * {@code base64(iv ‖ ciphertext+tag)} and self-describing, so it round-trips
 * regardless of how Hibernate persists the column.
 *
 * <p>The key is derived (SHA-256) from {@code app.secret.enc-key} so any-length
 * input works — same trick {@code JwtUtil} uses for the HS512 key. The dev
 * default lets local runs work without configuration, but it is published in
 * this repository, so anyone with a database dump could decrypt every
 * merchant's secret with it (review M22). Production must set
 * {@code APP_SECRET_ENC_KEY}.
 *
 * <p>Moving off the default is safe: while a real key is set, decryption
 * still falls back to the published default, and {@code SecretKeyMigration}
 * re-encrypts every such secret with the real key at startup. Nobody has to
 * re-enter their BOG credentials.
 */
@Component
public class SecretCipher {

    /** The published development key. Never acceptable in production. */
    public static final String DEV_DEFAULT_KEY = "dev-local-esy-secret-encryption-key-override-in-prod";

    private static final int IV_BYTES = 12;       // GCM standard nonce length
    private static final int TAG_BITS = 128;
    private static final String TRANSFORM = "AES/GCM/NoPadding";

    private final SecretKeySpec key;
    /**
     * The public keys (the dev default, and the empty key docker-compose ends
     * up with), kept only to read secrets written before a real key was set.
     */
    private final java.util.List<SecretKeySpec> legacyKeys;
    private final boolean usingDefaultKey;
    private final SecureRandom random = new SecureRandom();

    public SecretCipher(@Value("${app.secret.enc-key:" + DEV_DEFAULT_KEY + "}") String configuredKey) {
        String configured = configuredKey == null ? "" : configuredKey;
        this.usingDefaultKey = configured.isBlank() || DEV_DEFAULT_KEY.equals(configured);
        this.key = derive(configured);
        this.legacyKeys = usingDefaultKey ? java.util.List.of()
            : java.util.List.of(derive(DEV_DEFAULT_KEY), derive(""));
    }

    private static SecretKeySpec derive(String material) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(material.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(digest, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Cannot initialize secret cipher", e);
        }
    }

    /** Whether a public key (the published default, or none at all) is the one in use. */
    public boolean usingDefaultKey() {
        return usingDefaultKey;
    }

    /** plaintext -> base64(iv ‖ ciphertext). null/blank passes through unchanged. */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) return plaintext;
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[iv.length + ct.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(ct, 0, out, iv.length, ct.length);
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    /** base64(iv ‖ ciphertext) -> plaintext. null/blank passes through unchanged. */
    public String decrypt(String stored) {
        if (stored == null || stored.isEmpty()) return stored;
        try {
            return decryptWith(key, stored);
        } catch (Exception current) {
            for (SecretKeySpec legacy : legacyKeys) {
                try {
                    return decryptWith(legacy, stored);
                } catch (Exception ignored) {
                    // try the next, then report the original failure
                }
            }
            throw new IllegalStateException("Decryption failed — has app.secret.enc-key changed?", current);
        }
    }

    /** True when {@code stored} only opens with the published default key and should be re-encrypted. */
    public boolean isUnderDefaultKey(String stored) {
        if (legacyKeys.isEmpty() || stored == null || stored.isEmpty()) return false;
        try {
            decryptWith(key, stored);
            return false;
        } catch (Exception notCurrent) {
            for (SecretKeySpec legacy : legacyKeys) {
                try {
                    decryptWith(legacy, stored);
                    return true;
                } catch (Exception notThisOne) {
                    // keep looking
                }
            }
            return false;
        }
    }

    private static String decryptWith(SecretKeySpec k, String stored) throws Exception {
        byte[] all = Base64.getDecoder().decode(stored);
        byte[] iv = new byte[IV_BYTES];
        System.arraycopy(all, 0, iv, 0, IV_BYTES);
        Cipher cipher = Cipher.getInstance(TRANSFORM);
        cipher.init(Cipher.DECRYPT_MODE, k, new GCMParameterSpec(TAG_BITS, iv));
        byte[] pt = cipher.doFinal(all, IV_BYTES, all.length - IV_BYTES);
        return new String(pt, StandardCharsets.UTF_8);
    }
}
