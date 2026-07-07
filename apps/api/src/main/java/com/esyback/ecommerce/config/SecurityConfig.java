package com.esyback.ecommerce.config;

import com.esyback.ecommerce.security.HttpCookieOAuth2AuthorizationRequestRepository;
import com.esyback.ecommerce.security.JwtAuthenticationFilter;
import com.esyback.ecommerce.security.OAuth2AuthenticationSuccessHandler;
import com.esyback.ecommerce.security.OAuthCanonicalHostRedirectFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // makes @PreAuthorize on controllers (e.g. admin product CRUD) actually enforced
@RequiredArgsConstructor
public class SecurityConfig {
    
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final OAuth2AuthenticationSuccessHandler oauth2SuccessHandler;
    private final HttpCookieOAuth2AuthorizationRequestRepository cookieAuthorizationRequestRepository;
    private final OAuthCanonicalHostRedirectFilter oauthCanonicalHostRedirectFilter;

    @Value("${app.oauth2.redirect-base:}")
    private String redirectBase;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/products/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/tenant/**").permitAll()
                // BOG's async webhook is server-to-server (no JWT cookie); it
                // is authenticated by its RSA Callback-Signature, not Spring.
                // Explicit so it survives a future anyRequest() tighten.
                .requestMatchers("/api/payments/bog/callback").permitAll()
                .requestMatchers("/login/oauth2/**").permitAll()
                .requestMatchers("/oauth2/**").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/error").permitAll()
                // Actuator: health is public (Render health checks); refresh is
                // a state-changing POST that re-binds live config, so ADMIN only.
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/actuator/refresh").hasRole("ADMIN")
                // The SPA + storefront are public; admin product mutations are
                // still locked down by @PreAuthorize("hasRole('ADMIN')")
                // (@EnableMethodSecurity), so static assets / client routes /
                // public GET APIs can all be open.
                .anyRequest().permitAll()
            )
            .oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(ae -> ae
                    .authorizationRequestRepository(cookieAuthorizationRequestRepository))
                .successHandler(oauth2SuccessHandler)
                .failureHandler((req, res, ex) ->
                    res.sendRedirect(redirectBase + "/signin?error=oauth"))
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            // Bounce OAuth starts to the canonical host before Spring builds
            // the authorization request (so redirect_uri matches Google).
            .addFilterBefore(oauthCanonicalHostRedirectFilter, OAuth2AuthorizationRequestRedirectFilter.class)
            .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.disable())); // For H2 console
        
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "https://*.esy.ge",
            "https://esy.ge",
            "http://localhost:*",
            "http://127.0.0.1:*",
            "http://*.localhost:*",  // local wildcard subdomains
            "http://lvh.me:*",
            "http://*.lvh.me:*"   // local lvh.me dev domain
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
