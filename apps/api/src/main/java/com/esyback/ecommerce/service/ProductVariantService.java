package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductOption;
import com.esyback.ecommerce.entity.ProductVariant;
import com.esyback.ecommerce.repository.ProductOptionRepository;
import com.esyback.ecommerce.repository.ProductVariantRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * Product variants (decision D11) — one or two axes, and stock on the
 * combination rather than on the product.
 *
 * <p>The axes and their rows are written together, as one document, rather
 * than row by row. Editing a variant table is a single act in the interface:
 * the merchant adds a size, which creates a row per colour, and saves. A
 * per-row API would let an interrupted save leave a half-built grid that
 * neither the storefront nor the editor could read sensibly.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ProductVariantService {

    private final ProductOptionRepository optionRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductRepository productRepository;

    /** A grid nobody could fill in is a design failure, so it is refused. */
    private static final int MAX_VALUES_PER_AXIS = 40;
    private static final int MAX_ROWS = 200;

    @Transactional(readOnly = true)
    public Map<String, Object> read(Product product) {
        List<ProductOption> axes = optionRepository.findByProductOrderByPositionAsc(product);
        if (!product.variantsEnabled() || axes.isEmpty()) return null;

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("axes", axes.stream().map(ProductVariantService::axisMap).toList());
        out.put("rows", variantRepository.findByProductOrderByIdAsc(product).stream()
            .map(ProductVariantService::rowMap).toList());
        return out;
    }

    /**
     * Replace a product's whole variant document.
     *
     * <p>Body: {@code {axes:[{name, values:[]}], rows:[{key:[], price?, stock}]}}.
     * Passing no axes turns variants off and hands stock back to the product.
     */
    public Map<String, Object> replace(Product product, Map<String, Object> body) {
        List<Map<String, Object>> axesIn = listOf(body.get("axes"));

        if (axesIn.isEmpty()) {
            disable(product);
            return null;
        }
        if (axesIn.size() > ProductOption.MAX_AXES) {
            throw bad("A product may vary on at most " + ProductOption.MAX_AXES
                + " axes — a third produces a table nobody fills in");
        }

        // Keep the stock the merchant already recorded: they are editing a
        // grid, not retyping it, and a save that silently zeroed every count
        // would be indistinguishable from selling out.
        Map<String, Integer> stockBefore = new LinkedHashMap<>();
        for (ProductVariant existing : variantRepository.findByProductOrderByIdAsc(product)) {
            stockBefore.put(keyOf(existing.getValue1(), existing.getValue2()),
                existing.getQuantity() == null ? 0 : existing.getQuantity());
        }

        List<List<String>> axisValues = new ArrayList<>();
        optionRepository.deleteByProduct(product);
        optionRepository.flush();

        for (int i = 0; i < axesIn.size(); i++) {
            Map<String, Object> raw = axesIn.get(i);
            String name = str(raw.get("name"));
            if (name == null) throw bad("Every axis needs a name");

            // A duplicated value would produce two identical columns and, with
            // the unique constraint, a save that fails halfway.
            List<String> values = new ArrayList<>(new LinkedHashSet<>(
                listOfStrings(raw.get("values"))));
            if (values.isEmpty()) throw bad("Axis \"" + name + "\" has no values");
            if (values.size() > MAX_VALUES_PER_AXIS) {
                throw bad("Axis \"" + name + "\" has more than " + MAX_VALUES_PER_AXIS + " values");
            }

            ProductOption axis = new ProductOption();
            axis.setProduct(product);
            axis.setName(name);
            axis.setPosition(i + 1);
            axis.setValuesText(String.join("\n", values));
            optionRepository.save(axis);
            axisValues.add(values);
        }

        long combinations = axisValues.stream().mapToLong(List::size).reduce(1L, (a, b) -> a * b);
        if (combinations > MAX_ROWS) {
            throw bad("That is " + combinations + " combinations — more than the "
                + MAX_ROWS + " a merchant can reasonably keep stocked");
        }

        // Rows the caller sent, by combination, so the full grid below can pick
        // up an explicit price or stock where one was given.
        Map<String, Map<String, Object>> sent = new LinkedHashMap<>();
        for (Map<String, Object> row : listOf(body.get("rows"))) {
            List<String> key = listOfStrings(row.get("key"));
            if (key.isEmpty()) continue;
            sent.put(keyOf(key.get(0), key.size() > 1 ? key.get(1) : ""), row);
        }

        variantRepository.deleteByProduct(product);
        variantRepository.flush();

        // The grid is generated from the axes rather than trusted from the
        // caller: every combination must exist, or the storefront's
        // availability check has holes it would read as "out of stock".
        int total = 0;
        List<String> first = axisValues.get(0);
        List<String> second = axisValues.size() > 1 ? axisValues.get(1) : List.of("");
        for (String v1 : first) {
            for (String v2 : second) {
                String key = keyOf(v1, v2);
                Map<String, Object> row = sent.get(key);
                ProductVariant variant = new ProductVariant();
                variant.setProduct(product);
                variant.setValue1(v1);
                variant.setValue2(v2);
                variant.setPrice(row == null ? null : money(row.get("price")));

                Integer stock = row == null ? null : intOf(row.get("stock"));
                if (stock == null) stock = stockBefore.get(key);
                variant.setQuantity(stock == null ? 0 : Math.max(0, stock));

                variantRepository.save(variant);
                total += variant.getQuantity();
            }
        }

        product.setHasVariants(true);
        product.setQuantity(total);
        productRepository.save(product);

        return read(product);
    }

    /** Turn variants off: the rows go, and the product owns its stock again. */
    public void disable(Product product) {
        variantRepository.deleteByProduct(product);
        optionRepository.deleteByProduct(product);
        product.setHasVariants(false);
        productRepository.save(product);
    }

    /** Recompute the product's cached total from its rows. */
    public int syncStock(Product product) {
        int total = variantRepository.findByProductOrderByIdAsc(product).stream()
            .mapToInt(v -> v.getQuantity() == null ? 0 : v.getQuantity()).sum();
        product.setQuantity(total);
        productRepository.save(product);
        return total;
    }

    /**
     * The row a shopper is buying. Refused when the product has variants and
     * the caller named none — checking out "a shirt" rather than a size would
     * take stock from nowhere in particular.
     */
    @Transactional(readOnly = true)
    public ProductVariant require(Product product, Long variantId) {
        if (!product.variantsEnabled()) return null;
        if (variantId == null) {
            throw bad("Choose an option before adding this to the basket");
        }
        return variantRepository.findByIdAndProduct(variantId, product)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "That combination is no longer available"));
    }

    // ------------------------------------------------------------------ maps

    private static Map<String, Object> axisMap(ProductOption axis) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", axis.getName());
        m.put("position", axis.getPosition());
        m.put("values", splitValues(axis.getValuesText()));
        return m;
    }

    private static Map<String, Object> rowMap(ProductVariant v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId());
        m.put("key", v.getValue2() == null || v.getValue2().isEmpty()
            ? List.of(v.getValue1()) : List.of(v.getValue1(), v.getValue2()));
        m.put("price", v.getPrice());
        m.put("stock", v.getQuantity() == null ? 0 : v.getQuantity());
        m.put("label", v.label());
        return m;
    }

    public static List<String> splitValues(String text) {
        if (text == null || text.isBlank()) return List.of();
        return Arrays.stream(text.split("\n")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    private static String keyOf(String v1, String v2) {
        return v1 + " " + (v2 == null ? "" : v2);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> listOf(Object o) {
        if (!(o instanceof List<?> list)) return List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object x : list) if (x instanceof Map<?, ?> m) out.add((Map<String, Object>) m);
        return out;
    }

    private static List<String> listOfStrings(Object o) {
        if (!(o instanceof List<?> list)) return List.of();
        List<String> out = new ArrayList<>();
        for (Object x : list) {
            String s = str(x);
            if (s != null) out.add(s);
        }
        return out;
    }

    private static String str(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        return s.isEmpty() ? null : s;
    }

    private static Integer intOf(Object o) {
        if (o == null) return null;
        try {
            return Integer.valueOf(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            throw bad("Not a whole number: " + o);
        }
    }

    private static BigDecimal money(Object o) {
        String s = str(o);
        if (s == null) return null;
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            throw bad("Not a valid price: " + o);
        }
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
