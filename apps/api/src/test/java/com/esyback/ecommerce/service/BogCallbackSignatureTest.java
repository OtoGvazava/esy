package com.esyback.ecommerce.service;

import com.esyback.ecommerce.config.BogProperties;
import com.esyback.ecommerce.security.SecretCipher;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The BOG callback is public and settles orders, so it must fail CLOSED:
 * with no public key configured nothing is trusted (review finding H7).
 */
class BogCallbackSignatureTest {

    private static final byte[] BODY =
            "{\"body\":{\"external_order_id\":\"ESY-1\",\"order_status\":{\"key\":\"completed\"}}}"
                    .getBytes(StandardCharsets.UTF_8);

    private static BogPaymentService serviceWithKey(String pem) {
        BogProperties props = mock(BogProperties.class);
        when(props.getPublicKey()).thenReturn(pem);
        return new BogPaymentService(mock(SecretCipher.class), new ObjectMapper(), props);
    }

    private static String sign(KeyPair kp, byte[] body) throws Exception {
        Signature s = Signature.getInstance("SHA256withRSA");
        s.initSign(kp.getPrivate());
        s.update(body);
        return Base64.getEncoder().encodeToString(s.sign());
    }

    private static KeyPair keyPair() throws Exception {
        KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");
        g.initialize(2048);
        return g.generateKeyPair();
    }

    private static String pem(KeyPair kp) {
        return "-----BEGIN PUBLIC KEY-----\n"
                + Base64.getMimeEncoder().encodeToString(kp.getPublic().getEncoded())
                + "\n-----END PUBLIC KEY-----";
    }

    @Test
    @DisplayName("no public key configured: every callback is refused, signed or not")
    void blankKeyFailsClosed() throws Exception {
        assertFalse(serviceWithKey("").verifyCallbackSignature(BODY, null));
        assertFalse(serviceWithKey(null).verifyCallbackSignature(BODY, sign(keyPair(), BODY)));
    }

    @Test
    @DisplayName("with a key: only a signature over this exact body passes")
    void keyChecksSignature() throws Exception {
        KeyPair kp = keyPair();
        BogPaymentService svc = serviceWithKey(pem(kp));
        assertTrue(svc.verifyCallbackSignature(BODY, sign(kp, BODY)));
        assertFalse(svc.verifyCallbackSignature(BODY, null));
        assertFalse(svc.verifyCallbackSignature(BODY, sign(keyPair(), BODY)));
        byte[] other = "{\"body\":{}}".getBytes(StandardCharsets.UTF_8);
        assertFalse(svc.verifyCallbackSignature(other, sign(kp, BODY)));
    }
}
