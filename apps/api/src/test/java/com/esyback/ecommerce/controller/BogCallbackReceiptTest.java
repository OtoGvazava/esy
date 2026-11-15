package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.service.BogPaymentService;
import com.esyback.ecommerce.service.OrderService;
import com.esyback.ecommerce.service.TenantContextService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Without BOG_PUBLIC_KEY a callback body is never believed: the order settles
 * from BOG's receipt, so a forged body settles nothing while a real payment
 * (or refund) whose shopper never came back still does.
 */
@SpringBootTest
@AutoConfigureMockMvc
class BogCallbackReceiptTest {

    @Autowired MockMvc mvc;
    @Autowired OrderService orderService;
    @Autowired OrderRepository orderRepository;
    @Autowired ProductRepository productRepository;
    @Autowired TenantRepository tenantRepository;

    @MockitoBean BogPaymentService bog;
    @MockitoBean TenantContextService tenantContextService;

    private static final String SUB = "callback-receipt-store";
    private Tenant tenant;
    private Product mug;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Callback Receipt Store");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        when(tenantContextService.getCurrentTenant()).thenReturn(tenant);
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle("Mug");
        p.setDescription("Mug");
        p.setPrice(new BigDecimal("24.00"));
        p.setQuantity(5);
        mug = productRepository.save(p);
        when(bog.hasCallbackKey()).thenReturn(false);
        when(bog.mapStatus(any())).thenCallRealMethod();
    }

    private Order pendingCardOrder() {
        CreateOrderRequest req = new CreateOrderRequest();
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(mug.getId());
        item.setTitle(mug.getTitle());
        item.setPrice(mug.getPrice());
        item.setQuantity(1);
        req.setItems(List.of(item));
        Order order = orderService.createOrder(null, tenant, req);
        return orderService.markBogPending(order, "bog-" + order.getOrderNumber());
    }

    private void callback(Order o, String key) throws Exception {
        String body = "{\"body\":{\"order_id\":\"" + o.getBogOrderId() + "\",\"external_order_id\":\""
            + o.getOrderNumber() + "\",\"order_status\":{\"key\":\"" + key + "\"}}}";
        mvc.perform(post("/api/payments/bog/callback").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());
    }

    private Order reload(Order o) {
        return orderRepository.findById(o.getId()).orElseThrow();
    }

    @Test
    @DisplayName("no key: a forged 'completed' settles nothing when BOG's receipt says otherwise")
    void forgedBodyIsIgnored() throws Exception {
        Order o = pendingCardOrder();
        when(bog.fetchReceiptStatus(any(), eq(o.getBogOrderId()))).thenReturn(Optional.empty());

        callback(o, "completed");

        assertThat(reload(o).getPaymentStatus()).isEqualTo(Order.PaymentStatus.PENDING);
        verify(bog, never()).verifyCallbackSignature(any(), any());
    }

    @Test
    @DisplayName("no key: a real payment settles from BOG's receipt")
    void settlesFromReceipt() throws Exception {
        Order o = pendingCardOrder();
        when(bog.fetchReceiptStatus(any(), eq(o.getBogOrderId()))).thenReturn(Optional.of(Order.PaymentStatus.PAID));

        callback(o, "completed");

        assertThat(reload(o).getPaymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
    }

    @Test
    @DisplayName("with a key: a bad signature is refused with 401")
    void keyedBadSignatureRefused() throws Exception {
        Order o = pendingCardOrder();
        when(bog.hasCallbackKey()).thenReturn(true);
        when(bog.verifyCallbackSignature(any(), any())).thenReturn(false);

        mvc.perform(post("/api/payments/bog/callback").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isUnauthorized());
        assertThat(reload(o).getPaymentStatus()).isEqualTo(Order.PaymentStatus.PENDING);
    }

    @Test
    @DisplayName("a failure while settling asks BOG to retry (503); a body that does not parse is acknowledged (M32)")
    void transientFailureIsRetried() throws Exception {
        Order o = pendingCardOrder();
        when(bog.fetchReceiptStatus(any(), eq(o.getBogOrderId())))
            .thenThrow(new RuntimeException("database hiccup"));
        String body = "{\"body\":{\"order_id\":\"" + o.getBogOrderId() + "\",\"external_order_id\":\""
            + o.getOrderNumber() + "\",\"order_status\":{\"key\":\"completed\"}}}";
        mvc.perform(post("/api/payments/bog/callback").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isServiceUnavailable());

        mvc.perform(post("/api/payments/bog/callback").contentType(MediaType.APPLICATION_JSON).content("{not json"))
            .andExpect(status().isOk());
    }
}
