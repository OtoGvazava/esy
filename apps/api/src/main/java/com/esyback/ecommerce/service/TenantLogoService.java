package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.TenantLogo;
import com.esyback.ecommerce.repository.TenantLogoRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Store logo storage in our own DB — same DB-backed model as
 * {@link ProductImageService}, sharing {@link ImageUpload} for validation. The
 * store is the host-resolved current tenant; the controller's {@code @storeAccess}
 * gate ensures only that store's owner (or a global admin) can change it.
 *
 * Replace semantics: a new upload deletes the prior row and inserts a new one,
 * so {@code tenant.logoUrl} points at a fresh, immutable, long-cacheable id.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class TenantLogoService {

    private final TenantRepository tenantRepository;
    private final TenantLogoRepository logoRepository;
    private final TenantContextService tenantContextService;

    public static String logoUrl(Long logoId) {
        return "/api/tenant/logo/" + logoId;
    }

    public Tenant setLogo(MultipartFile file) {
        Tenant tenant = currentTenant();
        byte[] bytes = ImageUpload.read(file);
        String type = ImageUpload.resolveType(file, bytes);

        // One logo per store: drop the old row so the served id changes.
        logoRepository.deleteByTenant_Id(tenant.getId());
        logoRepository.flush();

        TenantLogo logo = new TenantLogo();
        logo.setTenant(tenant);
        logo.setData(bytes);
        logo.setContentType(type);
        logo.setSizeBytes(bytes.length);
        TenantLogo saved = logoRepository.save(logo);

        tenant.setLogoUrl(logoUrl(saved.getId()));
        return tenantRepository.save(tenant);
    }

    public Tenant clearLogo() {
        Tenant tenant = currentTenant();
        logoRepository.deleteByTenant_Id(tenant.getId());
        tenant.setLogoUrl(null);
        return tenantRepository.save(tenant);
    }

    /** Bytes for the public serve endpoint. */
    @Transactional(readOnly = true)
    public TenantLogo getForServing(Long logoId) {
        return logoRepository.findById(logoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Logo not found"));
    }

    private Tenant currentTenant() {
        Tenant tenant = tenantContextService.getCurrentTenant();
        if (tenant == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No store in context");
        }
        return tenant;
    }
}
