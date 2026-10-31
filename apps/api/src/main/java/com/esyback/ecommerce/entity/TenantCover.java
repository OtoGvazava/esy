package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * A store's cover photo: the picture the cover header draws across the top
 * of the storefront (store design plan, Phase 1). The same model as
 * {@link TenantLogo}, in its own table: at most one row per tenant, and a
 * re-upload deletes the old row and inserts a new one, so the served URL
 * ({@code /api/tenant/cover/{id}}) is immutable and safe to long-cache.
 *
 * <p>A table of its own rather than a {@code kind} column on
 * {@code tenant_logos}: under {@code ddl-auto=update} a new table is created
 * whole, while a new column on a populated table is the risky shape (CLAUDE.md
 * gotchas). For the same reason the Tenant row carries no cover column at all;
 * the current cover is found by its tenant, without reading the bytes.
 */
@Entity
@Table(name = "tenant_covers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TenantCover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    // VARBINARY → bytea on Postgres, as for the logo: JPA @Lob would map to a
    // Postgres large object (OID), which needs a transaction to stream.
    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "data", nullable = false)
    private byte[] data;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
