package com.esyback.ecommerce.service;

import com.esyback.ecommerce.web.ApiRefusal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Every way a price is saved refuses one the column cannot hold, with a 400, not a 500. */
class ProductPriceLimitTest {

    @Test
    @DisplayName("up to 99,999,999.99 is a price; more digits, or a third decimal, is refused")
    void limits() {
        assertThat(ProductService.checkedPrice(new BigDecimal("99999999.99"))).isEqualByComparingTo("99999999.99");
        assertThat(ProductService.checkedPrice(new BigDecimal("24.500"))).isEqualByComparingTo("24.5");
        assertThat(ProductService.checkedPrice(null)).isNull();
        // Zero and below too: a negative variant price made a negative order total.
        for (String bad : new String[] {"100000000", "1e50", "24.999", "0", "0.00", "-5.00"}) {
            assertThatThrownBy(() -> ProductService.checkedPrice(new BigDecimal(bad)))
                .as(bad).isInstanceOf(ApiRefusal.class);
        }
    }
}
