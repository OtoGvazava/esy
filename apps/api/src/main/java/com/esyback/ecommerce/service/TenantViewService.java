package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.web.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
        Tenant tenant = tenantContextService.getCurrentTenant();
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
}
