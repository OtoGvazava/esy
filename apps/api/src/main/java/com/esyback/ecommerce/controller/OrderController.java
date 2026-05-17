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
        Order order = orderService.createOrder(user, tenantContextService.getCurrentTenant(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(order));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> myOrders(Authentication authentication) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(orderService.ordersForUser(user).stream()
            .map(OrderController::toMap).collect(Collectors.toList()));
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
        m.put("total", o.getTotal());
        m.put("items", o.getItems().size());
        m.put("placed", o.getCreatedAt());
        m.put("store", o.getTenant() == null ? null : TenantMapper.toMap(o.getTenant()));
        return m;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
