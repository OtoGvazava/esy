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

    /** {@link #source} values. */
    public static final String SOURCE_OVERRIDE = "override";
    public static final String SOURCE_ENV = "env";

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

    /**
     * Where a key's effective value comes from: {@code "override"} when an
     * admin wrote it into this store, {@code "env"} when it is the environment
     * (or application.yml) value. The admin screens draw one chip per value
     * from this, because an override can vanish when the free Key Value
     * instance restarts, and the person reading the screen has to know which
     * values would survive that.
     *
     * <p>With Redis unreachable nothing is overridden — which is the truth at
     * that moment: every value in effect is the environment's.
     */
    public String source(String key) {
        String v = cachedRedisGet(key);
        return v != null && !v.isEmpty() ? SOURCE_OVERRIDE : SOURCE_ENV;
    }

    /**
     * The environment's value for a key, ignoring any override: what the key
     * falls back to if the override is cleared or lost. Null when neither the
     * environment nor application.yml names it. Only for non-secret keys —
     * callers must never pass an API key or password here.
     */
    public String envValue(String key) {
        return env.getProperty(key);
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
