package com.esyback.ecommerce.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** The claims and origin the success handler hands to the account rules. */
class SignInRedirectTest {

    @Test
    @DisplayName("the store a sign-in started on is read from its tenant origin")
    void storeFromOrigin() {
        assertThat(OAuth2AuthenticationSuccessHandler.storeSubdomain("https://studio-form.esy.ge")).isEqualTo("studio-form");
        assertThat(OAuth2AuthenticationSuccessHandler.storeSubdomain("http://studio-form.lvh.me:8092")).isEqualTo("studio-form");
        assertThat(OAuth2AuthenticationSuccessHandler.storeSubdomain("https://esy.ge")).isNull();
        assertThat(OAuth2AuthenticationSuccessHandler.storeSubdomain("https://www.esy.ge")).isNull();
        assertThat(OAuth2AuthenticationSuccessHandler.storeSubdomain(null)).isNull();
    }

    @Test
    @DisplayName("email_verified is read as a boolean or a string, and absent is null")
    void emailVerified() {
        assertThat(OAuth2AuthenticationSuccessHandler.emailVerified(true)).isTrue();
        assertThat(OAuth2AuthenticationSuccessHandler.emailVerified("true")).isTrue();
        assertThat(OAuth2AuthenticationSuccessHandler.emailVerified(false)).isFalse();
        assertThat(OAuth2AuthenticationSuccessHandler.emailVerified(null)).isNull();
    }
}
