package com.esyback.ecommerce.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    // Built once at startup: the secret does not change while the app runs,
    // and the filter verifies a token on every authenticated request.
    private SecretKey signingKey;
    private JwtParser parser;

    /**
     * A blank secret is refused at startup. It would sign every session with
     * a key derived from the empty string, which anyone can reproduce; the
     * compose file used to pass exactly that when JWT_SECRET was unset.
     */
    @jakarta.annotation.PostConstruct
    void init() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("jwt.secret (JWT_SECRET) must not be blank");
        }
        // Derive a fixed 64-byte key from the configured secret so HS512 works
        // regardless of the secret's length (Render's generated JWT_SECRET, a
        // short dev value, etc. would otherwise trip Keys.hmacShaKeyFor).
        try {
            byte[] key = MessageDigest.getInstance("SHA-512")
                .digest(secret.getBytes(StandardCharsets.UTF_8));
            signingKey = Keys.hmacShaKeyFor(key);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-512 unavailable", e);
        }
        parser = Jwts.parser().verifyWith(signingKey).build();
    }

    /**
     * The token's subject after one signature check (which also refuses an
     * expired token), or null when the token is invalid or expired.
     */
    public String verifiedSubject(String token) {
        try {
            return parser.parseSignedClaims(token).getPayload().getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public long getExpirationSeconds() {
        return expiration / 1000;
    }

    public String generateToken(String username) {
        // The same HS512 and the same derived key as before the jjwt 0.13
        // upgrade, so sessions signed earlier still validate.
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expiration))
                .signWith(signingKey, Jwts.SIG.HS512)
                .compact();
    }
}
