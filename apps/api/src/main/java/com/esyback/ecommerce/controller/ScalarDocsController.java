package com.esyback.ecommerce.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves the Scalar API reference UI for the springdoc-generated OpenAPI spec.
 *
 * A controller mapping (not a static file) on purpose: SpaConfig registers a
 * greedy /** resource handler that falls back to index.html, and controller
 * mappings take precedence over it — so /docs and /swagger always reach Scalar
 * instead of the SPA. The spec itself is at /v3/api-docs (springdoc, also
 * controller-mapped). Scalar's script is loaded from a CDN at view time.
 */
@RestController
public class ScalarDocsController {

    private static final String PAGE = """
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>esy API · Scalar</title>
          <style>body{margin:0}</style>
        </head>
        <body>
          <script id="api-reference" data-url="/v3/api-docs"></script>
          <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
        </body>
        </html>
        """;

    @GetMapping(value = {"/docs", "/swagger"}, produces = MediaType.TEXT_HTML_VALUE)
    public String scalar() {
        return PAGE;
    }
}
