package com.esyback.ecommerce.service;

import com.esyback.ecommerce.config.DesignProperties;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.web.ApiRefusal;
import com.esyback.ecommerce.web.DesignValidator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

/**
 * A store's design (docs/plans/store-design-system.md, Phase 1): the draft
 * its owner edits and the published design its storefront draws.
 *
 * <p>Every design is normalised by {@link DesignValidator} on the way in and
 * again on the way out, so a row written under an older schema still reads as
 * a valid design. Published colours are not stored in the design JSON: they
 * live in {@code primaryColor} / {@code secondaryColor}, which emails, the
 * admin and every existing screen read, and are merged back in on read.
 *
 * <p>Access control is the controller's ({@code @storeAccess}); this class
 * only acts on the tenant it is handed.
 */
@Service
@RequiredArgsConstructor
public class TenantDesignService {

    private final TenantRepository tenantRepository;
    private final DesignProperties designProperties;

    /** The kill switch, {@code app.design.enabled}. */
    public boolean isEnabled() {
        return designProperties.isEnabled();
    }

    /**
     * The published design with the store's colours merged in, or null when
     * nothing is published. Ignores the kill switch; callers decide.
     */
    public ObjectNode published(Tenant tenant) {
        ObjectNode stored = DesignValidator.readStored(tenant.getDesignPublished());
        if (stored == null) return null;
        return DesignValidator.withColours(stored, tenant.getPrimaryColor(), tenant.getSecondaryColor());
    }

    /** What a storefront draws: the published design, or null when there is none or the switch is off. */
    public ObjectNode storefrontDesign(Tenant tenant) {
        return isEnabled() ? published(tenant) : null;
    }

    /** The owner's editor view: {@code {draft, published, draftUpdatedAt, publishedAt}}. */
    public Map<String, Object> ownerView(Tenant tenant) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("draft", DesignValidator.readStored(tenant.getDesignDraft()));
        m.put("published", published(tenant));
        m.put("draftUpdatedAt", tenant.getDesignDraftUpdatedAt());
        m.put("publishedAt", tenant.getDesignPublishedAt());
        return m;
    }

    /**
     * Validates, normalises and stores the draft, and returns it as stored.
     * Allowed while the switch is off: a draft changes nothing anyone sees.
     */
    public ObjectNode saveDraft(Tenant tenant, String raw) {
        ObjectNode draft = checked(() -> DesignValidator.validate(raw));
        tenant.setDesignDraft(DesignValidator.toJson(draft));
        tenant.setDesignDraftUpdatedAt(Instant.now());
        tenantRepository.save(tenant);
        return draft;
    }

    /**
     * The draft becomes the published design: its colours go to the colour
     * columns, the rest to the published JSON, and the draft is cleared.
     *
     * <p>Refused while the switch is off. Publishing writes the colour
     * columns, which today's storefront already draws, so allowing it would
     * let the design system change a store's look while it is meant to be off.
     */
    public Map<String, Object> publish(Tenant tenant) {
        if (!isEnabled()) {
            throw new ApiRefusal(HttpStatus.SERVICE_UNAVAILABLE, "DESIGN_DISABLED",
                "Store designs are switched off on this platform, so nothing can be published");
        }
        ObjectNode draft = DesignValidator.readStored(tenant.getDesignDraft());
        if (draft == null) {
            throw new ApiRefusal(HttpStatus.CONFLICT, "DESIGN_NO_DRAFT", "There is no draft to publish");
        }
        // A colour the draft does not carry leaves its column as it was:
        // publishing never blanks a colour the rest of the platform reads.
        String primary = DesignValidator.colour(draft, "primary");
        String second = DesignValidator.colour(draft, "second");
        if (primary != null) tenant.setPrimaryColor(primary);
        if (second != null) tenant.setSecondaryColor(second);
        storePublished(tenant, draft);
        tenant.setDesignDraft(null);
        tenant.setDesignDraftUpdatedAt(null);
        return ownerView(tenantRepository.save(tenant));
    }

    /** Drops the draft. The published design is untouched; no draft is not an error. */
    public Map<String, Object> discardDraft(Tenant tenant) {
        tenant.setDesignDraft(null);
        tenant.setDesignDraftUpdatedAt(null);
        return ownerView(tenantRepository.save(tenant));
    }

    /**
     * The design quick setup sends with store creation, normalised; null when
     * none was sent or the switch is off. With the switch off it is ignored
     * entirely, not validated, so registration behaves exactly as before.
     */
    public ObjectNode forNewStore(JsonNode requested) {
        if (requested == null || requested.isNull() || requested.isMissingNode()) return null;
        if (!isEnabled()) return null;
        return checked(() -> DesignValidator.validate(requested));
    }

    /**
     * Stores a design as published, without its colours, and stamps it. The
     * colour columns are the caller's to set: on creation the request's own
     * colours win, on publish the draft's do.
     */
    public void storePublished(Tenant tenant, ObjectNode design) {
        tenant.setDesignPublished(DesignValidator.toJson(DesignValidator.withoutColours(design)));
        tenant.setDesignPublishedAt(Instant.now());
    }

    private static ObjectNode checked(Supplier<ObjectNode> validation) {
        try {
            return validation.get();
        } catch (DesignValidator.Rejected e) {
            throw new ApiRefusal(HttpStatus.BAD_REQUEST, e.getCode(), e.getMessage());
        }
    }
}
