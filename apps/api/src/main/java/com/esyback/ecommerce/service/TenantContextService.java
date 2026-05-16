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
        
        // Extract subdomain from host (e.g., shop1.esy.ge -> shop1)
        if (host.contains(".esy.ge")) {
            String subdomain = host.substring(0, host.indexOf(".esy.ge"));
            return subdomain;
        }
        
        // For localhost development
        if (host.contains("localhost")) {
            String subdomain = request.getParameter("tenant");
            return subdomain != null ? subdomain : DEFAULT_TENANT_SUBDOMAIN;
        }
        
        return DEFAULT_TENANT_SUBDOMAIN;
    }
    
    public boolean isCurrentTenantActive() {
        Tenant tenant = getCurrentTenant();
        return tenant.getIsActive();
    }
}
