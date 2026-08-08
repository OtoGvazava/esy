package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * A shopper's delivery address. Owned by the USER, not a store — one account
 * spans every *.esy.ge storefront, so an address saved while buying at one
 * store is offered at checkout on all of them (decision D4).
 *
 * Orders do NOT reference these rows: at checkout the chosen address is
 * frozen onto the Order as plain columns (ship*), the same way OrderItem
 * freezes product title/price. Editing or deleting an entry here never
 * rewrites history.
 */
@Entity
@Table(name = "addresses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Person receiving the parcel — defaults to the account name in the UI. */
    @Column(nullable = false)
    private String recipient;

    /** Contact number for the courier; pre-filled from the verified account phone. */
    @Column(nullable = false)
    private String phone;

    /** Street address, single line (street, number, apartment). */
    @Column(nullable = false)
    private String line;

    @Column(nullable = false)
    private String city;

    @Column(name = "postal_code")
    private String postalCode;

    /** ISO-ish country label; the market is Georgia so this defaults in the UI. */
    private String country;

    /** Preselected at checkout. Enforced one-per-user in the service layer. */
    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
