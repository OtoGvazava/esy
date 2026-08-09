package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.DeliveryOptionRepository;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Where delivery money sits (decision D9, with the pass-through reading).
 *
 * <p>Three figures have to stay distinct and they are easy to conflate:
 * <ul>
 *   <li>{@code total} — what the shopper was charged, delivery included,
 *       because that is what the payment provider collects.</li>
 *   <li>{@code revenue()} — the merchant's earnings, delivery excluded: a
 *       courier charge passes through them rather than to them.</li>
 *   <li>{@code serviceFee} — commission on goods only, so a merchant is never
 *       billed a percentage of money they hand straight on.</li>
 * </ul>
 */
@SpringBootTest
class OrderDeliveryMoneyTest {

    @Autowired OrderService orderService;
    @Autowired DeliveryService deliveryService;
    @Autowired TenantRepository tenantRepository;
    @Autowired OrderRepository orderRepository;
    @Autowired DeliveryOptionRepository deliveryRepository;

    @MockBean TenantContextService tenantContextService;

    private static final String SUB = "order-delivery-store";
    private Tenant tenant;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant fresh = new Tenant();
            fresh.setName("Order Delivery Store");
            fresh.setSubdomain(SUB);
            fresh.setIsActive(true);
            return tenantRepository.save(fresh);
        });
        orderRepository.deleteAll(orderRepository.findByTenantOrderByCreatedAtDesc(tenant));
        deliveryRepository.deleteAll(deliveryRepository.findByTenant(tenant));
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
    }

    private CreateOrderRequest request(String route, String price, int qty) {
        CreateOrderRequest req = new CreateOrderRequest();
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(1L);
        item.setTitle("Thing");
        item.setPrice(new BigDecimal(price));
        item.setQuantity(qty);
        req.setItems(List.of(item));
        req.setDeliveryRoute(route);

        CreateOrderRequest.InlineAddress a = new CreateOrderRequest.InlineAddress();
        a.setRecipient("Nino");
        a.setPhone("+995555000000");
        a.setLine("1 Rustaveli");
        a.setCity("Tbilisi");
        req.setAddress(a);
        return req;
    }

    private void courierAt(String price) {
        deliveryService.update("TBILISI", Map.of("enabled", true, "price", price));
    }

    @Test
    @Transactional
    void theShopperIsChargedGoodsPlusDeliveryButRevenueCountsGoodsOnly() {
        courierAt("5.00");
        Order order = orderService.createOrder(null, tenant, request("TBILISI", "100.00", 1));

        assertThat(order.getTotal()).isEqualByComparingTo("105.00");
        assertThat(order.getDeliveryFee()).isEqualByComparingTo("5.00");
        assertThat(order.getDeliveryRoute()).isEqualTo("TBILISI");

        // The courier's 5 is not the merchant's money.
        assertThat(orderService.revenue(tenant)).isEqualByComparingTo("100.00");
    }

    @Test
    @Transactional
    void commissionIsChargedOnGoodsNotOnDelivery() {
        courierAt("40.00");
        Order order = orderService.createOrder(null, tenant, request("TBILISI", "100.00", 1));

        // 2% of 100, not of 140 — the merchant never keeps the 40.
        assertThat(order.getServiceFee()).isEqualByComparingTo("2.00");
    }

    @Test
    @Transactional
    void aFreeOverThresholdReachesTheOrder() {
        deliveryService.update("TBILISI", Map.of(
            "enabled", true, "price", "5.00", "freeOverTotal", "50.00"));
        Order order = orderService.createOrder(null, tenant, request("TBILISI", "60.00", 1));

        assertThat(order.getDeliveryFee()).isEqualByComparingTo("0");
        assertThat(order.getTotal()).isEqualByComparingTo("60.00");
    }

    @Test
    @Transactional
    void collectingInPersonCostsNothingAndKeepsNoAddress() {
        Order order = orderService.createOrder(null, tenant, request("PICKUP", "80.00", 1));

        assertThat(order.getDeliveryFee()).isEqualByComparingTo("0");
        assertThat(order.getTotal()).isEqualByComparingTo("80.00");
        // Nothing is being posted, so no address is frozen even though the
        // request carried one.
        assertThat(order.getShipLine()).isNull();
        assertThat(order.getShipCity()).isNull();
    }

    @Test
    @Transactional
    void aCourierOrderStillFreezesTheAddress() {
        courierAt("5.00");
        Order order = orderService.createOrder(null, tenant, request("TBILISI", "10.00", 1));
        assertThat(order.getShipLine()).isEqualTo("1 Rustaveli");
        assertThat(order.getShipCity()).isEqualTo("Tbilisi");
    }

    @Test
    @Transactional
    void theBrowserCannotDictateTheDeliveryPrice() {
        // The shopper picks a route; the fee comes from the store's own row.
        courierAt("7.50");
        Order order = orderService.createOrder(null, tenant, request("TBILISI", "20.00", 1));
        assertThat(order.getDeliveryFee()).isEqualByComparingTo("7.50");
    }

    @Test
    @Transactional
    void aRouteTheStoreDoesNotOfferIsRefusedAtCheckout() {
        assertThatThrownBy(() -> orderService.createOrder(null, tenant, request("EXPRESS", "20.00", 1)))
            .hasMessageContaining("not offered");
    }

    @Test
    @Transactional
    void ordersPredatingDeliveryAreCountedAsGoodsOnly() {
        // A null fee is what every existing production order has.
        Order legacy = orderService.createOrder(null, tenant, request("PICKUP", "30.00", 1));
        legacy.setDeliveryFee(null);
        legacy.setDeliveryRoute(null);
        orderRepository.save(legacy);

        assertThat(orderService.revenue(tenant)).isEqualByComparingTo("30.00");
    }

    @Test
    @Transactional
    void refundedAndCancelledOrdersStayOutOfRevenue() {
        courierAt("5.00");
        Order refunded = orderService.createOrder(null, tenant, request("TBILISI", "100.00", 1));
        refunded.setPaymentStatus(Order.PaymentStatus.REFUNDED);
        orderRepository.save(refunded);

        Order cancelled = orderService.createOrder(null, tenant, request("TBILISI", "70.00", 1));
        cancelled.setStatus(Order.Status.CANCELLED);
        orderRepository.save(cancelled);

        assertThat(orderService.revenue(tenant)).isEqualByComparingTo("0");
    }
}
