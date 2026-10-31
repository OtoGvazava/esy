package com.esyback.ecommerce.dto;

/**
 * One of a store's categories and how many products carry it — a pill on the
 * storefront's home page.
 *
 * <p>{@code count} is a {@link Long} rather than a {@code long} because the
 * repository builds this with a JPQL constructor expression, and COUNT arrives
 * boxed.
 */
public record CategoryCount(String name, Long count) {}
