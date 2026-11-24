package com.esyback.ecommerce.security;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The Google registration in application.yml can load its user.
 *
 * <p>Spring Security 7 reads the userinfo endpoint on every Google sign-in
 * (6 skipped it, because Google's token scopes are URLs), and builds the user
 * from the answer with the registration's user-name-attribute. Pointed at
 * Google's older v2 endpoint, which answers with "id" and no "sub", every
 * callback threw "Attribute value for 'sub' cannot be null" and the browser
 * got a 500 page at /login/oauth2/code/google.
 *
 * <p>The stub answers each path the way Google's endpoint of that version
 * does, so the test fails if the configured path is one that has no "sub".
 */
@SpringBootTest
class GoogleUserInfoTest {

    private static final String SUBJECT = "108500000000000000001";

    @Autowired ClientRegistrationRepository registrations;

    @Test
    @DisplayName("the configured userinfo endpoint answers with the attribute the user is named by")
    void googleSignInLoadsItsUser() throws Exception {
        ClientRegistration google = registrations.findByRegistrationId("google");
        String path = URI.create(google.getProviderDetails().getUserInfoEndpoint().getUri()).getPath();

        HttpServer stub = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        stub.createContext("/oauth2/v2/userinfo", ex -> json(ex, """
            {"id":"%s","email":"shopper@example.com","verified_email":true,
             "given_name":"Nino","family_name":"Beridze","picture":"https://example.com/p.jpg"}"""
            .formatted(SUBJECT)));
        stub.createContext("/oauth2/v3/userinfo", ex -> json(ex, """
            {"sub":"%s","email":"shopper@example.com","email_verified":true,
             "given_name":"Nino","family_name":"Beridze","picture":"https://example.com/p.jpg"}"""
            .formatted(SUBJECT)));
        stub.start();
        try {
            ClientRegistration local = ClientRegistration.withClientRegistration(google)
                .userInfoUri("http://127.0.0.1:" + stub.getAddress().getPort() + path)
                .build();
            Instant now = Instant.now();
            // The scopes Google's token answer really carries.
            OAuth2AccessToken accessToken = new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER,
                "access-token", now, now.plusSeconds(60),
                Set.of("openid", "https://www.googleapis.com/auth/userinfo.email",
                    "https://www.googleapis.com/auth/userinfo.profile"));
            OidcIdToken idToken = new OidcIdToken("id-token", now, now.plusSeconds(60),
                Map.of("sub", SUBJECT, "iss", "https://accounts.google.com"));

            OidcUser user = new OidcUserService().loadUser(new OidcUserRequest(local, accessToken, idToken));

            assertThat(user.getName()).isEqualTo(SUBJECT);
            // What OAuth2AuthenticationSuccessHandler reads.
            assertThat(user.getAttributes())
                .containsEntry("sub", SUBJECT)
                .containsEntry("email", "shopper@example.com")
                .containsEntry("email_verified", true)
                .containsEntry("given_name", "Nino")
                .containsEntry("family_name", "Beridze");
        } finally {
            stub.stop(0);
        }
    }

    private static void json(HttpExchange exchange, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        try (var out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }
}
