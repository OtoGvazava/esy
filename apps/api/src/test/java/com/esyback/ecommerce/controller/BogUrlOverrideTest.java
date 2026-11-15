package com.esyback.ecommerce.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The BOG host overrides may only point at BOG itself (review M26): every
 * merchant's decrypted secret is POSTed to the auth URL.
 */
class BogUrlOverrideTest {

    @Test
    @DisplayName("blank and https bog.ge hosts are accepted")
    void bogHostsPass() {
        assertThat(AdminConfigController.validBogUrlOrBlank("  ")).isEmpty();
        for (String ok : List.of(
                "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token",
                "https://api-sandbox.bog.ge", "https://bog.ge/x")) {
            assertThat(AdminConfigController.validBogUrlOrBlank(ok)).isEqualTo(ok);
        }
    }

    @Test
    @DisplayName("other hosts, plain http and look-alike hosts are refused")
    void othersRefused() {
        for (String bad : List.of(
                "https://evil.example/token", "http://api.bog.ge", "https://bog.ge.evil.example",
                "https://notbog.ge", "https://api.bog.ge@evil.example", "ftp://api.bog.ge", "not a url")) {
            assertThatThrownBy(() -> AdminConfigController.validBogUrlOrBlank(bad))
                .as(bad).isInstanceOf(ResponseStatusException.class);
        }
    }
}
