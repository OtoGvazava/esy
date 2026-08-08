package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * The user↔store join that makes one global account span many stores.
 * role = OWNER (created the store; full control incl. users/integrations),
 * MANAGER (may run products/orders/statistics for the store), or CUSTOMER
 * (shopped there). One row per (user, tenant); a higher role never gets
 * silently downgraded by a later CUSTOMER touch.
 *
 * MIGRATION NOTE: adding a constant here passes on H2 (create-drop rebuilds
 * the CHECK each boot) but populated Postgres keeps the CHECK frozen at the
 * old value list and rejects every write. SchemaMigrations re-creates the
 * constraint at startup — keep it in sync with this enum.
 */
@Entity
@Table(name = "store_memberships",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "tenant_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class StoreMembership {

    public enum Role { OWNER, MANAGER, CUSTOMER }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
