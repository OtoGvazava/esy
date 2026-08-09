package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.DeliveryOption;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.DeliveryOptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The store's delivery routes (decision D9). Four independent switches, each
 * priced and timed, rather than one delivery setting.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class DeliveryService {

    private final DeliveryOptionRepository repository;
    private final TenantContextService tenantContextService;

    /**
     * Every route, creating the missing rows on first read so the owner's
     * screen always has four switches to show. A store that has never opened
     * the screen still needs an answer at checkout, so PICKUP is enabled by
     * default: collecting in person is the one route that needs no courier,
     * no price and no promise, and a shop with nothing enabled could not sell.
     */
    public List<Map<String, Object>> listForOwner() {
        return options().stream().map(DeliveryService::toMap).toList();
    }

    /**
     * What the storefront offers a shopper — enabled routes only.
     *
     * <p>A store whose owner has never opened the delivery screen has no rows
     * at all, and answering "no routes" would leave its shoppers unable to
     * check out. It falls back to the same default the owner's first read
     * would create: collect in person. Synthesised rather than persisted,
     * because a shopper loading a page should not write to the database.
     *
     * <p>An empty result can only mean unconfigured, never "the owner turned
     * everything off" — the last-route rule makes that state unreachable.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPublic() {
        List<DeliveryOption> enabled = repository.findByTenantAndEnabledTrue(tenant());
        if (enabled.isEmpty()) {
            return List.of(toMap(defaultPickup()));
        }
        return enabled.stream()
            // Express never appears here: it is an upgrade on a courier route,
            // not one of the ways to receive an order. It is returned
            // separately by expressOffer() so checkout can render it as the
            // "+₾" add-on the design specifies.
            .filter(o -> DeliveryOption.BASE_ROUTES.contains(o.getRoute()))
            .sorted((a, b) -> Integer.compare(
                DeliveryOption.BASE_ROUTES.indexOf(a.getRoute()),
                DeliveryOption.BASE_ROUTES.indexOf(b.getRoute())))
            .map(DeliveryService::toMap)
            .toList();
    }

    /**
     * The express upgrade, or null when the store does not offer it. Separate
     * from the route list because it is bought <em>in addition to</em> a
     * courier route, not instead of one.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> expressOffer() {
        DeliveryOption express = repository
            .findByTenantAndRoute(tenant(), DeliveryOption.EXPRESS).orElse(null);
        if (express == null || !Boolean.TRUE.equals(express.getEnabled())) return null;
        return toMap(express);
    }

    /** The unconfigured store's implied route. Never saved by a read path. */
    private DeliveryOption defaultPickup() {
        DeliveryOption pickup = new DeliveryOption();
        pickup.setRoute(DeliveryOption.PICKUP);
        pickup.setEnabled(true);
        pickup.setPrice(BigDecimal.ZERO);
        return pickup;
    }

    public Map<String, Object> update(String route, Map<String, Object> body) {
        String key = String.valueOf(route).trim().toLowerCase();
        if (!DeliveryOption.ROUTES.contains(key)) {
            throw bad("Unknown delivery route: " + route);
        }
        List<DeliveryOption> all = options();
        DeliveryOption target = all.stream().filter(o -> o.getRoute().equals(key)).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such route"));

        boolean wasEnabled = Boolean.TRUE.equals(target.getEnabled());
        boolean nowEnabled = body.containsKey("enabled")
            ? bool(body.get("enabled"), wasEnabled) : wasEnabled;

        if (wasEnabled && !nowEnabled) {
            guardLastRoute(all, key);
        }
        if (!wasEnabled && nowEnabled && DeliveryOption.EXPRESS.equals(key)) {
            guardExpressNeedsCourier(all, key, true);
        }
        if (wasEnabled && !nowEnabled && target.isCourier()) {
            // Turning off the last courier would strand express, which cannot
            // stand on its own. Refuse rather than silently disabling express
            // too — the owner should know what their change costs them.
            guardExpressNeedsCourier(all, key, false);
        }

        target.setEnabled(nowEnabled);
        if (body.containsKey("price")) target.setPrice(money(body.get("price"), BigDecimal.ZERO));
        if (body.containsKey("freeOverTotal")) {
            Object raw = body.get("freeOverTotal");
            target.setFreeOverTotal(raw == null || String.valueOf(raw).isBlank()
                ? null : money(raw, null));
        }
        if (body.containsKey("etaKa")) target.setEtaKa(str(body.get("etaKa")));
        if (body.containsKey("etaEn")) target.setEtaEn(str(body.get("etaEn")));
        if (body.containsKey("pickupAddress")) target.setPickupAddress(str(body.get("pickupAddress")));
        if (body.containsKey("pickupHours")) target.setPickupHours(str(body.get("pickupHours")));

        if (target.getPrice() != null && target.getPrice().signum() < 0) {
            throw bad("A delivery price cannot be negative");
        }

        return toMap(repository.save(target));
    }

    /**
     * What this route costs for an order of this size, applying the free-over
     * threshold. Returned rather than stored so the storefront and the order
     * agree on one calculation.
     */
    @Transactional(readOnly = true)
    public BigDecimal feeFor(String route, boolean express, BigDecimal orderTotal) {
        String key = String.valueOf(route).toLowerCase();
        Tenant tenant = tenant();

        if (!DeliveryOption.BASE_ROUTES.contains(key)) {
            // Express reaching here means a caller tried to buy the upgrade as
            // if it were a route — speed without any delivery to accelerate.
            throw bad(DeliveryOption.EXPRESS.equals(key)
                ? "Express is an upgrade on a courier route, not a route of its own"
                : "That delivery route is not offered by this store");
        }

        DeliveryOption option = repository.findByTenantAndRoute(tenant, key).orElse(null);

        // Unconfigured store: it implicitly offers collection in person, and
        // listPublic says so, so quoting it here must agree. Anything else is
        // genuinely not on offer.
        if (option == null) {
            if (DeliveryOption.PICKUP.equals(key) && repository.findByTenant(tenant).isEmpty()) {
                return BigDecimal.ZERO;
            }
            throw bad("That delivery route is not offered by this store");
        }
        if (!Boolean.TRUE.equals(option.getEnabled())) {
            throw bad("That delivery route is not offered by this store");
        }

        BigDecimal price = option.getPrice() == null ? BigDecimal.ZERO : option.getPrice();
        BigDecimal threshold = option.getFreeOverTotal();
        // The threshold frees the ROUTE, not the express upgrade: a shop
        // offering free delivery over 150 is not also giving away same-day.
        if (threshold != null && orderTotal != null && orderTotal.compareTo(threshold) >= 0) {
            price = BigDecimal.ZERO;
        }

        if (!express) return price;

        if (DeliveryOption.PICKUP.equals(key)) {
            throw bad("Express applies to a courier route — there is nothing to accelerate about collecting in person");
        }
        DeliveryOption upgrade = repository
            .findByTenantAndRoute(tenant, DeliveryOption.EXPRESS).orElse(null);
        if (upgrade == null || !Boolean.TRUE.equals(upgrade.getEnabled())) {
            throw bad("This store does not offer express delivery");
        }
        return price.add(upgrade.getPrice() == null ? BigDecimal.ZERO : upgrade.getPrice());
    }

    /**
     * Whether checkout should ask for an address at all. With both couriers
     * off, nothing is ever posted, so the address block is dropped entirely
     * and the shopper is told to collect in person.
     */
    @Transactional(readOnly = true)
    public boolean requiresAddress() {
        return repository.findByTenantAndEnabledTrue(tenant()).stream()
            .anyMatch(DeliveryOption::isCourier);
    }

    // ------------------------------------------------------------------ rules

    private void guardLastRoute(List<DeliveryOption> all, String turningOff) {
        long remaining = all.stream()
            .filter(o -> !o.getRoute().equals(turningOff))
            .filter(o -> Boolean.TRUE.equals(o.getEnabled()))
            .count();
        if (remaining == 0) {
            throw bad("This is the only way customers can receive their order — "
                + "enable another route before switching it off");
        }
    }

    private void guardExpressNeedsCourier(List<DeliveryOption> all, String changing, boolean enablingExpress) {
        long couriers = all.stream()
            .filter(DeliveryOption::isCourier)
            .filter(o -> !o.getRoute().equals(changing))
            .filter(o -> Boolean.TRUE.equals(o.getEnabled()))
            .count();
        if (couriers > 0) return;

        if (enablingExpress) {
            throw bad("Express needs a courier route — enable Tbilisi or the rest of Georgia first");
        }
        boolean expressOn = all.stream()
            .anyMatch(o -> DeliveryOption.EXPRESS.equals(o.getRoute()) && Boolean.TRUE.equals(o.getEnabled()));
        if (expressOn) {
            throw bad("Express has nothing to accelerate without a courier route — turn express off first");
        }
    }

    /** Every route for this store, creating any that do not exist yet. */
    private List<DeliveryOption> options() {
        Tenant tenant = tenant();
        List<DeliveryOption> existing = repository.findByTenant(tenant);
        List<DeliveryOption> result = new ArrayList<>();
        for (String route : DeliveryOption.ROUTES) {
            DeliveryOption found = existing.stream()
                .filter(o -> route.equals(o.getRoute())).findFirst().orElse(null);
            if (found == null) {
                DeliveryOption fresh = new DeliveryOption();
                fresh.setTenant(tenant);
                fresh.setRoute(route);
                fresh.setEnabled(DeliveryOption.PICKUP.equals(route));
                fresh.setPrice(BigDecimal.ZERO);
                found = repository.save(fresh);
            }
            result.add(found);
        }
        return result;
    }

    private Tenant tenant() {
        return tenantContextService.getCurrentTenant();
    }

    private static Map<String, Object> toMap(DeliveryOption o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("route", o.getRoute());
        m.put("enabled", Boolean.TRUE.equals(o.getEnabled()));
        m.put("price", o.getPrice() == null ? BigDecimal.ZERO : o.getPrice());
        m.put("freeOverTotal", o.getFreeOverTotal());
        m.put("etaKa", o.getEtaKa());
        m.put("etaEn", o.getEtaEn());
        m.put("pickupAddress", o.getPickupAddress());
        m.put("pickupHours", o.getPickupHours());
        m.put("courier", o.isCourier());
        return m;
    }

    private static String str(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        return s.isEmpty() ? null : s;
    }

    private static BigDecimal money(Object o, BigDecimal fallback) {
        if (o == null) return fallback;
        try {
            return new BigDecimal(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            throw bad("Not a valid amount: " + o);
        }
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
