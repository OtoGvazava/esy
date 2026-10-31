package com.esyback.ecommerce.dto;

import java.util.List;

/**
 * One variant axis as a storefront filter: its name ("ზომა") and every value
 * the store's products offer on it ("S", "M", "L").
 *
 * <p>Built from the merchants' own axes (D11), so the name and values are
 * whatever they typed. Axes with the same name on different products are one
 * facet — the comparison ignores case, and the spelling shown is the first one
 * met.
 */
public record OptionFacet(String name, List<String> values) {}
