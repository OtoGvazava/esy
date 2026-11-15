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
 * controller-mapped).
 *
 * <p><b>Admins only</b> (SecurityConfig), the page and the spec both. The page
 * runs a third-party script on the session origin, where it could act with the
 * visitor's cookie, so that script is pinned to one version and checked
 * against its hash (SRI): a changed file is refused by the browser rather than
 * run. Updating Scalar means changing the version and the hash together — the
 * hash is the sha384 of {@code dist/browser/standalone.js} at that version.
 */
@RestController
public class ScalarDocsController {

    static final String SCALAR_URL =
        "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.4/dist/browser/standalone.js";
    static final String SCALAR_SRI =
        "sha384-hwB9WroDTpZaI38gr+u9CXA6ksz5gUYgD2GxXazKl/agT1L2GWUiRFWGJYNiFu4Q";

    private static final String PAGE = """
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="referrer" content="no-referrer" />
          <title>esy API · Scalar</title>
          <style>body{margin:0}</style>
        </head>
        <body>
          <script id="api-reference" data-url="/v3/api-docs"></script>
          <script src="%s" integrity="%s" crossorigin="anonymous"></script>
        </body>
        </html>
        """.formatted(SCALAR_URL, SCALAR_SRI);

    @GetMapping(value = {"/docs", "/swagger"}, produces = MediaType.TEXT_HTML_VALUE)
    public String scalar() {
        return PAGE;
    }
}
