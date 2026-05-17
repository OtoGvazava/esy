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

        // <sub>.esy.ge -> sub  (prod)
        if (h.endsWith(".esy.ge")) {
            return h.substring(0, h.length() - ".esy.ge".length());
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
        if (h.equals("esy.ge") || h.equals("www.esy.ge") || h.equals("www.localhost")) {
            return true;
        }
        // Bare localhost = platform unless ?tenant= forces a storefront.
        if (h.equals("localhost") || h.equals("127.0.0.1")) {
            return request.getParameter("tenant") == null;
        }
        // <sub>.esy.ge / <sub>.localhost = a tenant storefront.
        return false;
    }
}
