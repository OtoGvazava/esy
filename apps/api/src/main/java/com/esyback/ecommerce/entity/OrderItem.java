package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "product_id")
    private Long productId;

    // Snapshots — title/price at purchase time (product may change/vanish).
    @Column(nullable = false)
    private String title;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer quantity = 1;

    // The chosen combination, frozen the same way title and price are (D11):
    // "38 · black". Nullable — a product without variants has none, and so
    // does every order placed before variants existed.
    @Column(name = "variant_label")
    private String variantLabel;

    // Which variant row the stock came out of. Kept as a plain id rather than
    // a FK for the same reason productId is: the order must survive the
    // variant being renamed or deleted, and variantLabel above is what a human
    // reads. This is only used to put stock back on a cancellation.
    @Column(name = "variant_id")
    private Long variantId;
}
