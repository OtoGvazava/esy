package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Order;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

/** Order times leave the server as instants, so every browser reads them right (review M6). */
class OrderTimeTest {

    @Test
    @DisplayName("placed is an ISO instant with Z, the same moment as the stored time")
    void placedIsAnInstant() {
        Order o = new Order();
        o.setStatus(Order.Status.PLACED);
        LocalDateTime at = LocalDateTime.of(2026, 11, 15, 0, 30);
        o.setCreatedAt(at);

        Object placed = OrderController.toMap(o).get("placed");

        assertThat(placed).isInstanceOf(String.class);
        assertThat((String) placed).endsWith("Z");
        assertThat(Instant.parse((String) placed)).isEqualTo(at.atZone(ZoneId.systemDefault()).toInstant());
    }
}
