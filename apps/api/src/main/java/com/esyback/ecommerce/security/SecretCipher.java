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
 * default lets local runs work without configuration; it MUST be overridden in
 * production (rotating it makes existing encrypted secrets undecryptable, so
 * stores would just need to re-enter their BOG credentials).
 */
@Component
public class SecretCipher {

    private static final int IV_BYTES = 12;       // GCM standard nonce length
    private static final int TAG_BITS = 128;
    private static final String TRANSFORM = "AES/GCM/NoPadding";

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public SecretCipher(@Value("${app.secret.enc-key:dev-local-esy-secret-encryption-key-override-in-prod}")
                        String configuredKey) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(configuredKey.getBytes(StandardCharsets.UTF_8));
            this.key = new SecretKeySpec(digest, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Cannot initialize secret cipher", e);
        }
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
            byte[] all = Base64.getDecoder().decode(stored);
            byte[] iv = new byte[IV_BYTES];
            System.arraycopy(all, 0, iv, 0, IV_BYTES);
            Cipher cipher = Cipher.getInstance(TRANSFORM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] pt = cipher.doFinal(all, IV_BYTES, all.length - IV_BYTES);
            return new String(pt, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Decryption failed — has app.secret.enc-key changed?", e);
        }
    }
}
