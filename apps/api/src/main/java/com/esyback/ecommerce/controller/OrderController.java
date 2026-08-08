package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.User;
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

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> myOrders(Authentication authentication) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(orderService.ordersForUser(user).stream()
            .map(OrderController::toMap).collect(Collectors.toList()));
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

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
