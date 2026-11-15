package com.esyback.ecommerce.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Serves the bundled React build (classpath:/static, populated by the Docker
 * build) and falls back to index.html for client-side routes so the SPA's
 * deep links (/cart, /product/:id, …) work. API paths are left untouched.
 *
 * index.html itself is written per request with the current store inlined
 * (SpaIndex), so the resource chain is not cached: its cache is keyed by path
 * alone and would serve the first store's page to every other.
 */
@Configuration
@RequiredArgsConstructor
public class SpaConfig implements WebMvcConfigurer {

    private final SpaIndex spaIndex;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(false)
            .addResolver(new PathResourceResolver() {
                @Override
                protected Resource getResource(String resourcePath, Resource location) throws IOException {
                    if (resourcePath.startsWith("api/")) {
                        return null; // let controllers handle the API
                    }
                    if (!resourcePath.isEmpty() && !"index.html".equals(resourcePath)) {
                        Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) {
                            return requested; // real static asset (/assets/*, …)
                        }
                        // A file that is not there is a 404, not the page:
                        // a stale chunk then fails as missing rather than as
                        // HTML served for a script, and a scanner's probe for
                        // /wp-login.php costs no database reads.
                        if (isFileRequest(resourcePath)) return null;
                    }
                    return spaIndex.page(); // the page, for "/", index.html and every SPA route
                }
            });
    }

    /**
     * True for a path that asks for a file rather than a screen: anything
     * under assets/, or whose last segment has an extension. No SPA route
     * has a dot in its last segment.
     */
    static boolean isFileRequest(String resourcePath) {
        if (resourcePath.startsWith("assets/")) return true;
        String last = resourcePath.substring(resourcePath.lastIndexOf('/') + 1);
        return last.lastIndexOf('.') > 0 || last.startsWith(".");
    }
}
