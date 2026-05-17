package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.StoreFollow;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.StoreFollowRepository;
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

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/follows")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class FollowController {

    private final StoreFollowRepository followRepository;
    private final UserService userService;
    private final TenantContextService tenantContextService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> myFollows(Authentication authentication) {
        User user = currentUser(authentication);
        return ResponseEntity.ok(followRepository.findByUser(user).stream()
            .map(f -> TenantMapper.toMap(f.getTenant())).collect(Collectors.toList()));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> follow(Authentication authentication) {
        User user = currentUser(authentication);
        Tenant tenant = tenantContextService.getCurrentTenant();
        followRepository.findByUserAndTenant(user, tenant).orElseGet(() -> {
            StoreFollow f = new StoreFollow();
            f.setUser(user);
            f.setTenant(tenant);
            return followRepository.save(f);
        });
        return ResponseEntity.status(HttpStatus.CREATED).body(TenantMapper.toMap(tenant));
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<Void> unfollow(Authentication authentication) {
        User user = currentUser(authentication);
        Tenant tenant = tenantContextService.getCurrentTenant();
        followRepository.findByUserAndTenant(user, tenant).ifPresent(followRepository::delete);
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Authentication a) {
        if (a == null || !a.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        return userService.findByUsername(a.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown account"));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
