package com.esyback.ecommerce.config;

import com.esyback.ecommerce.service.ContactChannelService;
import com.esyback.ecommerce.service.ProductService;
import com.esyback.ecommerce.service.TenantViewService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

/**
 * The SPA's index.html with the current store inlined into it.
 *
 * The browser used to paint a store in esy's default theme, then fetch
 * {@code /api/tenant/current} and switch to the store's own: a visible flash of
 * the wrong colours and name on every first load. The page now carries that
 * same body (TenantViewService) as JSON, where its pre-paint script reads it
 * before anything is drawn, and the app seeds its cache from it instead of
 * asking again. A storefront's page also carries the two lists its first frame
 * draws around the products — the category pills and the bar's contact
 * buttons — which otherwise arrive a moment later and push the page about.
 * Each is exactly what its own public endpoint answers.
 *
 * Written per request, since the store is resolved from the request's Host
 * (and the back office's ?tenant=), and never cached by validators: a page
 * revalidated to 304 would bring back yesterday's colours.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SpaIndex {

    /** Where the page wants the store; index.html carries it in its head. */
    static final String MARK = "<!--esy:boot-->";

    private final TenantViewService tenantView;
    private final ProductService productService;
    private final ContactChannelService contactChannelService;
    private final ObjectMapper objectMapper;

    private volatile String template;

    /** The page for this request, or null when the build has no index.html. */
    public Resource page() throws IOException {
        String html = template();
        if (html == null) return null;
        String json = null;
        try {
            json = objectMapper.writeValueAsString(boot());
        } catch (RuntimeException | IOException e) {
            // No store to inline: the app asks /api/tenant/current itself, as before.
            log.debug("index.html without the store: {}", e.toString());
        }
        return new Page(inject(html, json).getBytes(StandardCharsets.UTF_8));
    }

    /** { tenant, categories?, contacts? }: what the page's first frame is drawn from. */
    private Map<String, Object> boot() {
        Map<String, Object> boot = new LinkedHashMap<>();
        Map<String, Object> tenant = tenantView.current();
        boot.put("tenant", tenant);
        boolean storefront = Boolean.FALSE.equals(tenant.get("isPlatform"))
            && !Boolean.TRUE.equals(tenant.get("suspended"));
        if (storefront) {
            // Either can be left out: the app then reads it from its endpoint.
            optional(boot, "categories", productService::getCategories);
            optional(boot, "contacts", contactChannelService::listPublic);
        }
        return boot;
    }

    private static void optional(Map<String, Object> boot, String key, Supplier<?> read) {
        try {
            boot.put(key, read.get());
        } catch (RuntimeException e) {
            log.debug("index.html without {}: {}", key, e.toString());
        }
    }

    /**
     * {@code html} with the store's JSON in place of the mark, inside a script
     * the browser never runs (type application/json). Every character that
     * could end that script or open a comment is escaped, so nothing in a
     * store's name or description can break out of it into the page.
     */
    static String inject(String html, String json) {
        int at = html.indexOf(MARK);
        if (at < 0) return html;
        String boot = json == null ? ""
            : "<script id=\"esy-boot\" type=\"application/json\">" + escape(json) + "</script>";
        return html.substring(0, at) + boot + html.substring(at + MARK.length());
    }

    /** JSON safe inside a script element: still the same JSON once parsed. */
    static String escape(String json) {
        StringBuilder out = new StringBuilder(json.length() + 16);
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            switch (c) {
                case '<' -> out.append("\\u003c");
                case '>' -> out.append("\\u003e");
                case '&' -> out.append("\\u0026");
                case ' ' -> out.append("\\u2028");
                case ' ' -> out.append("\\u2029");
                default -> out.append(c);
            }
        }
        return out.toString();
    }

    private String template() throws IOException {
        String t = template;
        if (t != null) return t;
        ClassPathResource file = new ClassPathResource("/static/index.html");
        if (!file.exists()) return null;
        try (InputStream in = file.getInputStream()) {
            t = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        template = t;
        return t;
    }

    /**
     * The written page. Named index.html so it is served as text/html, and with
     * no last-modified time, so it is never answered with a 304.
     */
    private static final class Page extends ByteArrayResource {
        Page(byte[] bytes) {
            super(bytes, "index.html (with the current store)");
        }

        @Override
        public String getFilename() {
            return "index.html";
        }

        @Override
        public long lastModified() {
            return -1;
        }
    }
}
