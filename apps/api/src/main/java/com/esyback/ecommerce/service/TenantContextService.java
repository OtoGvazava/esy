package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.TenantRepository;
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

        // The back office serves every store from one host, so the Host header
        // cannot carry the store. The shell passes ?tenant=<sub> instead (the
        // same mechanism the bare-localhost dev fallback uses); @storeAccess
        // still checks membership against whatever resolves, so pointing the
        // param at someone else's store just yields 403s on management calls.
        if (isManagerHost(h)) {
            String subdomain = request.getParameter("tenant");
            return subdomain != null ? subdomain : DEFAULT_TENANT_SUBDOMAIN;
        }

        // <sub>.esy.ge -> sub  (prod)
        if (h.endsWith(".esy.ge")) {
            return h.substring(0, h.length() - ".esy.ge".length());
        }

        // <sub>.lvh.me -> sub  (local lvh.me dev domain)
        if (h.endsWith(".lvh.me")) {
            return h.substring(0, h.length() - ".lvh.me".length());
        }

        // lvh.me / www.lvh.me -> platform
        if (h.equals("lvh.me") || h.equals("www.lvh.me")) {
            return DEFAULT_TENANT_SUBDOMAIN;
        }

        // <sub>.localhost -> sub  (local wildcard, no /etc/hosts — Chrome
        // resolves *.localhost to 127.0.0.1). www.localhost = platform.
        if (h.endsWith(".localhost")) {
            String label = h.substring(0, h.length() - ".localhost".length());
            if (!label.isEmpty() && !label.equals("www")) {
                return label;
            }
        }

        // Bare localhost: ?tenant=<sub> dev fallback.
        if (h.equals("localhost") || h.equals("127.0.0.1") || h.endsWith(".localhost")) {
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

        // Apex / www = platform.
        if (h.equals("esy.ge") || h.equals("www.esy.ge") || h.equals("www.localhost")
                || h.equals("lvh.me") || h.equals("www.lvh.me")) {
            return true;
        }
        // The back office is a platform host, not a tenant: no store resolves
        // from it, and store scoping there comes from the API calls the shell
        // makes, not from the Host header. The subdomain is in TenantService's
        // RESERVED list so no merchant can ever register it.
        if (isManagerHost(h)) {
            return true;
        }
        // Bare localhost = platform unless ?tenant= forces a storefront.
        if (h.equals("localhost") || h.equals("127.0.0.1")) {
            return request.getParameter("tenant") == null;
        }
        // <sub>.esy.ge / <sub>.localhost / <sub>.lvh.me = a tenant storefront.
        return false;
    }

    /** manager.esy.ge / manager.lvh.me / manager.localhost — the back office. */
    public boolean isManagerHost() {
        ServletRequestAttributes attributes =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) return false;
        String host = attributes.getRequest().getHeader("Host");
        if (host == null) return false;
        return isManagerHost(host.split(":")[0].toLowerCase());
    }

    private static boolean isManagerHost(String bareHost) {
        return bareHost.equals("manager.esy.ge")
            || bareHost.equals("manager.lvh.me")
            || bareHost.equals("manager.localhost");
    }
}
