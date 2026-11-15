package com.esyback.ecommerce.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Order numbers come from a space large enough not to collide (review H10):
 * the old ESY-nnnn-n had ~72,000 values under a platform-wide unique key.
 */
@SpringBootTest
class OrderNumberTest {

    @Autowired OrderService orderService;

    @Test
    @DisplayName("numbers look like ESY-XXXX-XXXX with no easily-confused characters")
    void shape() {
        for (int i = 0; i < 200; i++) {
            assertThat(orderService.newOrderNumber())
                .matches("ESY-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}");
        }
    }

    @Test
    @DisplayName("20,000 numbers in a row do not repeat (the old scheme collided at ~320)")
    void noEarlyCollisions() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 20_000; i++) {
            assertThat(seen.add(orderService.newOrderNumber())).isTrue();
        }
    }
}
