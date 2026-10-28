package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Who may read one order.
 *
 * <p>The storefront gained a detail screen, which means an order is now
 * fetchable by its number — and order numbers are short and sequential enough
 * to try. The rule being pinned here is that someone else's order is reported
 * as missing rather than forbidden: a 403 would confirm it exists, which is
 * precisely the fact an enumerating caller is after.
 */
@SpringBootTest
class ShopperOrderAccessTest {

    @Autowired OrderService orderService;
    @Autowired TenantRepository tenantRepository;
    @Autowired OrderRepository orderRepository;
    @Autowired UserRepository userRepository;

    @MockBean TenantContextService tenantContextService;

    private static final String SUB = "shopper-access-store";
    private Tenant tenant;
    private User buyer;
    private User stranger;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant fresh = new Tenant();
            fresh.setName("Shopper Access Store");
            fresh.setSubdomain(SUB);
            fresh.setIsActive(true);
            return tenantRepository.save(fresh);
        });
        orderRepository.deleteAll(orderRepository.findByTenantOrderByCreatedAtDesc(tenant));
        buyer = account("buyer@esy.test");
        stranger = account("stranger@esy.test");
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
    }

    private User account(String email) {
        return userRepository.findByUsername(email).orElseGet(() -> {
            User u = new User();
            u.setUsername(email);
            u.setEmail(email);
            u.setIsActive(true);
            return userRepository.save(u);
        });
    }

    private Order placeOrder(User who) {
        CreateOrderRequest req = new CreateOrderRequest();
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(1L);
        item.setTitle("Ceramic mug");
        item.setPrice(new BigDecimal("24.00"));
        item.setQuantity(2);
        req.setItems(List.of(item));

        CreateOrderRequest.InlineAddress a = new CreateOrderRequest.InlineAddress();
        a.setRecipient("Nino");
        a.setPhone("+995555000000");
        a.setLine("1 Rustaveli");
        a.setCity("Tbilisi");
        req.setAddress(a);
        return orderService.createOrder(who, tenant, req);
    }

    @Test
    @Transactional
    @DisplayName("a shopper can read their own order, with its lines")
    void ownerCanRead() {
        Order placed = placeOrder(buyer);

        Order found = orderService.orderForShopper(placed.getOrderNumber(), buyer);

        assertThat(found.getId()).isEqualTo(placed.getId());
        // The lines are the whole reason the endpoint exists: the list only
        // ever carried a count.
        assertThat(found.getItems()).hasSize(1);
        assertThat(found.getItems().get(0).getTitle()).isEqualTo("Ceramic mug");
        assertThat(found.getItems().get(0).getQuantity()).isEqualTo(2);
    }

    @Test
    @Transactional
    @DisplayName("someone else's order reads as missing, not as forbidden")
    void strangerGetsNotFound() {
        Order placed = placeOrder(buyer);

        assertThatThrownBy(() -> orderService.orderForShopper(placed.getOrderNumber(), stranger))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    @Transactional
    @DisplayName("an anonymous caller cannot read an order by guessing its number")
    void nullUserGetsNotFound() {
        Order placed = placeOrder(buyer);

        assertThatThrownBy(() -> orderService.orderForShopper(placed.getOrderNumber(), null))
            .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    @Transactional
    @DisplayName("an order number that does not exist is also just missing")
    void unknownNumberGetsNotFound() {
        assertThatThrownBy(() -> orderService.orderForShopper("ESY-NOPE-0000", buyer))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND));
    }
}
