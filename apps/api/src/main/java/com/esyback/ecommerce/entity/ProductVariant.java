package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * One buyable combination of a product's axes — "38 · black" (decision D11).
 *
 * <p><b>Stock lives here, not on the product.</b> Once a product has variants,
 * {@code Product.quantity} stops being the truth and becomes the sum of these
 * rows; the editor stops offering it. That is the whole point of the feature:
 * a shirt is not "12 in stock", it is 6 in M and 0 in L.
 *
 * <p>Price is optional. A row with none uses the product's base price, so a
 * size run at one price stays one number to edit; a row that genuinely differs
 * — a larger size costing more — overrides it.
 */
@Entity
@Table(
    name = "product_variants",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_variant_combination",
        columnNames = { "product_id", "value1", "value2" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** The value on axis 1. Always present — a variant has at least one axis. */
    @Column(name = "value1", nullable = false)
    private String value1;

    /**
     * The value on axis 2, or empty for a single-axis product.
     *
     * <p>Empty string rather than NULL, because the unique constraint above is
     * what stops a product growing two rows for the same combination — and in
     * SQL two NULLs are not equal, so a nullable column would let duplicates
     * straight through the constraint that exists to prevent them.
     */
    @Column(name = "value2", nullable = false)
    private String value2 = "";

    /** Null means "use the product's base price". */
    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 0;

    /** How this combination reads on an order line: "38 · black". */
    public String label() {
        return value2 == null || value2.isBlank() ? value1 : value1 + " · " + value2;
    }
}
