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
    // columnDefinition carries a DB-level DEFAULT so Hibernate ddl-auto=update
    // can add this NOT NULL column to a table that already has rows (Postgres
    // rejects ADD COLUMN NOT NULL without a default; existing rows backfill to
    // the default). Portable across H2 (dev) and Postgres (prod/docker). See
    // also DataInitializer / deploy notes: legacy orders read back as 0.
    @Column(name = "service_fee", nullable = false, columnDefinition = "numeric(12,2) default 0")
    private BigDecimal serviceFee = BigDecimal.ZERO;

    // Same NOT-NULL-on-populated-table concern as service_fee: the DB default
    // ('NONE') lets ddl-auto=update add it to existing orders on deploy.
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, columnDefinition = "varchar(255) default 'NONE'")
    private PaymentStatus paymentStatus = PaymentStatus.NONE;

    // BOG's own order id (UUID), returned by create-order and echoed in the
    // callback. Used to reconcile via GET /receipt/{id} when the async
    // callback can't reach us (e.g. local dev).
    @Column(name = "bog_order_id")
    private String bogOrderId;

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
