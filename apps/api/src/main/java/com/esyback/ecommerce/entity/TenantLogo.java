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
 * A store's logo, stored in our own DB (bytea on Postgres / BLOB on H2) — same
 * model as {@link ProductImage}, no external object store. At most one row per
 * tenant; a re-upload deletes the old row and inserts a new one, so the served
 * URL ({@code /api/tenant/logo/{id}}) is immutable and safe to long-cache.
 *
 * Kept off the Tenant entity on purpose: {@code /api/tenant/current} runs on
 * every page load and must never drag logo bytes into memory.
 */
@Entity
@Table(name = "tenant_logos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TenantLogo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    // VARBINARY → bytea on Postgres. Avoids JPA @Lob, which Hibernate maps to
    // a Postgres large object (OID) and needs a tx to stream — a known gotcha.
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
