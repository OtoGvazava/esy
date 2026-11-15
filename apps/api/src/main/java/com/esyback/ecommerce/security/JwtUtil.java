package com.esyback.ecommerce.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {
    
    @Value("${jwt.secret}")
    private String secret;

    /**
     * A blank secret is refused at startup. It would sign every session with
     * a key derived from the empty string, which anyone can reproduce; the
     * compose file used to pass exactly that when JWT_SECRET was unset.
     */
    @jakarta.annotation.PostConstruct
    void requireSecret() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("jwt.secret (JWT_SECRET) must not be blank");
        }
    }
    
    @Value("${jwt.expiration}")
    private Long expiration;
    
    // Derived once: the secret does not change while the app runs, and the
    // filter needs the key on every authenticated request.
    private volatile SecretKey signingKey;
    // Immutable and thread-safe: built once, not on every request.
    private volatile JwtParser parser;

    private JwtParser parser() {
        JwtParser p = parser;
        if (p == null) {
            p = Jwts.parser().verifyWith(getSigningKey()).build();
            parser = p;
        }
        return p;
    }

    private SecretKey getSigningKey() {
        SecretKey k = signingKey;
        if (k != null) return k;
        // Derive a fixed 64-byte key from the configured secret so HS512 works
        // regardless of the secret's length (Render's generated JWT_SECRET, a
        // short dev value, etc. would otherwise trip Keys.hmacShaKeyFor).
        try {
            byte[] key = MessageDigest.getInstance("SHA-512")
                .digest(secret.getBytes(StandardCharsets.UTF_8));
            k = Keys.hmacShaKeyFor(key);
            signingKey = k;
            return k;
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-512 unavailable", e);
        }
    }

    /**
     * The token's subject after one signature check (which also refuses an
     * expired token), or null when the token is invalid or expired.
     */
    public String verifiedSubject(String token) {
        try {
            return extractAllClaims(token).getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
    
    public long getExpirationSeconds() {
        return expiration / 1000;
    }

    public String generateToken(Authentication authentication) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, userPrincipal.getUsername());
    }
    
    public String generateToken(String username) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, username);
    }
    
    private String createToken(Map<String, Object> claims, String subject) {
        // jjwt 0.12+ API; the same HS512 and the same derived key as before,
        // so sessions signed before the upgrade still validate.
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), Jwts.SIG.HS512)
                .compact();
    }
    
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    
    private Claims extractAllClaims(String token) {
        return parser().parseSignedClaims(token).getPayload();
    }
    
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    
    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
    
    public Boolean validateToken(String token) {
        return verifiedSubject(token) != null;
    }
}
