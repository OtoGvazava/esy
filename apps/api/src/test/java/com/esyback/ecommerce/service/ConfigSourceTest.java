package com.esyback.ecommerce.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Where a live config value comes from. The admin config and integrations
 * screens draw a chip per value from {@link ConfigStore#source}: an override
 * written from the screen lives in the free Key Value store and is lost when
 * it restarts, so the person reading the screen has to know which values would
 * fall back — and to what ({@link ConfigStore#envValue}).
 *
 * <p>Plain unit test: Redis is a mock, the environment a MockEnvironment.
 */
class ConfigSourceTest {

    @SuppressWarnings("unchecked")
    private static ConfigStore store(String overrideKey, String overrideValue, MockEnvironment env) {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        when(ops.get(anyString())).thenReturn(null);
        if (overrideKey != null) when(ops.get("config:" + overrideKey)).thenReturn(overrideValue);
        return new ConfigStore(redis, env);
    }

    @Test
    @DisplayName("a value written here is an override; the environment's value is still reported underneath")
    void override() {
        MockEnvironment env = new MockEnvironment().withProperty("app.bog.env", "sandbox");
        ConfigStore store = store("app.bog.env", "live", env);

        assertThat(store.source("app.bog.env")).isEqualTo(ConfigStore.SOURCE_OVERRIDE);
        assertThat(store.get("app.bog.env", "x")).isEqualTo("live");
        assertThat(store.envValue("app.bog.env")).isEqualTo("sandbox");
    }

    @Test
    @DisplayName("no override, or a blank one, means the environment's value is in effect")
    void environment() {
        MockEnvironment env = new MockEnvironment().withProperty("app.platform.service-fee-rate", "0.02");
        assertThat(store(null, null, env).source("app.platform.service-fee-rate"))
            .isEqualTo(ConfigStore.SOURCE_ENV);
        // set("") deletes the key; an empty string that somehow remains is not an override either.
        assertThat(store("app.platform.service-fee-rate", "", env).source("app.platform.service-fee-rate"))
            .isEqualTo(ConfigStore.SOURCE_ENV);
        assertThat(store(null, null, env).envValue("app.public-base-url")).isNull();
    }

    @Test
    @DisplayName("with the store unreachable nothing is overridden — every value in effect is the environment's")
    void storeDown() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("down"));
        ConfigStore store = new ConfigStore(redis, new MockEnvironment().withProperty("app.bog.env", "sandbox"));

        assertThat(store.source("app.bog.env")).isEqualTo(ConfigStore.SOURCE_ENV);
        assertThat(store.get("app.bog.env", "live")).isEqualTo("sandbox");
    }
}
