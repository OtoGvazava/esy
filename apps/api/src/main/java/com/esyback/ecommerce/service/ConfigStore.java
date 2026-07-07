package com.esyback.ecommerce.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Live config store backed by Redis/Valkey (Render Key Value). The admin UI
 * writes overrides here; the config beans ({@code BogProperties}, etc.) read
 * through it at call time, so a change applies within the short cache TTL — no
 * redeploy.
 *
 * <p>Resolution order for any key: <b>Redis override → env/application.yml →
 * hard default</b>. So the existing env vars (BOG_ENV, PLATFORM_SERVICE_FEE_RATE,
 * …) still work as the baseline, and Redis just overlays them. If Redis is
 * unreachable the store degrades to env/default (and the admin badge shows it),
 * so the app never depends on Redis being up. Note: the Render free Key Value
 * tier is non-persistent, so overrides reset on its restart and fall back to env.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ConfigStore {

    private final StringRedisTemplate redis;
    private final Environment env;

    private static final String PREFIX = "config:";
    private static final long TTL_MS = 8000;

    private record Cached(String value, long expiresAt) {}

    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    /** Effective value: Redis override (cached) → env/yaml → {@code def}. */
    public String get(String key, String def) {
        String redisVal = cachedRedisGet(key);
        if (redisVal != null && !redisVal.isEmpty()) {
            return redisVal;
        }
        String envVal = env.getProperty(key);
        return envVal != null ? envVal : def;
    }

    private String cachedRedisGet(String key) {
        long now = System.currentTimeMillis();
        Cached c = cache.get(key);
        if (c != null && now < c.expiresAt()) {
            return c.value();
        }
        String v = null;
        try {
            v = redis.opsForValue().get(PREFIX + key);
        } catch (Exception e) {
            log.debug("Redis config read failed for {} ({}) — using env fallback", key, e.getMessage());
        }
        cache.put(key, new Cached(v, now + TTL_MS));
        return v;
    }

    /** Write an override. Blank/null clears it (falls back to env/default). */
    public void set(String key, String value) {
        try {
            if (value == null || value.isEmpty()) {
                redis.delete(PREFIX + key);
            } else {
                redis.opsForValue().set(PREFIX + key, value);
            }
            cache.remove(key);
        } catch (Exception e) {
            log.error("Redis config write failed for {}", key, e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Config store (Key Value) isn't reachable — write failed");
        }
    }

    /** True when Redis is reachable (drives the admin UI 'store ready' badge). */
    public boolean ready() {
        try {
            redis.hasKey(PREFIX + "__ping__");
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
