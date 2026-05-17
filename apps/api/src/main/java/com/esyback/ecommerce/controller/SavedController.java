package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.SavedItem;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.SavedItemRepository;
import com.esyback.ecommerce.service.TenantContextService;
import com.esyback.ecommerce.service.UserService;
import com.esyback.ecommerce.web.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/saved")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SavedController {

    private final SavedItemRepository savedRepository;
    private final UserService userService;
    private final TenantContextService tenantContextService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> mySaved(Authentication authentication) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(savedRepository.findByUserOrderByCreatedAtDesc(user).stream()
            .map(SavedController::toMap).collect(Collectors.toList()));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> save(@RequestBody Map<String, Object> body,
                                                    Authentication authentication) {
        User user = currentUser(authentication);
        Tenant tenant = tenantContextService.getCurrentTenant();
        Long productId = body.get("productId") == null ? null
            : Long.valueOf(String.valueOf(body.get("productId")));
        if (productId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "productId required");
        }
        SavedItem item = savedRepository.findByUserAndTenantAndProductId(user, tenant, productId)
            .orElseGet(SavedItem::new);
        item.setUser(user);
        item.setTenant(tenant);
        item.setProductId(productId);
        item.setTitle(body.get("title") == null ? null : String.valueOf(body.get("title")));
        if (body.get("price") != null) item.setPrice(new BigDecimal(String.valueOf(body.get("price"))));
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(savedRepository.save(item)));
    }

    @DeleteMapping("/{productId}")
    @Transactional
    public ResponseEntity<Void> remove(@PathVariable Long productId, Authentication authentication) {
        User user = currentUser(authentication);
        Tenant tenant = tenantContextService.getCurrentTenant();
        savedRepository.findByUserAndTenantAndProductId(user, tenant, productId)
            .ifPresent(savedRepository::delete);
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Authentication a) {
        if (a == null || !a.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        return userService.findByUsername(a.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
    }

    static Map<String, Object> toMap(SavedItem s) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("productId", s.getProductId());
        m.put("title", s.getTitle());
        m.put("price", s.getPrice());
        m.put("store", s.getTenant() == null ? null : TenantMapper.toMap(s.getTenant()));
        return m;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
