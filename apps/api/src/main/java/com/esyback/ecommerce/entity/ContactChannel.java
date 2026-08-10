package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * One way to reach a store (decision D10). A phone number is not a special
 * field on the store — it is an entry in this list, alongside a second phone,
 * WhatsApp, Facebook and Instagram.
 *
 * <p>Hiding is separate from deleting on purpose: a shop closing a channel for
 * the season keeps the value and flips {@link #isPublic}, rather than retyping
 * the number when it reopens.
 *
 * <p>{@code type} is a validated String, NOT {@code @Enumerated}. Hibernate
 * freezes an enum column's {@code CHECK (type IN (…))} at the values present
 * when the table is created, so adding a fifth channel later would pass on H2
 * and reject every write on populated Postgres. Keeping it a free column with
 * the check in code means a new channel type is a code change, not a migration
 * — the same reasoning as {@code AuditLog.action}.
 */
@Entity
@Table(name = "contact_channels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ContactChannel {

    /**
     * The channels a store may list, in the storefront's display order.
     *
     * <p>Lowercase to match the design's own vocabulary (esy-core.jsx keys its
     * CHANNELS map this way) so the same string is the API value, the CSS
     * brand-colour key and the i18n key, with no casing layer in between.
     */
    public static final List<String> TYPES = List.of("phone", "whatsapp", "facebook", "instagram");

    /** Channels whose value is a telephone number rather than a handle or URL. */
    public static final List<String> PHONE_TYPES = List.of("phone", "whatsapp");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    /** One of {@link #TYPES}. Validated in the service, not by a DB constraint. */
    @Column(name = "type", nullable = false)
    private String type;

    /**
     * The number, handle or URL a shopper uses.
     *
     * <p>Mapped to {@code contact_value}: {@code VALUE} is a reserved word in
     * H2 2.x, so a column literally named {@code value} fails to create and
     * every generated SELECT is a syntax error. Renaming beats quoting, which
     * would then have to be spelled correctly for both H2 and Postgres.
     */
    @Column(name = "contact_value", nullable = false)
    private String value;

    /**
     * The number a shopper should try first. At most one per store, and only a
     * phone type carries it — a marker on an Instagram handle would tell the
     * shopper nothing about how to actually reach the shop.
     */
    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary = false;

    /** Whether the storefront shows it. Hiding keeps the value; deleting discards it. */
    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = true;

    /** The owner's chosen order within the list. */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
