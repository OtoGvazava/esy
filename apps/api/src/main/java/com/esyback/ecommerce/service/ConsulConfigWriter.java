package com.esyback.ecommerce.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Writes runtime-config values into Consul's KV store (the admin settings UI is
 * the writer; the app reads back via Spring Cloud Consul Config). After a write,
 * Consul's config <em>watch</em> raises a RefreshEvent on every instance, so the
 * {@code @ConfigurationProperties} beans rebind within ~1s — no redeploy.
 *
 * <p>Connection is read from the same {@code spring.cloud.consul.*} settings the
 * read path uses; the ACL token must have <b>write</b> on the {@code config/}
 * prefix. When Consul is disabled the writer refuses (the admin UI surfaces it).
 */
@Service
@Slf4j
public class ConsulConfigWriter {

    @Value("${spring.cloud.consul.enabled:false}")
    private boolean enabled;
    @Value("${spring.cloud.consul.host:localhost}")
    private String host;
    @Value("${spring.cloud.consul.port:8500}")
    private int port;
    @Value("${spring.cloud.consul.scheme:http}")
    private String scheme;
    @Value("${spring.cloud.consul.token:}")
    private String token;

    // Mirrors spring.cloud.consul.config {prefix: config, default-context: ecommerce-platform}.
    private static final String PREFIX = "config/ecommerce-platform/";

    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    public boolean isEnabled() {
        return enabled;
    }

    /** PUT a single key/value into Consul KV under the config context. */
    public void put(String key, String value) {
        if (!enabled) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Consul config store isn't connected (set CONSUL_ENABLED=true + SPRING_CONFIG_IMPORT)");
        }
        try {
            HttpRequest.Builder b = HttpRequest.newBuilder(
                    URI.create(scheme + "://" + host + ":" + port + "/v1/kv/" + PREFIX + key))
                .timeout(Duration.ofSeconds(15))
                .PUT(HttpRequest.BodyPublishers.ofString(value == null ? "" : value, StandardCharsets.UTF_8));
            if (token != null && !token.isBlank()) {
                b.header("X-Consul-Token", token);
            }
            HttpResponse<String> res = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
            // Consul KV PUT returns the literal "true" on success.
            if (res.statusCode() / 100 != 2 || !"true".equals(res.body().trim())) {
                log.warn("Consul KV put {} -> {} : {}", key, res.statusCode(), res.body());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Consul rejected the config write (" + res.statusCode() + ")");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Consul KV write error", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach Consul");
        }
    }
}
