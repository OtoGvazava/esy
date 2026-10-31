package com.esyback.ecommerce.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * What a product list may be narrowed by. Every part is optional; an absent
 * one does not narrow anything.
 *
 * @param title       part of the title, matched ignoring case
 * @param minPrice    lowest price, inclusive
 * @param maxPrice    highest price, inclusive
 * @param minQuantity at least this much stock (the list's old {@code quantity}
 *                    parameter, kept for its callers)
 * @param category    exactly this category, ignoring case
 * @param inStock     only what can be bought now: stock above zero, and with
 *                    {@code options}, stock on the chosen combination itself
 * @param options     variant axis name → the values wanted on it. Values on one
 *                    axis are alternatives (S or M); separate axes must all hold
 *                    on the same combination (M and sea green), because that
 *                    combination is the thing a shopper would buy.
 */
public record ProductFilter(
    String title,
    BigDecimal minPrice,
    BigDecimal maxPrice,
    Integer minQuantity,
    String category,
    boolean inStock,
    Map<String, List<String>> options) {

    public ProductFilter {
        options = options == null ? Map.of() : options;
    }

    /** A search by title alone — the shape of {@code /api/products/search}. */
    public static ProductFilter byTitle(String title) {
        return new ProductFilter(title, null, null, null, null, false, Map.of());
    }
}
