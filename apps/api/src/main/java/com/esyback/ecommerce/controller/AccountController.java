package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.dto.UpdateProfileRequest;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.StoreMembershipRepository;
import com.esyback.ecommerce.service.OrderService;
import com.esyback.ecommerce.service.PhoneVerificationService;
import com.esyback.ecommerce.service.SmsSender;
import com.esyback.ecommerce.service.UserService;
import com.esyback.ecommerce.web.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Cross-store account hub for one global identity: stores you OWN (with live
 * order/revenue stats) + the orders you placed anywhere. This is the real
 * backing for the platform's /account screen.
 */
@RestController
@RequestMapping("/api/account")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AccountController {

    private final UserService userService;
    private final StoreMembershipRepository membershipRepository;
    private final OrderService orderService;
    private final PhoneVerificationService phoneVerificationService;

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
                s.put("myRole", "OWNER");
                return s;
            })
            .collect(Collectors.toList());

        // Stores this account MANAGES but does not own (decision D5) — the
        // back office's store switcher shows both tiers.
        List<Map<String, Object>> managedStores = membershipRepository
            .findByUserAndRole(user, StoreMembership.Role.MANAGER).stream()
            .map(m -> {
                Map<String, Object> s = TenantMapper.toMap(m.getTenant());
                s.put("status", Boolean.TRUE.equals(m.getTenant().getIsActive()) ? "live" : "draft");
                s.put("myRole", "MANAGER");
                return s;
            })
            .collect(Collectors.toList());

        List<Map<String, Object>> orders = orderService.ordersForUser(user).stream()
            .map(OrderController::toMap).collect(Collectors.toList());

        boolean sells = !ownedStores.isEmpty();
        boolean shops = !orders.isEmpty();
        String role = sells && shops ? "both" : (sells ? "seller" : "shopper");

        Map<String, Object> body = new HashMap<>();
        body.put("user", userMap(user));
        body.put("ownedStores", ownedStores);
        body.put("managedStores", managedStores);
        body.put("orders", orders);
        body.put("role", role);
        return ResponseEntity.ok(body);
    }

    /** Mandatory profile: name, surname and date of birth. Phone is handled
     *  separately (PUT /phone) so changing it can re-trigger verification. */
    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(@RequestBody UpdateProfileRequest req,
                                                             Authentication authentication) {
        User user = requireUser(authentication);
        if (isBlank(req.getFirstName()) || isBlank(req.getLastName()) || isBlank(req.getDateOfBirth())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Name, surname and date of birth are required");
        }
        LocalDate dob;
        try {
            dob = LocalDate.parse(req.getDateOfBirth().trim());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date of birth");
        }
        if (dob.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date of birth can't be in the future");
        }
        user.setFirstName(req.getFirstName().trim());
        user.setLastName(req.getLastName().trim());
        user.setDateOfBirth(dob);
        userService.save(user);
        return ResponseEntity.ok(userMap(user));
    }

    /** Phone number is its own field: changing it clears verification so the
     *  new number must be re-verified before the next order. */
    @PutMapping("/phone")
    public ResponseEntity<Map<String, Object>> updatePhone(@RequestBody Map<String, String> body,
                                                           Authentication authentication) {
        User user = requireUser(authentication);
        String raw = body == null ? null : body.get("phoneNumber");
        String newPhone = raw == null ? "" : raw.trim();
        String current = user.getPhoneNumber() == null ? "" : user.getPhoneNumber();
        if (!newPhone.equals(current)) {
            user.setPhoneNumber(newPhone.isEmpty() ? null : newPhone);
            user.setPhoneVerified(false);
            userService.save(user);
        }
        return ResponseEntity.ok(userMap(user));
    }

    /**
     * Sends the one-time code by SMS.
     *
     * <p>{@code devCode} is present ONLY when no SMS account is configured, so
     * a local stack can be used without messages. With a key wired up the
     * response carries no code at all — it used to return it unconditionally,
     * which handed the verification code to whoever called the endpoint and
     * made the check decorative.
     *
     * <p>{@code destination} is the masked number the message was actually
     * addressed to. The screen used to say only "we sent a code to your
     * phone", so a mistyped number produced a confident success and a code
     * delivered to a stranger, with nothing on screen to suggest where it had
     * gone. It is the caller's own number, which they can already read in full
     * on this same screen, so masking is convention rather than secrecy — the
     * last two digits are what makes a wrong number obvious.
     */
    @PostMapping("/phone/send-code")
    public ResponseEntity<Map<String, Object>> sendPhoneCode(Authentication authentication) {
        User user = requireUser(authentication);
        String devCode = phoneVerificationService.sendCode(user);
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("sent", true);
        body.put("destination", SmsSender.maskPhone(user.getPhoneNumber()));
        if (devCode != null) body.put("devCode", devCode);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/phone/verify")
    public ResponseEntity<Map<String, Object>> verifyPhone(@RequestBody Map<String, String> body,
                                                           Authentication authentication) {
        User user = requireUser(authentication);
        phoneVerificationService.verify(user, body == null ? null : body.get("code"));
        return ResponseEntity.ok(userMap(user));
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        return userService.findByUsername(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    /** Name + surname + date of birth all present. */
    public static boolean profileComplete(User u) {
        return !isBlank(u.getFirstName()) && !isBlank(u.getLastName()) && u.getDateOfBirth() != null;
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
        m.put("dateOfBirth", u.getDateOfBirth() == null ? null : u.getDateOfBirth().toString());
        m.put("phoneNumber", u.getPhoneNumber());
        m.put("phoneVerified", Boolean.TRUE.equals(u.getPhoneVerified()));
        m.put("profileComplete", profileComplete(u));
        m.put("roles", u.getRoles().stream().map(r -> r.getName()).collect(Collectors.toList()));
        return m;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
