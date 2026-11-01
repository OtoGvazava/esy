package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.security.JwtUtil;
import com.esyback.ecommerce.service.EmailSender;
import com.esyback.ecommerce.service.MembershipService;
import com.esyback.ecommerce.service.OrderService;
import com.esyback.ecommerce.service.SmsSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * One order as the back office reads and moves it (M3, M4).
 *
 * <p>The detail screen used to work out esy's fee as 2% of the whole total in
 * the browser — delivery included, which the server never charges commission
 * on — and could not say how the order was delivered, who bought it or which
 * bank payment it was. These pin the figures the server now hands it, the ship
 * step's preview of what the shopper will be told, and its two switches.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrderOfficeTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;
    @Autowired TenantRepository tenantRepository;
    @Autowired ProductRepository productRepository;
    @Autowired OrderRepository orderRepository;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired MembershipService membershipService;
    @Autowired OrderService orderService;

    // The real senders would try the network; these stand in and report
    // whether the platform is sending at all.
    @MockBean SmsSender sms;
    @MockBean EmailSender email;

    private static final String SUB = "office-orders";
    private static final String STORE = SUB + ".lvh.me";
    private static final String OWNER = "owner-office@esy.test";
    private static final String BUYER = "buyer-office@esy.test";

    private Tenant tenant;
    private User buyer;

    @BeforeEach
    void setUp() {
        tenant = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Office Orders");
            t.setSubdomain(SUB);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
        User owner = user(OWNER, "Nino", "Beridze", null);
        membershipService.ensure(owner, tenant, StoreMembership.Role.OWNER);
        buyer = user(BUYER, "Ana", "Maisuradze", "+995577442108");
        when(sms.isSending()).thenReturn(true);
        when(email.isSending()).thenReturn(false);
    }

    private User user(String address, String first, String last, String phone) {
        return userRepository.findByUsername(address).orElseGet(() -> {
            User u = new User();
            u.setUsername(address);
            u.setEmail(address);
            u.setFirstName(first);
            u.setLastName(last);
            u.setPhoneNumber(phone);
            u.setIsActive(true);
            u.setPhoneVerified(true);
            u.addRole(roleRepository.findByName("USER").orElseThrow());
            return userRepository.save(u);
        });
    }

    /** A 95 ₾ vase, paid by card and going out by express courier at 12 ₾. */
    private Order courierOrder() {
        Product p = new Product();
        p.setTenant(tenant);
        p.setTitle("Clay vase");
        p.setImageUrl("/api/products/images/vase.jpg");
        p.setPrice(new BigDecimal("95.00"));
        p.setQuantity(10);
        p = productRepository.save(p);

        CreateOrderRequest req = new CreateOrderRequest();
        CreateOrderRequest.Item item = new CreateOrderRequest.Item();
        item.setProductId(p.getId());
        item.setQuantity(1);
        req.setItems(List.of(item));
        Order o = orderService.createOrder(buyer, tenant, req);
        // The courier route and the card payment, as checkout and BOG leave
        // them; this store has no courier configured to buy them through.
        o.setDeliveryRoute("tbilisi");
        o.setDeliveryExpress(true);
        o.setDeliveryFee(new BigDecimal("12.00"));
        o.setTotal(new BigDecimal("107.00"));
        o.setShipRecipient("Ana Maisuradze");
        o.setShipPhone("+995577442108");
        o.setShipLine("Chavchavadze 37, apt 12");
        o.setShipCity("Tbilisi");
        o.setPaymentStatus(Order.PaymentStatus.PAID);
        o.setBogOrderId("8f2c11c3-5a7e-4d0b-9c41-2e6f0a9b7d15");
        return orderRepository.save(o);
    }

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken(OWNER);
    }

    @Test
    @DisplayName("the detail carries delivery, esy's frozen fee, the bank's id and the buyer")
    void detailFigures() throws Exception {
        Order o = courierOrder();
        mvc.perform(get("/api/tenant/orders/" + o.getId()).header("Host", STORE).header("Authorization", bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.deliveryRoute").value("tbilisi"))
            .andExpect(jsonPath("$.deliveryExpress").value(true))
            .andExpect(jsonPath("$.deliveryFee").value(12.0))
            // 2% of the goods (95), not of the 107 the buyer paid: delivery is
            // a courier's money and carries no commission.
            .andExpect(jsonPath("$.serviceFee").value(1.9))
            .andExpect(jsonPath("$.bogOrderId").value("8f2c11c3-5a7e-4d0b-9c41-2e6f0a9b7d15"))
            .andExpect(jsonPath("$.buyer.firstName").value("Ana"))
            .andExpect(jsonPath("$.buyer.email").value(BUYER))
            .andExpect(jsonPath("$.buyer.phone").value("+995577442108"))
            // The line's photo, and the moment it was placed with its zone.
            .andExpect(jsonPath("$.lines[0].image").value("/api/products/images/vase.jpg"))
            .andExpect(jsonPath("$.placedAt").value(org.hamcrest.Matchers.endsWith("Z")));
    }

    @Test
    @DisplayName("the ship step previews the SMS and email the shopper would get")
    void noticePreview() throws Exception {
        Order o = courierOrder();
        mvc.perform(get("/api/tenant/orders/" + o.getId() + "/notice").param("status", "shipped")
                .header("Host", STORE).header("Authorization", bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SHIPPED"))
            .andExpect(jsonPath("$.sms.to").value("+995577442108"))
            .andExpect(jsonPath("$.sms.text").value(containsString(o.getOrderNumber())))
            .andExpect(jsonPath("$.sms.sending").value(true))
            .andExpect(jsonPath("$.email.to").value(BUYER))
            .andExpect(jsonPath("$.email.subject").value(containsString(o.getOrderNumber())))
            // No key, or the master switch off: the screen must not promise it.
            .andExpect(jsonPath("$.email.sending").value(false));

        // A cancellation is never texted, so its preview has no SMS at all.
        mvc.perform(get("/api/tenant/orders/" + o.getId() + "/notice").param("status", "CANCELLED")
                .header("Host", STORE).header("Authorization", bearer()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sms").value(nullValue()))
            .andExpect(jsonPath("$.email.to").value(BUYER));
    }

    @Test
    @DisplayName("the ship step's switches hold a message back, and leaving them out sends both")
    void notifySwitches() throws Exception {
        Order o = courierOrder();
        clearInvocations(sms, email);
        mvc.perform(patch("/api/tenant/orders/" + o.getId() + "/status")
                .header("Host", STORE).header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SHIPPED\",\"sms\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("shipped"));
        verify(sms, never()).send(anyString(), anyString());
        verify(email).send(eq(BUYER), anyString(), anyString());

        clearInvocations(sms, email);
        mvc.perform(patch("/api/tenant/orders/" + o.getId() + "/status")
                .header("Host", STORE).header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"OUT_FOR_DELIVERY\"}"))
            .andExpect(status().isOk());
        verify(sms).send(eq("+995577442108"), anyString());
        verify(email).send(eq(BUYER), anyString(), anyString());
    }
}
