package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.ProductDto;
import com.esyback.ecommerce.entity.Product;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** A product save applies only the stock change the merchant typed (review M17). */
class ProductStockEditTest {

    private static Product withStock(Integer q) {
        Product p = new Product();
        p.setQuantity(q);
        p.setHasVariants(false);
        return p;
    }

    private static ProductDto sent(Integer quantity, Integer was) {
        ProductDto d = new ProductDto();
        d.setQuantity(quantity);
        d.setQuantityWas(was);
        return d;
    }

    @Test
    @DisplayName("a typo fix leaves sales made meanwhile alone")
    void untouchedStockStands() {
        // Opened at 10, 3 sold since, the merchant only fixed the title.
        assertThat(ProductService.stockAfterEdit(withStock(7), sent(10, 10))).isEqualTo(7);
    }

    @Test
    @DisplayName("a typed change is applied on top of what is there now")
    void changeIsADelta() {
        // Opened at 10, 3 sold, merchant typed 15 (+5): 7 + 5.
        assertThat(ProductService.stockAfterEdit(withStock(7), sent(15, 10))).isEqualTo(12);
        // Never below zero.
        assertThat(ProductService.stockAfterEdit(withStock(1), sent(0, 10))).isZero();
    }

    @Test
    @DisplayName("an older client without quantityWas sets the number as before")
    void legacyClientSets() {
        assertThat(ProductService.stockAfterEdit(withStock(7), sent(10, null))).isEqualTo(10);
    }
}
