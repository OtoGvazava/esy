package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One axis a product varies on — size, or colour (decision D11).
 *
 * <p>A product may carry one or two. Two is the ceiling on purpose: a third
 * axis produces a combination table nobody fills in.
 *
 * <p>The axis NAME is merchant-authored text in whatever language they type,
 * like every other piece of store content. The platform does not translate it.
 */
@Entity
@Table(name = "product_options")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ProductOption {

    /** A product may vary on at most this many axes (D11). */
    public static final int MAX_AXES = 2;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Merchant's own label — "ზომა", "Size", "Colour". */
    @Column(name = "name", nullable = false)
    private String name;

    /** 1 or 2. Decides which slot of a variant's key this axis fills. */
    @Column(name = "position", nullable = false)
    private Integer position;

    /**
     * The axis's values in display order, stored as a single delimited string
     * rather than a child table.
     *
     * <p>They are only ever read and written as a whole list — the storefront
     * renders all of them, the editor replaces all of them — so a table would
     * add a join and an ordering column to buy nothing. The delimiter is a
     * newline because a merchant may legitimately type a comma inside a value
     * ("ლურჯი, ღია").
     */
    @Column(name = "values_text", columnDefinition = "TEXT", nullable = false)
    private String valuesText = "";
}
