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
        m.put("isActive", t.getIsActive());
        return m;
    }
}
