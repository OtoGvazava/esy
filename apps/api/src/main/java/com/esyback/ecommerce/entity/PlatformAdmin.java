package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A platform admin granted at runtime through the admin UI — the "db" source in
 * GET /api/admin/admins. The other source is the {@code app.admin-emails}
 * allowlist (env / config store), which is read-only from the UI: those entries
 * report source "env" and DELETE must refuse them with 400, because nothing in
 * the database can revoke a value that comes from configuration.
 *
 * Emails are stored trimmed + lowercased (see {@link #of}), matching how
 * UserService compares against the allowlist. That is what makes the unique
 * constraint meaningful — a DB unique index is case-sensitive, so
 * "Bob@x.com" and "bob@x.com" would otherwise both be insertable and the
 * effective admin set would depend on typing.
 *
 * NB: a row here is a *record of the grant*. It does not by itself put ADMIN in
 * a user's authorities — role assignment happens in UserService at sign-in.
 *
 * Brand-new table, so NOT NULL columns are safe (the ddl-auto ADD COLUMN …
 * NOT NULL trap only applies to columns added to an already-populated table).
 */
@Entity
@Table(name = "platform_admins")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PlatformAdmin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;

    // Email of the admin who granted this one. Nullable: a row seeded by a
    // migration or by the bootstrap allowlist has no human grantor.
    @Column(name = "granted_by")
    private String grantedBy;

    @PrePersist
    protected void onCreate() {
        if (grantedAt == null) {
            grantedAt = Instant.now();
        }
    }

    /**
     * Convenience factory that applies the trim+lowercase normalization the
     * unique constraint depends on. {@code grantedAt} is stamped by
     * {@link #onCreate()}.
     */
    public static PlatformAdmin of(String email, String grantedBy) {
        PlatformAdmin admin = new PlatformAdmin();
        admin.email = normalizeEmail(email);
        admin.grantedBy = grantedBy;
        return admin;
    }

    /** Trim + lowercase, matching UserService's allowlist comparison. */
    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }
}
