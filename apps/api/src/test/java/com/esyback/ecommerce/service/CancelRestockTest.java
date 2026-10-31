package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductVariant;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.ProductVariantRepository;
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
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * A cancelled order puts its goods back on the shelf (the back office's M7).
 *
 * <p>The cancel dialog promises the merchant that the items return to stock,
 * so these pin what that means: what was taken comes back, to the row it came
 * from, exactly once — and an order that never took anything gives nothing
 * back, because inventing stock oversells it.
 *
 * <p>Every order here is a pickup by a guest or an account with no phone, so
 * nothing is texted; with no email key configured nothing is mailed either.
 */
@SpringBootTest
class CancelRestockTest {

    @Autowired OrderService orderService;
    @Autowired ProductVariantService variantService;
    @Autowired ProductRepository productRepository;
    @Autowired ProductVariantRepository variantRepository;
    @Autowired TenantRepository tenantRepository;
    @Autowired OrderRepository orderRepository;
    @Autowired UserRepository userRepository;

    @MockBean TenantContextService tenantContextService;

    private static final String SUB = "cancel-restock-store";
    private Tenant tenant;
    private Product mug;
    private Product boots;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Cancel Restock Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);

        mug = product("Mug", "24.00", 5);

        boots = product("Boots", "180.00", 0);
        variantService.replace(boots, Map.of(
            "axes", List.of(Map.of("name", "Size", "values", List.of("38", "40"))),
            "rows", List.of(
                Map.of("key", List.of("38"), "stock", 2),
                Map.of("key", List.of("40"), "stock", 5))));
        boots = productRepository.findById(boots.getId()).orElseThrow();
    }

    private Product product(String title, String price, int stock) {
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle(title);
        p.setDescription(title);
        p.setPrice(new BigDecimal(price));
        p.setQuantity(stock);
        return productRepository.save(p);
    }

    private int stock(Product p) {
        return productRepository.findById(p.getId()).orElseThrow().getQuantity();
    }

    private ProductVariant size(String value) {
        return variantRepository.findByProductOrderByIdAsc(boots).stream()
            .filter(v -> value.equals(v.getValue1())).findFirst().orElseThrow();
    }

    private CreateOrderRequest request(Product p, ProductVariant v, int qty) {
        CreateOrderRequest req = new CreateOrderRequest();
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(p.getId());
        item.setVariantId(v == null ? null : v.getId());
        item.setTitle(p.getTitle());
        item.setPrice(p.getPrice());
        item.setQuantity(qty);
        req.setItems(List.of(item));
        req.setDeliveryRoute("pickup");
        return req;
    }

    /** The free flow: placed, and its stock taken at once (D3). */
    private Order freeOrder(User who, Product p, ProductVariant v, int qty) {
        Order order = orderService.createOrder(who, tenant, request(p, v, qty));
        orderService.commitFreeOrderStock(order);
        return orderRepository.findById(order.getId()).orElseThrow();
    }

    /** The card flow up to the bank's page: nothing taken yet. */
    private Order cardOrder(Product p, int qty) {
        Order order = orderService.createOrder(null, tenant, request(p, null, qty));
        return orderService.markBogPending(order, "bog-" + order.getOrderNumber());
    }

    private Order cancel(Order order) {
        return orderService.updateStatus(tenant, order.getId(), Order.Status.CANCELLED);
    }

    @Test
    @Transactional
    @DisplayName("cancelling a free order puts its stock back")
    void freeOrderRestocks() {
        Order order = freeOrder(null, mug, null, 2);
        assertThat(stock(mug)).isEqualTo(3);

        Order after = cancel(order);

        assertThat(after.getStatus()).isEqualTo(Order.Status.CANCELLED);
        assertThat(after.getStockCommitted()).isFalse();
        assertThat(stock(mug)).isEqualTo(5);
    }

    @Test
    @Transactional
    @DisplayName("a variant goes back to its own combination, not to the product")
    void variantRestocksItsRow() {
        Order order = freeOrder(null, boots, size("38"), 2);
        assertThat(size("38").getQuantity()).isZero();

        cancel(order);

        assertThat(size("38").getQuantity()).isEqualTo(2);
        assertThat(size("40").getQuantity()).isEqualTo(5);
        // The cached total follows the rows.
        assertThat(stock(boots)).isEqualTo(7);
    }

    @Test
    @Transactional
    @DisplayName("re-saving the variant grid does not lose the way back")
    void regridStillRestocks() {
        Order order = freeOrder(null, boots, size("38"), 1);
        Long soldFrom = size("38").getId();

        // Saving the grid recreates every row with a new id, keeping the counts.
        variantService.replace(productRepository.findById(boots.getId()).orElseThrow(), Map.of(
            "axes", List.of(Map.of("name", "Size", "values", List.of("38", "40")))));
        assertThat(size("38").getId()).isNotEqualTo(soldFrom);
        assertThat(size("38").getQuantity()).isEqualTo(1);

        cancel(order);

        assertThat(size("38").getQuantity()).isEqualTo(2);
    }

    @Test
    @Transactional
    @DisplayName("only what was taken comes back after an oversell")
    void oversellReturnsWhatWasTaken() {
        Product last = product("Vase", "95.00", 2);
        Order order = freeOrder(null, last, null, 5);
        // commitStock floors at zero rather than going negative...
        assertThat(stock(last)).isZero();
        assertThat(order.getItems().get(0).getStockTaken()).isEqualTo(2);

        cancel(order);

        // ...so the two that left come back, not the five that were ordered.
        assertThat(stock(last)).isEqualTo(2);
    }

    @Test
    @Transactional
    @DisplayName("a shipped order can still be cancelled, and restocks")
    void shippedOrderRestocks() {
        Order order = freeOrder(null, mug, null, 1);
        orderService.updateStatus(tenant, order.getId(), Order.Status.SHIPPED);

        cancel(order);

        assertThat(stock(mug)).isEqualTo(5);
    }

    @Test
    @Transactional
    @DisplayName("a second cancel is refused and restocks nothing")
    void secondCancelChangesNothing() {
        Order order = freeOrder(null, mug, null, 2);
        cancel(order);

        assertThatThrownBy(() -> cancel(order))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT));
        assertThat(stock(mug)).isEqualTo(5);
    }

    @Test
    @Transactional
    @DisplayName("a delivered order cannot be cancelled, and keeps its stock taken")
    void deliveredOrderStays() {
        Order order = freeOrder(null, mug, null, 2);
        orderService.updateStatus(tenant, order.getId(), Order.Status.SHIPPED);
        orderService.updateStatus(tenant, order.getId(), Order.Status.OUT_FOR_DELIVERY);
        orderService.updateStatus(tenant, order.getId(), Order.Status.DELIVERED);

        assertThatThrownBy(() -> cancel(order)).isInstanceOf(ResponseStatusException.class);
        assertThat(stock(mug)).isEqualTo(3);
    }

    @Test
    @Transactional
    @DisplayName("a paid card order gives its stock back")
    void paidCardOrderRestocks() {
        Order order = cardOrder(mug, 2);
        orderService.settlePayment(order.getOrderNumber(), Order.PaymentStatus.PAID);
        assertThat(stock(mug)).isEqualTo(3);

        Order after = cancel(order);

        assertThat(stock(mug)).isEqualTo(5);
        // The money is not touched: refunding is the owner's separate act (D2).
        assertThat(after.getPaymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
    }

    @Test
    @Transactional
    @DisplayName("an unpaid card order took nothing, and a payment after the cancel takes nothing")
    void cancelledBeforePaymentHoldsNoStock() {
        Order order = cardOrder(mug, 2);
        assertThat(stock(mug)).isEqualTo(5);

        cancel(order);
        assertThat(stock(mug)).isEqualTo(5);

        // The shopper finishes on the bank's page after the store cancelled.
        Order paid = orderService.settlePayment(order.getOrderNumber(), Order.PaymentStatus.PAID).orElseThrow();

        assertThat(paid.getPaymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
        assertThat(paid.getStatus()).isEqualTo(Order.Status.CANCELLED);
        assertThat(stock(mug)).isEqualTo(5);
    }

    @Test
    @Transactional
    @DisplayName("an order from before the flag restocks only when a payment proves it took stock")
    void legacyOrdersTrustOnlyAPayment() {
        // Paid before the flag existed: its stock left at PAID.
        Order paid = orderService.createOrder(null, tenant, request(mug, null, 2));
        paid.setStockCommitted(null);
        paid.setPaymentStatus(Order.PaymentStatus.PAID);
        orderRepository.save(paid);
        mug.setQuantity(3);
        productRepository.save(mug);

        cancel(paid);
        assertThat(stock(mug)).isEqualTo(5);

        // NONE is ambiguous for an old row — a card checkout whose bank call
        // failed is left NONE with nothing taken — so it is not restocked.
        Order unknown = orderService.createOrder(null, tenant, request(mug, null, 2));
        unknown.setStockCommitted(null);
        orderRepository.save(unknown);

        cancel(unknown);
        assertThat(stock(mug)).isEqualTo(5);
    }

    @Test
    @Transactional
    @DisplayName("a shopper cancelling their own free order restocks it too")
    void shopperCancelRestocks() {
        User shopper = userRepository.findByUsername("restock-shopper@esy.test").orElseGet(() -> {
            User u = new User();
            u.setUsername("restock-shopper@esy.test");
            u.setEmail("restock-shopper@esy.test");
            u.setIsActive(true);
            return userRepository.save(u);
        });
        Order order = freeOrder(shopper, mug, null, 2);
        assertThat(stock(mug)).isEqualTo(3);

        orderService.cancelByShopper(order.getOrderNumber(), shopper);

        assertThat(stock(mug)).isEqualTo(5);
    }
}
