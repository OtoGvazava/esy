package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Order texts go to the account's verified phone only (review M5). */
class OrderSmsRecipientTest {

    private static Order order(User u, String shipPhone) {
        Order o = new Order();
        o.setUser(u);
        o.setShipPhone(shipPhone);
        return o;
    }

    private static User account(String phone, boolean verified) {
        User u = new User();
        u.setPhoneNumber(phone);
        u.setPhoneVerified(verified);
        return u;
    }

    @Test
    @DisplayName("the typed delivery phone is never texted; the verified account phone is")
    void verifiedAccountOnly() {
        assertThat(OrderService.recipientPhone(order(account("+995 555 11 22 33", true), "+44 7911 123456")))
            .isEqualTo("+995 555 11 22 33");
    }

    @Test
    @DisplayName("no verified phone, or no account, means no text")
    void otherwiseNobody() {
        assertThat(OrderService.recipientPhone(order(account("+995 555 11 22 33", false), "+995 599 00 00 00"))).isNull();
        assertThat(OrderService.recipientPhone(order(null, "+995 599 00 00 00"))).isNull();
    }
}
