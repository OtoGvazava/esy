package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.security.PlatformHosts;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@Service
@RequiredArgsConstructor
public class TenantContextService {
    
    private final TenantRepository tenantRepository;
    
    private static final String DEFAULT_TENANT_SUBDOMAIN = "main";
    
    public Tenant getCurrentTenant() {
        String subdomain = getCurrentSubdomain();
        return tenantRepository.findBySubdomain(subdomain)
            .orElseGet(() -> tenantRepository.findBySubdomain(DEFAULT_TENANT_SUBDOMAIN)
                .orElseThrow(() -> new RuntimeException("Default tenant not found")));
    }
    
    public String getCurrentSubdomain() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return DEFAULT_TENANT_SUBDOMAIN;
        }

        HttpServletRequest request = attributes.getRequest();
        String host = request.getHeader("Host");
        if (host == null) {
            return DEFAULT_TENANT_SUBDOMAIN;
        }
        String h = host.split(":")[0].toLowerCase();

        // Administration is cross-store by definition and reads only the
        // /api/admin/** namespace, which names its target store explicitly.
        // It deliberately does NOT honour ?tenant: letting the admin host adopt
        // a store scope is exactly the "never mix platform and merchant scope
        // in one response" rule the split was built to keep (D6).
        if (PlatformHosts.isAdmin(h)) {
            return DEFAULT_TENANT_SUBDOMAIN;
        }

        // The back office serves every store from one host, so the Host header
        // cannot carry the store. The shell passes ?tenant=<sub> instead (the
        // same mechanism the bare-localhost dev fallback uses); @storeAccess
        // still checks membership against whatever resolves, so pointing the
        // param at someone else's store just yields 403s on management calls.
        if (PlatformHosts.isManager(h)) {
            String subdomain = request.getParameter("tenant");
            return subdomain != null ? subdomain : DEFAULT_TENANT_SUBDOMAIN;
        }

        // <sub>.<base domain> -> sub, for every domain esy serves. Returns null
        // for the apex, www and any platform surface.
        String storefront = PlatformHosts.storefrontSubdomain(h);
        if (storefront != null) {
            return storefront;
        }

        // Bare localhost / 127.0.0.1: ?tenant=<sub> dev fallback.
        if (h.equals("localhost") || h.equals("127.0.0.1")) {
            String subdomain = request.getParameter("tenant");
            return subdomain != null ? subdomain : DEFAULT_TENANT_SUBDOMAIN;
        }

        return DEFAULT_TENANT_SUBDOMAIN;
    }
    
    public boolean isCurrentTenantActive() {
        Tenant tenant = getCurrentTenant();
        return tenant.getIsActive();
    }

    /**
     * True when the request targets the platform front door (esy.ge) rather
     * than a tenant storefront: the apex/www host, or localhost without an
     * explicit ?tenant=. The SPA uses this to pick the platform vs storefront
     * shell.
     */
    public boolean isPlatformHost() {
        ServletRequestAttributes attributes =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return true;
        }
        HttpServletRequest request = attributes.getRequest();
        String host = request.getHeader("Host");
        if (host == null) {
            return true;
        }
        String h = host.split(":")[0].toLowerCase();

        // Apex/www, the back office and administration are all platform
        // surfaces: no store resolves from their Host header. Store scoping on
        // the back office comes from the API calls the shell makes; the admin
        // host has no store scope at all. Both subdomains are in TenantService's
        // RESERVED list, so no merchant can register them and shadow a surface.
        if (PlatformHosts.isPlatformSurface(h)) {
            return true;
        }
        // Bare localhost = platform unless ?tenant= forces a storefront.
        if (h.equals("localhost") || h.equals("127.0.0.1")) {
            return request.getParameter("tenant") == null;
        }
        // <sub>.<base domain> = a tenant storefront.
        return false;
    }

    /** manager.esy.ge / manager.lvh.me / manager.localhost — the back office. */
    public boolean isManagerHost() {
        return PlatformHosts.isManager(bareHost());
    }

    /** admin.esy.ge / admin.lvh.me / admin.localhost — platform administration. */
    public boolean isAdminHost() {
        return PlatformHosts.isAdmin(bareHost());
    }

    /** The request's Host header without its port, lowercased; "" when absent. */
    private static String bareHost() {
        ServletRequestAttributes attributes =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) return "";
        String host = attributes.getRequest().getHeader("Host");
        if (host == null) return "";
        return host.split(":")[0].toLowerCase();
    }
}
