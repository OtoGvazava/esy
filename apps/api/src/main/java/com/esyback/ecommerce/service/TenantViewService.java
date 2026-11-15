package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.web.ApiRefusal;
import com.esyback.ecommerce.web.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The current store as the storefront reads it: the body of
 * {@code GET /api/tenant/current}, and the same body inlined into the page
 * itself ({@code config.SpaIndex}) so a store's first paint is already its
 * own. One builder, so the two can never disagree.
 */
@Service
@RequiredArgsConstructor
public class TenantViewService {

    private final TenantContextService tenantContextService;
    private final TenantDesignService tenantDesignService;
    private final TenantCoverService tenantCoverService;

    public Map<String, Object> current() {
        Tenant tenant;
        try {
            tenant = tenantContextService.getCurrentTenant();
        } catch (ApiRefusal e) {
            // A storefront address naming no store: the page says so (the
            // closed-store screen, worded for a missing store) rather than
            // drawing the default store, or failing to draw at all. The back
            // office keeps the 404: its ?tenant= named a store it cannot have.
            if (!TenantContextService.STORE_NOT_FOUND.equals(e.getCode())
                || tenantContextService.isManagerHost()) {
                throw e;
            }
            return missing(tenantContextService.getCurrentSubdomain());
        }
        Map<String, Object> body = TenantMapper.toMap(tenant);
        body.put("isPlatform", tenantContextService.isPlatformHost());
        // The design switch rides every response, the platform host's too:
        // registration reads it there to choose quick setup or today's brand
        // step. Read once, so `design` and `designEnabled` cannot disagree.
        boolean designOn = tenantDesignService.isEnabled();
        body.put("designEnabled", designOn);
        // The published design, colours merged in from primaryColor /
        // secondaryColor. Null when nothing is published or the switch is off,
        // and the storefront then draws today's chrome. Never the draft.
        body.put("design", designOn ? tenantDesignService.published(tenant) : null);
        // The cover header's photo, or null; an id-only lookup, never the bytes.
        body.put("coverUrl", tenantCoverService.currentCoverUrl(tenant));
        return body;
    }

    /**
     * The body for a store address with no store behind it: closed to
     * shoppers like a suspended store, so the storefront draws its closed
     * screen and none of its shop, with {@code missing} to word it.
     */
    private Map<String, Object> missing(String subdomain) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", null);
        body.put("subdomain", subdomain);
        body.put("isActive", false);
        body.put("suspended", true);
        body.put("missing", true);
        body.put("isPlatform", false);
        body.put("designEnabled", tenantDesignService.isEnabled());
        body.put("design", null);
        body.put("coverUrl", null);
        return body;
    }
}
