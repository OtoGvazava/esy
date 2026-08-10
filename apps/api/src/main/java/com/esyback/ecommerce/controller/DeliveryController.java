package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.service.DeliveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The store's delivery routes (decision D9).
 *
 * <p>Same split as contact channels: {@code /public} is what a shopper's
 * browser reads and returns only enabled routes, while the owner's list
 * returns all four so the settings screen has switches to show.
 */
@RestController
@RequestMapping("/api/delivery")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryService service;

    /**
     * Public: the routes on offer, plus whether checkout should ask for an
     * address at all. Both come from one call because checkout needs them
     * together and a second round trip could only ever disagree with the first.
     */
    @GetMapping("/public")
    public Map<String, Object> publicOptions() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("routes", service.listPublic());
        // Null when the store does not offer it. Separate from routes because
        // express is bought on top of a courier route, not instead of one.
        body.put("express", service.expressOffer());
        body.put("requiresAddress", service.requiresAddress());
        return body;
    }

    /** The owner's list: all four routes, enabled or not. */
    @GetMapping
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public List<Map<String, Object>> list() {
        return service.listForOwner();
    }

    @PutMapping("/{route}")
    @PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")
    public Map<String, Object> update(@PathVariable String route,
                                      @RequestBody Map<String, Object> body) {
        return service.update(route, body);
    }
}
