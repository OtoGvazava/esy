package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.service.AdminService;
import com.esyback.ecommerce.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * Platform administration — the cross-store namespace behind admin.esy.ge
 * (decision D6). Read-only sight of every store, the fee ledger, the admin
 * allowlist and the audit trail; plus the two writes that change a store's
 * standing.
 *
 * <p><b>The only gate is {@code @PreAuthorize("hasRole('ADMIN')")}.</b> The
 * security filter chain ends in {@code anyRequest().permitAll()} (the SPA and
 * the storefront are public), so method security is not a second lock on these
 * URLs — it is the lock. The annotation is repeated on every handler as the
 * contract requires, and declared once on the class as well: a handler added
 * later that forgets its own annotation inherits the class-level one instead of
 * silently becoming a public listing of every merchant's revenue.
 *
 * <p><b>No store comes from context.</b> Every endpoint that concerns a store
 * takes its subdomain as a path variable. Reading {@code TenantContextService}
 * here would resolve to the default store on the admin host, so the responses
 * would name one store and carry another's numbers — see {@link AdminService}.
 *
 * <p>Response building lives in the service, inside the transaction. This class
 * only converts HTTP to arguments and back.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final UserService userService;

    // ---------------------------------------------------------------- stores

    /** Every store, optionally filtered by subdomain / name / owner email. */
    @GetMapping("/stores")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Map<String, Object>> stores(@RequestParam(required = false) String q) {
        return adminService.listStores(q);
    }

    @GetMapping("/stores/{subdomain}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> store(@PathVariable String subdomain) {
        return adminService.storeDetail(subdomain);
    }

    /** Body: {"reason": "…"}. Returns the store object with its new standing. */
    @PostMapping("/stores/{subdomain}/suspend")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> suspend(@PathVariable String subdomain,
                                       @RequestBody(required = false) Map<String, String> body,
                                       Authentication authentication) {
        String reason = body == null ? null : body.get("reason");
        return adminService.suspend(subdomain, reason, actor(authentication));
    }

    @PostMapping("/stores/{subdomain}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> reactivate(@PathVariable String subdomain, Authentication authentication) {
        return adminService.reactivate(subdomain, actor(authentication));
    }

    // --------------------------------------------------------------- billing

    @GetMapping("/billing")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> billing() {
        return adminService.billing();
    }

    // ---------------------------------------------------------------- admins

    /** The effective allowlist: config ("env") ∪ platform_admins ("db"). */
    @GetMapping("/admins")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Map<String, Object>> admins() {
        return adminService.admins();
    }

    /** Body: {"email": "…"}. 409 if the address is already an admin. */
    @PostMapping("/admins")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> grantAdmin(@RequestBody(required = false) Map<String, String> body,
                                                          Authentication authentication) {
        String email = body == null ? null : body.get("email");
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(adminService.grantAdmin(email, actor(authentication)));
    }

    /**
     * 204 on removal. An env-sourced address is refused with 400 — it has no
     * row to delete and would keep its access; the fix is to edit ADMIN_EMAILS.
     */
    @DeleteMapping("/admins/{email}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> revokeAdmin(@PathVariable String email, Authentication authentication) {
        adminService.revokeAdmin(email, actor(authentication));
        return ResponseEntity.noContent().build();
    }

    // ----------------------------------------------------------------- audit

    @GetMapping("/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Map<String, Object>> audit(@RequestParam(defaultValue = "50") int limit) {
        return adminService.audit(limit);
    }

    // --------------------------------------------------------------- helpers

    /**
     * Who is acting, for the suspension stamp and the audit rows. The principal
     * name is the username, which is the email for every OAuth account — but it
     * is resolved through the account rather than assumed, so the trail records
     * an address and not a handle that merely usually looks like one.
     */
    private String actor(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            // Unreachable behind @PreAuthorize; kept so the audit trail can
            // never be written with a null actor if that ever changes.
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        String name = authentication.getName();
        return userService.findByUsername(name)
            .map(User::getEmail)
            .filter(email -> email != null && !email.isBlank())
            .orElse(name);
    }

    // Surface the reason as { error }: server.error.include-message=never masks
    // it in Spring's default body, and the SPA reads body.error.
    //
    // The class-level rule covers this method too (method security matches the
    // declaring class), which is harmless: it can only run while resolving an
    // exception thrown from a handler that already passed the same check, with
    // that admin still in the SecurityContext.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
            .body(Map.of("error", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
}
