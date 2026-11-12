package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.service.OrderService;
import com.esyback.ecommerce.service.TenantContextService;
import com.esyback.ecommerce.service.UserService;
import com.esyback.ecommerce.web.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final UserService userService;
    private final TenantContextService tenantContextService;
    private final ProductRepository productRepository;

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody CreateOrderRequest request,
                                                      Authentication authentication) {
        User user = currentUser(authentication);
        requireOrderEligible(user);
        Order order = orderService.createOrder(user, tenantContextService.getCurrentTenant(), request);
        // This endpoint IS the free flow (BOG stores checkout via
        // /api/payments/bog/checkout) — no payment will ever settle this
        // order, so stock commits at placement (decision D3, free path).
        orderService.commitFreeOrderStock(order);
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(order));
    }

    /**
     * The shopper's own orders.
     *
     * <p>On a store this is what they ordered at that store, the same store a
     * new order placed on this host would belong to. It used to be every order
     * the account had anywhere, so one store's "my orders" listed another
     * store's parcels under its own name. On esy.ge, the back office and admin,
     * where no store is the page, the list is still the whole account's.
     *
     * <p>{@code currentStorefront()} decides, not {@code getCurrentTenant()}
     * alone: that falls back to the default store on a platform host, which
     * would quietly narrow the platform's list to it.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> myOrders(Authentication authentication) {
        User user = currentUser(authentication);
        List<Order> orders = tenantContextService.currentStorefront()
            .map(store -> orderService.ordersForUser(user, store))
            .orElseGet(() -> orderService.ordersForUser(user));
        return ResponseEntity.ok(orders.stream()
            .map(OrderController::toMap).collect(Collectors.toList()));
    }

    /**
     * One order, with its line items.
     *
     * <p>The list deliberately carries {@code items} as a count, because a
     * list of twenty orders does not need every line in it. That left the
     * shopper with no way to see WHAT they had ordered — only how many things
     * and what it cost. This is the screen that answers that, so it is the one
     * endpoint that sends the lines.
     */
    @GetMapping("/{orderNumber}")
    public ResponseEntity<Map<String, Object>> one(@PathVariable String orderNumber,
                                                   Authentication authentication) {
        User user = currentUser(authentication);
        Order order = orderService.orderForShopper(orderNumber, user);
        Map<String, Object> body = toDetailMap(order);
        withPhotos(body);
        return ResponseEntity.ok(body);
    }

    /**
     * Each line's product photo, as the product has it now ({@code imageUrl},
     * null when it has none or is gone). The line keeps its own title and price
     * from the order; the photo is only how a shopper recognises it, so it is
     * read live rather than frozen with the order.
     */
    @SuppressWarnings("unchecked")
    private void withPhotos(Map<String, Object> body) {
        List<Map<String, Object>> lines = (List<Map<String, Object>>) body.get("lines");
        if (lines == null || lines.isEmpty()) return;
        List<Long> ids = lines.stream().map(l -> (Long) l.get("productId"))
            .filter(java.util.Objects::nonNull).distinct().collect(Collectors.toList());
        Map<Long, String> photos = new HashMap<>();
        if (!ids.isEmpty()) {
            productRepository.findAllById(ids).forEach(p -> {
                if (p.getImageUrl() != null && !p.getImageUrl().isBlank()) photos.put(p.getId(), p.getImageUrl());
            });
        }
        lines.forEach(l -> l.put("imageUrl", photos.get((Long) l.get("productId"))));
    }

    /**
     * Shopper self-cancel (decision D1): allowed only while the order is still
     * PLACED and unpaid — the service enforces both. Paid or in-payment orders
     * return 409 and the shopper is told to contact the store.
     */
    @PostMapping("/{orderNumber}/cancel")
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable String orderNumber,
                                                      Authentication authentication) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(toMap(orderService.cancelByShopper(orderNumber, user)));
    }

    // Phone verification is not required to sign up, but it (and a complete
    // profile) is required to place an order.
    private void requireOrderEligible(User user) {
        if (!AccountController.profileComplete(user)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Complete your profile before ordering");
        }
        if (!Boolean.TRUE.equals(user.getPhoneVerified())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Verify your phone number before ordering");
        }
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        return userService.findByUsername(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
    }

    static Map<String, Object> toMap(Order o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", o.getId());
        m.put("orderNumber", o.getOrderNumber());
        m.put("status", o.getStatus().name().toLowerCase().replace('_', ' '));
        // Legacy prod rows can hold NULL payment_status (the column predates a
        // backfill) — same null-coalesce PaymentController.status applies.
        Order.PaymentStatus ps = o.getPaymentStatus() == null ? Order.PaymentStatus.NONE : o.getPaymentStatus();
        m.put("paymentStatus", ps.name().toLowerCase());
        m.put("total", o.getTotal());
        m.put("items", o.getItems().size());
        m.put("placed", o.getCreatedAt());
        m.put("store", o.getTenant() == null ? null : TenantMapper.toMap(o.getTenant()));
        if (o.getShipLine() != null) {
            Map<String, Object> ship = new HashMap<>();
            ship.put("recipient", o.getShipRecipient());
            ship.put("phone", o.getShipPhone());
            ship.put("line", o.getShipLine());
            ship.put("city", o.getShipCity());
            ship.put("postalCode", o.getShipPostalCode());
            ship.put("country", o.getShipCountry());
            m.put("delivery", ship);
        }
        return m;
    }

    /**
     * The list shape plus the lines, and whether the shopper may still cancel.
     *
     * <p>{@code cancellable} is computed here rather than left to the browser
     * because it is the same two conditions {@code cancelByShopper} enforces
     * (PLACED, and no payment taken). Re-deriving them in the client would be a
     * second copy of a rule that decides whether money can be undone, and the
     * two would drift.
     */
    static Map<String, Object> toDetailMap(Order o) {
        Map<String, Object> m = toMap(o);
        // How it travels and what that cost, as frozen at checkout (D9): the
        // order screen names the route and prices it beside the goods.
        m.put("deliveryRoute", o.getDeliveryRoute());
        m.put("deliveryFee", o.getDeliveryFee());
        m.put("deliveryExpress", Boolean.TRUE.equals(o.getDeliveryExpress()));
        // What has been asked back from the bank so far (D2). With the payment
        // status (refund_pending, refunded) it says how much is on its way.
        m.put("refunded", o.refundedOrZero());
        m.put("lines", o.getItems().stream().map(i -> {
            Map<String, Object> line = new HashMap<>();
            // The product and combination, so a bag the bank round trip lost
            // can be put back together from the order (the A8 return page).
            line.put("productId", i.getProductId());
            line.put("variantId", i.getVariantId());
            line.put("title", i.getTitle());
            line.put("variant", i.getVariantLabel());
            line.put("quantity", i.getQuantity());
            line.put("price", i.getPrice());
            // The line total, worked out once on the server so the screen never
            // has to multiply money in floating point.
            line.put("lineTotal", i.getPrice() == null || i.getQuantity() == null
                ? null
                : i.getPrice().multiply(java.math.BigDecimal.valueOf(i.getQuantity())));
            return line;
        }).collect(Collectors.toList()));
        Order.PaymentStatus ps = o.getPaymentStatus() == null ? Order.PaymentStatus.NONE : o.getPaymentStatus();
        m.put("cancellable", o.getStatus() == Order.Status.PLACED && ps == Order.PaymentStatus.NONE);
        return m;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
