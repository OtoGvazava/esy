package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.TenantCover;
import com.esyback.ecommerce.repository.TenantCoverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Store cover photo storage in our own DB: {@link TenantLogoService}'s model
 * and {@link ImageUpload}'s validation (5 MB cap, the type sniffed from the
 * bytes), so the two uploads cannot drift apart. The store is the
 * host-resolved current tenant; the controller's {@code @storeAccess} gate
 * lets only that store's owner (or a global admin) change it.
 *
 * <p>Replace semantics: a new upload deletes the prior row and inserts a new
 * one, so the cover URL points at a fresh, immutable, long-cacheable id.
 *
 * <p>Unlike the logo, the URL is not stored on the Tenant row. A new column
 * on {@code tenants} is the risky shape under {@code ddl-auto=update}, and
 * the cover table already answers "which cover does this store have" with an
 * id-only query.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class TenantCoverService {

    private final TenantCoverRepository coverRepository;
    private final TenantContextService tenantContextService;

    public static String coverUrl(Long coverId) {
        return "/api/tenant/cover/" + coverId;
    }

    /** Where the store's cover is served, or null when it has none. Never reads the bytes. */
    @Transactional(readOnly = true)
    public String currentCoverUrl(Tenant tenant) {
        if (tenant == null || tenant.getId() == null) return null;
        List<Long> ids = coverRepository.findIdsByTenantId(tenant.getId());
        return ids.isEmpty() ? null : coverUrl(ids.get(0));
    }

    /**
     * Where each of these stores' covers is served, by store id; a store
     * without one has no entry. One id-only query for the whole store
     * directory, which draws a cover on every card.
     */
    @Transactional(readOnly = true)
    public Map<Long, String> coverUrls(Collection<Long> tenantIds) {
        if (tenantIds == null || tenantIds.isEmpty()) return Map.of();
        Map<Long, String> urls = new HashMap<>();
        for (Object[] row : coverRepository.findIdsByTenantIds(tenantIds)) {
            urls.put((Long) row[0], coverUrl((Long) row[1]));
        }
        return urls;
    }

    /** Replaces the current store's cover; answers the new cover's URL. */
    public String setCover(MultipartFile file) {
        Tenant tenant = currentTenant();
        byte[] bytes = ImageUpload.read(file);
        String type = ImageUpload.resolveType(file, bytes);

        // One cover per store: drop the old row so the served id changes.
        coverRepository.deleteByTenant_Id(tenant.getId());
        coverRepository.flush();

        TenantCover cover = new TenantCover();
        cover.setTenant(tenant);
        cover.setData(bytes);
        cover.setContentType(type);
        cover.setSizeBytes(bytes.length);
        return coverUrl(coverRepository.save(cover).getId());
    }

    /** Removes the current store's cover. Removing a cover that is not there is not an error. */
    public void clearCover() {
        coverRepository.deleteByTenant_Id(currentTenant().getId());
    }

    /** Bytes for the public serve endpoint. */
    @Transactional(readOnly = true)
    public TenantCover getForServing(Long coverId) {
        return coverRepository.findById(coverId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cover not found"));
    }

    private Tenant currentTenant() {
        Tenant tenant = tenantContextService.getCurrentTenant();
        if (tenant == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No store in context");
        }
        return tenant;
    }
}
