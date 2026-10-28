package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "tenants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
// id-based identity so Tenant comparisons (e.g. product.getTenant().equals(...))
// are stable on lazy proxies.
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;
    
    @NotBlank(message = "Tenant name is required")
    @Column(unique = true, nullable = false)
    private String name;
    
    @NotBlank(message = "Subdomain is required")
    @Pattern(regexp = "^[a-z0-9-]+$", message = "Subdomain must contain only lowercase letters, numbers, and hyphens")
    @Column(unique = true, nullable = false)
    private String subdomain;
    
    @Column(name = "display_name")
    private String displayName;
    
    /**
     * The long description: the About page's paragraph, and the shop's own
     * account of itself.
     */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * The short description — one line, for the storefront hero and the
     * platform directory.
     *
     * <p>The design has always drawn two: a tagline in the hero and a
     * paragraph on the About page. With one field the same sentence printed in
     * both places, so the Home About strip dropped its paragraph rather than
     * repeat the hero. Nullable with no default, which is the only shape of new
     * column {@code ddl-auto=update} can add to a populated table; a store that
     * predates it simply has none, and every reader falls back to
     * {@code description} so nothing goes blank.
     */
    @Column(name = "tagline")
    private String tagline;
    
    @Column(name = "logo_url")
    private String logoUrl;

    // Directory facet (fashion / electronics / home / food / art). Nullable.
    @Column(name = "category")
    private String category;
    
    @Column(name = "primary_color")
    private String primaryColor;
    
    @Column(name = "secondary_color")
    private String secondaryColor;

    // Owner-editable public storefront address. The hero shows city · country;
    // the full address is kept for contact/checkout use.
    @Column(name = "address_street")
    private String addressStreet;

    @Column(name = "address_city")
    private String addressCity;

    @Column(name = "address_country")
    private String addressCountry;

    @Column(name = "address_postal_code")
    private String addressPostalCode;

    // Founding year shown as "est {year}" in the hero. Nullable → UI default.
    @Column(name = "established_year")
    private Integer establishedYear;

    // Per-store Bank of Georgia merchant credentials (issued on bonline.bog.ge).
    // The secret is stored AES-GCM encrypted (SecretCipher) — it must never be
    // serialized to the public tenant JSON; TenantMapper exposes only a
    // bogConfigured boolean. Both null until the owner connects BOG in Store
    // Settings; checkout falls back to the free-order flow when unset.
    @Column(name = "bog_client_id")
    private String bogClientId;

    @Column(name = "bog_client_secret", length = 1024)
    private String bogClientSecret;

    @Column(name = "is_active")
    private Boolean isActive = true;

    // Platform-admin suspension. suspendedAt != null IS the suspended state —
    // there is no boolean twin to drift out of sync; reactivate clears all three.
    // Distinct from isActive, which the owner controls for their own store.
    //
    // ALL THREE ARE NULLABLE ON PURPOSE. `tenants` is populated in prod, and
    // ddl-auto=update emits ADD COLUMN only — a NOT NULL add is rejected on a
    // table with rows (CLAUDE.md gotcha #1), leaving the app booted but broken.
    // Nullable adds are accepted; existing stores read back as "never suspended",
    // which is exactly right. No columnDefinition default is needed (and none is
    // given: see Order.serviceFee for why a "default" in columnDefinition makes
    // Hibernate re-emit an invalid ALTER on every Postgres boot).
    @Column(name = "suspended_at")
    private Instant suspendedAt;

    // Email of the platform admin who suspended the store (audit trail on the
    // row itself; the full history lives in AuditLog).
    @Column(name = "suspended_by")
    private String suspendedBy;

    // Free-text reason shown to the owner. TEXT mirrors `description` above,
    // which is the proven type for a free-text column on this table.
    @Column(name = "suspend_reason", columnDefinition = "TEXT")
    private String suspendReason;


    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
