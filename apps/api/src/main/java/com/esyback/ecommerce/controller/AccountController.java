package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.SavedItemRepository;
import com.esyback.ecommerce.repository.StoreFollowRepository;
import com.esyback.ecommerce.repository.StoreMembershipRepository;
import com.esyback.ecommerce.service.OrderService;
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

/**
 * Cross-store account hub for one global identity: stores you OWN (with live
 * order/revenue stats) + shopping you do anywhere (orders / saved / followed).
 * This is the real backing for the platform's /account screen.
 */
@RestController
@RequestMapping("/api/account")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AccountController {

    private final UserService userService;
    private final StoreMembershipRepository membershipRepository;
    private final OrderService orderService;
    private final SavedItemRepository savedRepository;
    private final StoreFollowRepository followRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> account(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        User user = userService.findByUsername(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));

        List<Map<String, Object>> ownedStores = membershipRepository
            .findByUserAndRole(user, StoreMembership.Role.OWNER).stream()
            .map(m -> {
                Map<String, Object> s = TenantMapper.toMap(m.getTenant());
                s.put("status", Boolean.TRUE.equals(m.getTenant().getIsActive()) ? "live" : "draft");
                s.put("orders", orderService.orderCount(m.getTenant()));
                s.put("revenue", orderService.revenue(m.getTenant()));
                s.put("views", "—");
                return s;
            })
            .collect(Collectors.toList());

        List<Map<String, Object>> orders = orderService.ordersForUser(user).stream()
            .map(OrderController::toMap).collect(Collectors.toList());
        List<Map<String, Object>> saved = savedRepository.findByUserOrderByCreatedAtDesc(user).stream()
            .map(SavedController::toMap).collect(Collectors.toList());
        List<Map<String, Object>> followed = followRepository.findByUser(user).stream()
            .map(f -> TenantMapper.toMap(f.getTenant())).collect(Collectors.toList());

        boolean sells = !ownedStores.isEmpty();
        boolean shops = !orders.isEmpty() || !saved.isEmpty() || !followed.isEmpty();
        String role = sells && shops ? "both" : (sells ? "seller" : "shopper");

        Map<String, Object> body = new HashMap<>();
        body.put("user", userMap(user));
        body.put("ownedStores", ownedStores);
        body.put("orders", orders);
        body.put("saved", saved);
        body.put("followed", followed);
        body.put("role", role);
        return ResponseEntity.ok(body);
    }

    private static Map<String, Object> userMap(User u) {
        String first = u.getFirstName() == null ? "" : u.getFirstName();
        String last = u.getLastName() == null ? "" : u.getLastName();
        String name = (first + " " + last).trim();
        if (name.isEmpty()) name = u.getEmail();
        String initials = (first.isEmpty() ? u.getEmail() : first).substring(0, 1).toUpperCase()
            + (last.isEmpty() ? "" : last.substring(0, 1).toUpperCase());
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("name", name);
        m.put("email", u.getEmail());
        m.put("initials", initials);
        m.put("firstName", u.getFirstName());
        m.put("lastName", u.getLastName());
        m.put("profileImageUrl", u.getProfileImageUrl());
        m.put("roles", u.getRoles().stream().map(r -> r.getName()).collect(Collectors.toList()));
        return m;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
