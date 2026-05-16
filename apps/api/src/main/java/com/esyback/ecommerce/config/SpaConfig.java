package com.esyback.ecommerce.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Serves the bundled React build (classpath:/static, populated by the Docker
 * build) and falls back to index.html for client-side routes so the SPA's
 * deep links (/cart, /product/:id, …) work. API paths are left untouched.
 */
@Configuration
public class SpaConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(true)
            .addResolver(new PathResourceResolver() {
                @Override
                protected Resource getResource(String resourcePath, Resource location) throws IOException {
                    Resource requested = location.createRelative(resourcePath);
                    if (requested.exists() && requested.isReadable()) {
                        return requested; // real static asset (index.html, /assets/*, …)
                    }
                    if (resourcePath.startsWith("api/")) {
                        return null; // let controllers handle the API
                    }
                    return new ClassPathResource("/static/index.html"); // SPA fallback
                }
            });
    }
}
