package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * An owner's offer of a store role to an email address, waiting for that
 * person to accept it (review M36).
 *
 * <p>Roles used to take effect the moment an owner typed an address: anyone
 * could be made staff, or the sole owner, of a store they had never heard of,
 * and the answer told the owner whether the address had an account and whose
 * name it carried. Now an owner only records an invitation; nothing is granted
 * and nothing about the address is revealed until the person, signed in with
 * that email, accepts it from their own account.
 *
 * <p>One invitation per store and address: inviting again replaces the role
 * and restarts the clock. The role is plain text validated in code, so a new
 * role never trips a frozen CHECK constraint on a populated database.
 */
@Entity
@Table(name = "store_invitations",
    uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "email"}))
@Getter
@Setter
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class StoreInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    /** Lower-cased; matched against the invitee's sign-in email. */
    @Column(nullable = false)
    private String email;

    /** OWNER or MANAGER. */
    @Column(nullable = false, columnDefinition = "varchar(32)")
    private String role;

    /** The owner who sent it, for the invitee to see who asked. */
    @Column(name = "invited_by")
    private String invitedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void stamp() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public StoreMembership.Role roleValue() {
        return StoreMembership.Role.valueOf(role);
    }
}
