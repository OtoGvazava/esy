package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.service.ContactChannelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * The store's contact channels (decision D10).
 *
 * <p>Two reads, deliberately separate. {@code /public} is what a shopper's
 * browser fetches and returns only channels the owner chose to show; the
 * owner's own list returns hidden entries too and is gated. Serving both from
 * one endpoint with a flag would make an accidental leak of hidden numbers a
 * one-character mistake.
 *
 * <p>Writes are OWNER-only, matching the rest of store settings (D5) — a
 * MANAGER runs the shop day to day but does not change how it is reached.
 */
@RestController
@RequestMapping("/api/contact-channels")
@RequiredArgsConstructor
public class ContactChannelController {

    private final ContactChannelService service;

    /** Public: what the storefront shows. No authentication. */
    @GetMapping("/public")
    public List<Map<String, Object>> publicList() {
        return service.listPublic();
    }

    /** The owner's full list, hidden entries included. */
    @GetMapping
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public List<Map<String, Object>> list() {
        return service.listForOwner();
    }

    @PostMapping
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        return service.create(body);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public Map<String, Object> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return service.update(id, body);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** Body: {"ids": [3, 1, 2]} — the whole order in one write. */
    @PostMapping("/reorder")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public List<Map<String, Object>> reorder(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body == null ? null : body.get("ids");
        return service.reorder(ids == null ? List.of() : ids);
    }
}
