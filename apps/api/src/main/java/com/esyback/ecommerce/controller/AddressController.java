package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Address;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.AddressRepository;
import com.esyback.ecommerce.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The signed-in user's address book (decision D4). Platform-level, like the
 * account itself: an address saved while buying at one store is offered at
 * checkout on every *.esy.ge store. Orders never reference these rows — the
 * chosen address is frozen onto the order at checkout.
 */
@RestController
@RequestMapping("/api/addresses")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AddressController {

    private final AddressRepository addressRepository;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(Authentication authentication) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(addressRepository
            .findByUserOrderByIsDefaultDescCreatedAtDesc(user).stream()
            .map(AddressController::toMap).collect(Collectors.toList()));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, String> body,
                                                      Authentication authentication) {
        User user = currentUser(authentication);
        Address a = new Address();
        a.setUser(user);
        apply(a, body);
        if (a.getRecipient() == null || a.getPhone() == null || a.getLine() == null || a.getCity() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "recipient, phone, line and city are required");
        }
        // First address becomes the default automatically; an explicit
        // isDefault=true steals the flag from the previous default.
        boolean first = addressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user).isEmpty();
        boolean wantsDefault = Boolean.parseBoolean(body.getOrDefault("isDefault", "false"));
        if (first || wantsDefault) {
            clearDefault(user);
            a.setIsDefault(true);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(addressRepository.save(a)));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long id,
                                                      @RequestBody Map<String, String> body,
                                                      Authentication authentication) {
        User user = currentUser(authentication);
        Address a = owned(id, user);
        apply(a, body);
        if (Boolean.parseBoolean(body.getOrDefault("isDefault", "false")) && !Boolean.TRUE.equals(a.getIsDefault())) {
            clearDefault(user);
            a.setIsDefault(true);
        }
        return ResponseEntity.ok(toMap(addressRepository.save(a)));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        User user = currentUser(authentication);
        Address a = owned(id, user);
        addressRepository.delete(a);
        // Deleting the default promotes the newest remaining address so
        // checkout always has a preselection when any address exists.
        if (Boolean.TRUE.equals(a.getIsDefault())) {
            addressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user).stream()
                .findFirst().ifPresent(next -> {
                    next.setIsDefault(true);
                    addressRepository.save(next);
                });
        }
        return ResponseEntity.noContent().build();
    }

    private void clearDefault(User user) {
        addressRepository.findByUserAndIsDefaultTrue(user).forEach(d -> {
            d.setIsDefault(false);
            addressRepository.save(d);
        });
    }

    private Address owned(Long id, User user) {
        return addressRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Address not found"));
    }

    private static void apply(Address a, Map<String, String> body) {
        if (body.containsKey("recipient")) a.setRecipient(trimToNull(body.get("recipient")));
        if (body.containsKey("phone")) a.setPhone(trimToNull(body.get("phone")));
        if (body.containsKey("line")) a.setLine(trimToNull(body.get("line")));
        if (body.containsKey("city")) a.setCity(trimToNull(body.get("city")));
        if (body.containsKey("postalCode")) a.setPostalCode(trimToNull(body.get("postalCode")));
        if (body.containsKey("country")) a.setCountry(trimToNull(body.get("country")));
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        return userService.findByUsername(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
    }

    static Map<String, Object> toMap(Address a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.getId());
        m.put("recipient", a.getRecipient());
        m.put("phone", a.getPhone());
        m.put("line", a.getLine());
        m.put("city", a.getCity());
        m.put("postalCode", a.getPostalCode());
        m.put("country", a.getCountry());
        m.put("isDefault", Boolean.TRUE.equals(a.getIsDefault()));
        return m;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
