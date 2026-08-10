package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Append-only record of what a platform admin did: who, when, which action,
 * which target, and a free-text detail. Feeds GET /api/admin/audit
 * (newest first, ?limit=N).
 *
 * Rows are never updated or deleted by the app — an audit trail that can be
 * rewritten is not an audit trail. Brand-new table, so NOT NULL on the columns
 * that must always be present is safe here (the ddl-auto ADD COLUMN … NOT NULL
 * trap only bites columns added to an already-populated table).
 *
 * `action` and `targetType` are deliberately String, NOT @Enumerated. An
 * @Enumerated(STRING) column freezes a CHECK (col IN (…)) at the enum's values
 * as of table creation (CLAUDE.md gotcha #2, see SchemaMigrations), so every
 * new admin action added later would be rejected by populated Postgres. Free
 * strings keep this table additive forever; the writers use short stable
 * constants ("STORE_SUSPENDED", "ADMIN_GRANTED", …).
 */
@Entity
@Table(name = "audit_logs", indexes = {
    // The audit feed is always "newest first, limit N"; the targeted index
    // serves the per-store history view.
    @Index(name = "idx_audit_logs_at", columnList = "at"),
    @Index(name = "idx_audit_logs_target", columnList = "target_type, target_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    // "at" is a non-reserved keyword in both Postgres and H2, so it needs no
    // quoting. Instant (not LocalDateTime) — an audit timestamp is an absolute
    // instant and must not depend on the server's zone.
    @Column(name = "at", nullable = false)
    private Instant at;

    // Email of the admin who performed the action (never a user id: admins can
    // be granted by ADMIN_EMAILS without a User row existing yet).
    @Column(name = "actor_email", nullable = false)
    private String actorEmail;

    // Stable constant, e.g. STORE_SUSPENDED / STORE_REACTIVATED /
    // ADMIN_GRANTED / ADMIN_REVOKED.
    @Column(name = "action", nullable = false)
    private String action;

    // What was acted on, e.g. "STORE" (targetId = subdomain) or "ADMIN"
    // (targetId = email). Nullable for platform-wide actions with no target.
    @Column(name = "target_type")
    private String targetType;

    @Column(name = "target_id")
    private String targetId;

    // Human-readable context (suspend reason, previous value, …).
    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @PrePersist
    protected void onCreate() {
        if (at == null) {
            at = Instant.now();
        }
    }

    /**
     * Convenience factory so callers don't have to pass a positional null id
     * through the Lombok all-args constructor. {@code at} is stamped by
     * {@link #onCreate()}.
     */
    public static AuditLog of(String actorEmail, String action,
                              String targetType, String targetId, String detail) {
        AuditLog log = new AuditLog();
        log.actorEmail = actorEmail;
        log.action = action;
        log.targetType = targetType;
        log.targetId = targetId;
        log.detail = detail;
        return log;
    }
}
