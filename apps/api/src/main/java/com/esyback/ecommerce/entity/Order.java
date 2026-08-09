package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Order {

    public enum Status { PLACED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED }

    /**
     * Payment lifecycle, orthogonal to the fulfillment {@link Status}.
     * NONE     = no online payment (free-order fallback for stores without BOG).
     * PENDING  = BOG order created, customer redirected, awaiting the result.
     * PAID     = BOG callback/receipt confirmed a completed payment.
     * FAILED   = BOG reported rejected/failed, or the customer abandoned it.
     * REFUNDED = fully/partially refunded via BOG.
     */
    public enum PaymentStatus { NONE, PENDING, PAID, FAILED, REFUNDED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "order_number", nullable = false, unique = true)
    private String orderNumber;

    // Nullable: guest checkout is allowed; cross-store account view needs user.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PLACED;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    // Platform service fee accrued on this order (2% of total by default),
    // computed + frozen server-side at creation. The shopper never sees or
    // pays it and it does NOT change the BOG charge (which is `total`); it is
    // an internal ledger figure esy bills the store for periodically. Frozen
    // per order so a later rate change can't rewrite historical amounts owed.
    //
    // NB: do NOT put a "default" in columnDefinition — Hibernate ddl-auto=update
    // then re-emits it verbatim as `ALTER COLUMN … SET DATA TYPE numeric(12,2)
    // default 0` on every boot against Postgres, which is invalid SQL (syntax
    // error at "default") and slows startup. The column already exists in prod;
    // the app always sets the value, so no DB default is needed.
    @Column(name = "service_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal serviceFee = BigDecimal.ZERO;

    // columnDefinition="varchar(255)" (no default!) keeps Hibernate from freezing
    // an @Enumerated CHECK on the column (see CLAUDE.md enum-CHECK trap) while
    // avoiding the invalid "… default …" ALTER. It matches the existing column,
    // so no ALTER is emitted.
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, columnDefinition = "varchar(255)")
    private PaymentStatus paymentStatus = PaymentStatus.NONE;

    // BOG's own order id (UUID), returned by create-order and echoed in the
    // callback. Used to reconcile via GET /receipt/{id} when the async
    // callback can't reach us (e.g. local dev).
    @Column(name = "bog_order_id")
    private String bogOrderId;

    // Delivery address, frozen at checkout (decision D4). Plain columns, not a
    // FK to Address: the user's address book is mutable and deletable, but an
    // order must keep the address as it was at purchase time — the same pattern
    // OrderItem uses for title/price. All nullable (additive-safe on populated
    // Postgres; pre-existing orders simply have no delivery address).
    @Column(name = "ship_recipient")
    private String shipRecipient;

    @Column(name = "ship_phone")
    private String shipPhone;

    @Column(name = "ship_line")
    private String shipLine;

    @Column(name = "ship_city")
    private String shipCity;

    @Column(name = "ship_postal_code")
    private String shipPostalCode;

    @Column(name = "ship_country")
    private String shipCountry;

    // Delivery, frozen at checkout the same way the address above is (D9). The
    // route the shopper chose and what they were charged for it: a later change
    // to the store's delivery prices must not rewrite what this order cost.
    //
    // Both nullable, so ddl-auto=update can add them to a populated orders
    // table — pre-existing orders predate delivery routes and read back as
    // "none recorded", which is exactly what they are. Deliberately NOT
    // @Enumerated: an enum column freezes its CHECK at creation, so adding a
    // fifth route later would reject every write on populated Postgres.
    //
    // There is no separate address snapshot: the ship* columns above already
    // are it. A second copy could only ever disagree with the first.
    @Column(name = "delivery_fee", precision = 12, scale = 2)
    private BigDecimal deliveryFee;

    @Column(name = "delivery_route")
    private String deliveryRoute;

    // Whether the shopper paid for the express upgrade on top of that route.
    // Nullable, and null reads as "no" — every order placed before express
    // existed simply did not have it.
    @Column(name = "delivery_express")
    private Boolean deliveryExpress;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public void addItem(OrderItem item) {
        item.setOrder(this);
        this.items.add(item);
    }
}
