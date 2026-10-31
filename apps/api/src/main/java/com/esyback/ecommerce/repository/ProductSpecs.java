package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.dto.ProductFilter;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductOption;
import com.esyback.ecommerce.entity.ProductVariant;
import com.esyback.ecommerce.entity.Tenant;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The storefront's product filters as one query.
 *
 * <p>Built from criteria rather than a fixed JPQL string because the variant
 * filter adds one join per axis the shopper narrows by, which a static query
 * cannot express.
 *
 * <p>Every value reaches the database as a bound parameter: compared through
 * {@code cb.equal(expression, value)} and never {@code cb.literal(value)},
 * which Hibernate writes into the SQL text itself. Case is ignored by
 * lower-casing the column in the database and the value here.
 */
public final class ProductSpecs {

    private ProductSpecs() {}

    public static Specification<Product> matching(Tenant tenant, ProductFilter f) {
        return (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();
            where.add(cb.equal(root.get("tenant"), tenant));

            if (f.title() != null && !f.title().isBlank()) {
                // A typed % or _ is a character to find, not a wildcard.
                where.add(cb.like(cb.lower(root.get("title")),
                    "%" + escapeLike(lower(f.title().strip())) + "%", '\\'));
            }
            if (f.minPrice() != null) where.add(cb.greaterThanOrEqualTo(root.get("price"), f.minPrice()));
            if (f.maxPrice() != null) where.add(cb.lessThanOrEqualTo(root.get("price"), f.maxPrice()));
            if (f.minQuantity() != null) where.add(cb.greaterThanOrEqualTo(root.get("quantity"), f.minQuantity()));
            if (f.category() != null) {
                where.add(cb.equal(cb.lower(root.get("category")), lower(f.category())));
            }
            // With variants the product's quantity is the cached sum of its
            // combinations, so "above zero" means at least one can be bought.
            if (f.inStock()) where.add(cb.greaterThan(root.get("quantity"), 0));
            if (!f.options().isEmpty()) {
                where.add(cb.isTrue(root.get("hasVariants")));
                where.add(cb.exists(combination(root, query, cb, f)));
            }
            return cb.and(where.toArray(Predicate[]::new));
        };
    }

    /**
     * A combination of the product that carries one of the wanted values on
     * every narrowed axis — and has stock, when only in-stock products are
     * wanted. One row has to satisfy all of it: "M" in stock and "sea green" in
     * stock on different rows does not make an M in sea green one can buy.
     *
     * <p>An axis is found by name, and its position on that product says which
     * of the row's two value slots holds it: "Size" may be the first axis of one
     * product and the second of another.
     */
    private static Subquery<Long> combination(Root<Product> product, CriteriaQuery<?> query,
                                              CriteriaBuilder cb, ProductFilter f) {
        Subquery<Long> sub = query.subquery(Long.class);
        Root<ProductVariant> row = sub.from(ProductVariant.class);
        List<Predicate> where = new ArrayList<>();
        where.add(cb.equal(row.get("product"), product));
        if (f.inStock()) where.add(cb.greaterThan(row.get("quantity"), 0));

        for (Map.Entry<String, List<String>> wanted : f.options().entrySet()) {
            Root<ProductOption> axis = sub.from(ProductOption.class);
            where.add(cb.equal(axis.get("product"), product));
            where.add(cb.equal(cb.lower(axis.get("name")), lower(wanted.getKey())));
            Expression<String> value = cb.<String>selectCase()
                .when(cb.equal(axis.get("position"), 1), row.<String>get("value1"))
                .otherwise(row.<String>get("value2"));
            where.add(cb.or(wanted.getValue().stream()
                .map(v -> cb.equal(cb.lower(value), lower(v)))
                .toArray(Predicate[]::new)));
        }
        return sub.select(row.<Long>get("id")).where(where.toArray(Predicate[]::new));
    }

    private static String lower(String s) {
        return s.toLowerCase(Locale.ROOT);
    }

    /** Escapes LIKE's wildcards (and the escape character itself). */
    static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
