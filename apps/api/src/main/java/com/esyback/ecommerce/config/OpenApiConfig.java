package com.esyback.ecommerce.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI esyOpenAPI() {
        return new OpenAPI().info(new Info()
            .title("esy API")
            .version("0.0.1")
            .description("Multi-tenant storefront + platform API (products, auth, tenants).")
            .license(new License().name("Proprietary")));
    }
}
