package com.esyback.ecommerce.web;

import com.esyback.ecommerce.entity.Tenant;

import java.util.HashMap;
import java.util.Map;

/** Null-safe Tenant → JSON shape, shared by the tenant + account endpoints. */
public final class TenantMapper {

    private TenantMapper() {}

    public static Map<String, Object> toMap(Tenant t) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", t.getId());
        m.put("name", t.getName());
        m.put("subdomain", t.getSubdomain());
        m.put("displayName", t.getDisplayName());
        m.put("description", t.getDescription());
        m.put("logoUrl", t.getLogoUrl());
        m.put("category", t.getCategory());
        m.put("primaryColor", t.getPrimaryColor());
        m.put("secondaryColor", t.getSecondaryColor());
        m.put("addressStreet", t.getAddressStreet());
        m.put("addressCity", t.getAddressCity());
        m.put("addressCountry", t.getAddressCountry());
        m.put("addressPostalCode", t.getAddressPostalCode());
        m.put("establishedYear", t.getEstablishedYear());
        m.put("isActive", t.getIsActive());
        // Only whether BOG is wired up — never the id/secret. The storefront
        // uses this to decide redirect-checkout vs the free-order fallback;
        // Store Settings uses it to show a "Connected" badge.
        m.put("bogConfigured",
            t.getBogClientId() != null && !t.getBogClientId().isBlank()
                && t.getBogClientSecret() != null && !t.getBogClientSecret().isBlank());
        return m;
    }
}
