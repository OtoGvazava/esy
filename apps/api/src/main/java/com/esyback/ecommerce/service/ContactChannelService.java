package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.ContactChannel;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ContactChannelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The store's contact list (decision D10). Every read and write is scoped to
 * the tenant the request resolved to, so a store can only ever see and edit
 * its own channels.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ContactChannelService {

    private final ContactChannelRepository repository;
    private final TenantContextService tenantContextService;

    /** A store cannot list an unbounded number of ways to be reached. */
    private static final int MAX_CHANNELS = 12;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listForOwner() {
        return repository.findByTenantOrderBySortOrderAscIdAsc(tenant()).stream()
            .map(ContactChannelService::toMap).toList();
    }

    /** What the storefront renders — public entries only. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPublic() {
        return repository.findByTenantAndIsPublicTrueOrderBySortOrderAscIdAsc(tenant()).stream()
            .map(ContactChannelService::toMap).toList();
    }

    public Map<String, Object> create(Map<String, Object> body) {
        Tenant tenant = tenant();
        if (repository.countByTenant(tenant) >= MAX_CHANNELS) {
            throw bad("A store can list at most " + MAX_CHANNELS + " contact channels");
        }
        ContactChannel channel = new ContactChannel();
        channel.setTenant(tenant);
        apply(channel, body, true);
        return toMap(save(channel));
    }

    public Map<String, Object> update(Long id, Map<String, Object> body) {
        ContactChannel channel = require(id);
        apply(channel, body, false);
        return toMap(save(channel));
    }

    public void delete(Long id) {
        repository.delete(require(id));
    }

    /**
     * Writing the whole order at once rather than nudging entries one place at
     * a time — reordering is a drag in the interface, and a per-move endpoint
     * would make an interrupted drag leave the list half-sorted.
     */
    public List<Map<String, Object>> reorder(List<Long> orderedIds) {
        Tenant tenant = tenant();
        List<ContactChannel> all = repository.findByTenantOrderBySortOrderAscIdAsc(tenant);
        Map<Long, ContactChannel> byId = new LinkedHashMap<>();
        all.forEach(c -> byId.put(c.getId(), c));

        int position = 0;
        for (Long id : orderedIds) {
            ContactChannel channel = byId.remove(id);
            // An id that is not this store's is ignored rather than fatal: the
            // list may have changed in another tab, and a stale drag should not
            // cost the owner the whole ordering.
            if (channel != null) channel.setSortOrder(position++);
        }
        for (ContactChannel leftover : byId.values()) leftover.setSortOrder(position++);

        repository.saveAll(all);
        return listForOwner();
    }

    // ------------------------------------------------------------------ rules

    private void apply(ContactChannel channel, Map<String, Object> body, boolean creating) {
        if (creating || body.containsKey("type")) {
            String type = str(body.get("type"));
            if (type == null || !ContactChannel.TYPES.contains(type.toUpperCase())) {
                throw bad("Channel type must be one of " + String.join(", ", ContactChannel.TYPES));
            }
            channel.setType(type.toUpperCase());
        }
        if (creating || body.containsKey("value")) {
            String value = str(body.get("value"));
            if (value == null) throw bad("A contact value is required");
            channel.setValue(value);
        }
        if (body.containsKey("isPublic")) {
            channel.setIsPublic(bool(body.get("isPublic"), true));
        }
        if (creating && !body.containsKey("isPublic")) {
            channel.setIsPublic(true);
        }
        if (body.containsKey("isPrimary")) {
            channel.setIsPrimary(bool(body.get("isPrimary"), false));
        }

        if (Boolean.TRUE.equals(channel.getIsPrimary())
            && !ContactChannel.PHONE_TYPES.contains(channel.getType())) {
            throw bad("Only a phone channel can be the primary one — a handle does not tell a shopper how to call");
        }
        if (creating) {
            channel.setSortOrder((int) repository.countByTenant(channel.getTenant()));
        }
    }

    /**
     * Saves, then makes the primary marker exclusive. Done after the write
     * rather than before so the row being promoted is not competing with its
     * own previous state.
     */
    private ContactChannel save(ContactChannel channel) {
        ContactChannel saved = repository.save(channel);
        if (Boolean.TRUE.equals(saved.getIsPrimary())) {
            List<ContactChannel> others = repository.findByTenantAndIsPrimaryTrue(saved.getTenant()).stream()
                .filter(c -> !c.getId().equals(saved.getId()))
                .peek(c -> c.setIsPrimary(false))
                .toList();
            if (!others.isEmpty()) repository.saveAll(others);
        }
        return saved;
    }

    private ContactChannel require(Long id) {
        return repository.findByIdAndTenant(id, tenant()).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such contact channel"));
    }

    private Tenant tenant() {
        return tenantContextService.getCurrentTenant();
    }

    private static Map<String, Object> toMap(ContactChannel c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("type", c.getType());
        m.put("value", c.getValue());
        m.put("isPrimary", Boolean.TRUE.equals(c.getIsPrimary()));
        m.put("isPublic", Boolean.TRUE.equals(c.getIsPublic()));
        m.put("sortOrder", c.getSortOrder());
        return m;
    }

    private static String str(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        return s.isEmpty() ? null : s;
    }

    private static boolean bool(Object o, boolean fallback) {
        if (o instanceof Boolean b) return b;
        if (o == null) return fallback;
        return Boolean.parseBoolean(String.valueOf(o));
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
