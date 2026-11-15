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

    /** {@code read}: the value came from an answer by Redis, not from a failed call. */
    private record Cached(String value, long expiresAt, boolean read) {}

    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    /** The clock the cache reads; replaceable in tests. */
    java.util.function.LongSupplier clock = System::currentTimeMillis;

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
        long now = clock.getAsLong();
        Cached c = cache.get(key);
        if (c != null && now < c.expiresAt()) {
            return c.value();
        }
        String v;
        try {
            v = redis.opsForValue().get(PREFIX + key);
        } catch (Exception e) {
            if (c != null && c.read()) {
                // A blip, not an absent store: keep serving what Redis last
                // said. Caching the failure as "no override" used to drop the
                // fee rate, the SMS switch or the BOG environment back to the
                // env values for a whole TTL, and orders froze the wrong fee.
                log.warn("Redis config read failed for {} ({}) — keeping the last value read", key, e.getMessage());
                cache.put(key, new Cached(c.value(), now + TTL_MS, true));
                return c.value();
            }
            // Never read: the store is absent or has been down since startup,
            // so the environment is the truth (see the class note).
            log.debug("Redis config read failed for {} ({}) — using env fallback", key, e.getMessage());
            cache.put(key, new Cached(null, now + TTL_MS, false));
            return null;
        }
        cache.put(key, new Cached(v, now + TTL_MS, true));
        return v;
    }

    // Writes collected by inOneWrite on this thread, committed together.
    private final ThreadLocal<java.util.LinkedHashMap<String, String>> batch = new ThreadLocal<>();

    /**
     * Runs {@code writes} and commits every {@link #set} made inside it as ONE
     * Redis transaction (MULTI/EXEC): all of them land, or none. An admin save
     * of several settings used to write them one by one, so a Redis blip
     * half-way left some live while the screen said the save had failed.
     */
    public void inOneWrite(Runnable writes) {
        java.util.LinkedHashMap<String, String> pending = new java.util.LinkedHashMap<>();
        batch.set(pending);
        try {
            writes.run();
        } finally {
            batch.remove();
        }
        if (pending.isEmpty()) return;
        try {
            redis.execute(new org.springframework.data.redis.core.SessionCallback<java.util.List<Object>>() {
                @Override
                @SuppressWarnings("unchecked")
                public <K, V> java.util.List<Object> execute(org.springframework.data.redis.core.RedisOperations<K, V> ops) {
                    org.springframework.data.redis.core.RedisOperations<String, String> o =
                        (org.springframework.data.redis.core.RedisOperations<String, String>) ops;
                    o.multi();
                    pending.forEach((key, value) -> {
                        if (value == null || value.isEmpty()) o.delete(PREFIX + key);
                        else o.opsForValue().set(PREFIX + key, value);
                    });
                    return o.exec();
                }
            });
        } catch (Exception e) {
            log.error("Redis config write failed for {}", pending.keySet(), e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Config store (Key Value) isn't reachable — write failed");
        }
        long until = clock.getAsLong() + TTL_MS;
        pending.forEach((key, value) -> cache.put(key,
            new Cached(value == null || value.isEmpty() ? null : value, until, true)));
    }

    /** Write an override. Blank/null clears it (falls back to env/default). */
    public void set(String key, String value) {
        java.util.LinkedHashMap<String, String> collecting = batch.get();
        if (collecting != null) {
            collecting.put(key, value);
            return;
        }
        try {
            if (value == null || value.isEmpty()) {
                redis.delete(PREFIX + key);
            } else {
                redis.opsForValue().set(PREFIX + key, value);
            }
            // What was just written is what Redis holds now: cache it as read,
            // so a blip right after a save keeps the new value too.
            cache.put(key, new Cached(value == null || value.isEmpty() ? null : value,
                clock.getAsLong() + TTL_MS, true));
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
