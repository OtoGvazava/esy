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
 * A product photo stored in our own DB (bytea on Postgres / BLOB on H2) — no
 * external object store. One row per uploaded image; `position` orders the
 * gallery. The bytes ride wherever the DB persists (compose Postgres / Render
 * Postgres); on Render-free in-memory H2 they reset like all other data.
 *
 * Kept as a separate entity (not a Product collection) so listing/detail never
 * drags image bytes into memory — only the serve endpoint loads `data`.
 */
@Entity
@Table(name = "product_images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ProductImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    // VARBINARY → bytea on Postgres. Avoids JPA @Lob, which Hibernate maps to
    // a Postgres large object (OID) and needs a tx to stream — a known gotcha.
    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "data", nullable = false)
    private byte[] data;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    // 0-based gallery order. Phase 1 is append-only (position = current count).
    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
