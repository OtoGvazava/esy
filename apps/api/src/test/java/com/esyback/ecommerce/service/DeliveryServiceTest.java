package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.DeliveryOption;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.DeliveryOptionRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * The two rules from decision D9 that keep a shop sellable: it must always
 * offer at least one way to receive goods, and express cannot exist without a
 * courier to accelerate. Both are refusals rather than silent corrections —
 * an owner should know what a change would cost them.
 */
@SpringBootTest
class DeliveryServiceTest {

    @Autowired DeliveryService service;
    @Autowired DeliveryOptionRepository repository;
    @Autowired TenantRepository tenantRepository;

    @MockBean TenantContextService tenantContextService;

    private static final String SUB = "delivery-test-store";

    @BeforeEach
    void setUp() {
        Tenant t = tenantRepository.findBySubdomain(SUB).orElseGet(() -> {
            Tenant fresh = new Tenant();
            fresh.setName("Delivery Test Store");
            fresh.setSubdomain(SUB);
            fresh.setIsActive(true);
            return tenantRepository.save(fresh);
        });
        repository.deleteAll(repository.findByTenant(t));
        when(tenantContextService.getCurrentTenant()).thenReturn(t);
    }

    private Map<String, Object> route(String name) {
        return service.listForOwner().stream()
            .filter(r -> name.equals(r.get("route")))
            .findFirst().orElseThrow();
    }

    private void enable(String name) {
        service.update(name, Map.of("enabled", true));
    }

    @Test
    @Transactional
    void firstReadCreatesAllFourRoutesWithPickupOn() {
        List<Map<String, Object>> all = service.listForOwner();
        assertThat(all).hasSize(4);
        assertThat(all.stream().map(r -> r.get("route")))
            .containsExactly("PICKUP", "TBILISI", "GEORGIA", "EXPRESS");
        // A shop that never opened the screen must still be able to sell.
        assertThat(route("PICKUP").get("enabled")).isEqualTo(true);
    }

    @Test
    @Transactional
    void theLastEnabledRouteCannotBeSwitchedOff() {
        service.listForOwner(); // PICKUP is the only one on
        assertThatThrownBy(() -> service.update("PICKUP", Map.of("enabled", false)))
            .hasMessageContaining("only way");
    }

    @Test
    @Transactional
    void aRouteCanBeSwitchedOffOnceAnotherIsOn() {
        enable("TBILISI");
        service.update("PICKUP", Map.of("enabled", false));
        assertThat(route("PICKUP").get("enabled")).isEqualTo(false);
        assertThat(route("TBILISI").get("enabled")).isEqualTo(true);
    }

    @Test
    @Transactional
    void expressCannotBeEnabledWithoutACourier() {
        assertThatThrownBy(() -> service.update("EXPRESS", Map.of("enabled", true)))
            .hasMessageContaining("courier");
    }

    @Test
    @Transactional
    void expressCanBeEnabledOnceACourierIsOn() {
        enable("GEORGIA");
        enable("EXPRESS");
        assertThat(route("EXPRESS").get("enabled")).isEqualTo(true);
    }

    @Test
    @Transactional
    void turningOffTheLastCourierIsRefusedWhileExpressIsOn() {
        enable("TBILISI");
        enable("EXPRESS");
        // Silently disabling express too would hide the consequence.
        assertThatThrownBy(() -> service.update("TBILISI", Map.of("enabled", false)))
            .hasMessageContaining("express off first");
    }

    @Test
    @Transactional
    void theLastCourierCanGoOnceExpressIsOff() {
        enable("TBILISI");
        enable("EXPRESS");
        service.update("EXPRESS", Map.of("enabled", false));
        service.update("TBILISI", Map.of("enabled", false));
        assertThat(route("TBILISI").get("enabled")).isEqualTo(false);
    }

    @Test
    @Transactional
    void checkoutDropsTheAddressBlockWhenNoCourierIsOn() {
        service.listForOwner(); // pickup only
        assertThat(service.requiresAddress()).isFalse();
        enable("GEORGIA");
        assertThat(service.requiresAddress()).isTrue();
    }

    @Test
    @Transactional
    void theFreeOverThresholdAppliesAutomatically() {
        service.update("TBILISI", Map.of(
            "enabled", true, "price", "5.00", "freeOverTotal", "100.00"));

        assertThat(service.feeFor("TBILISI", new BigDecimal("99.99")))
            .isEqualByComparingTo("5.00");
        // At the threshold, not merely above it.
        assertThat(service.feeFor("TBILISI", new BigDecimal("100.00")))
            .isEqualByComparingTo("0");
        assertThat(service.feeFor("TBILISI", new BigDecimal("250.00")))
            .isEqualByComparingTo("0");
    }

    @Test
    @Transactional
    void aRouteTheStoreDoesNotOfferCannotBeCharged() {
        service.listForOwner();
        // GEORGIA exists as a row but is switched off — quoting a price for it
        // would let a shopper check out on a route the shop cannot serve.
        assertThatThrownBy(() -> service.feeFor("GEORGIA", new BigDecimal("10")))
            .hasMessageContaining("not offered");
    }

    @Test
    @Transactional
    void aNegativePriceIsRefused() {
        assertThatThrownBy(() -> service.update("TBILISI", Map.of("enabled", true, "price", "-1")))
            .hasMessageContaining("negative");
    }

    @Test
    @Transactional
    void thePublicListShowsOnlyEnabledRoutesInDisplayOrder() {
        enable("GEORGIA");
        enable("TBILISI");
        List<Map<String, Object>> shown = service.listPublic();
        assertThat(shown.stream().map(r -> r.get("route")))
            .containsExactly("PICKUP", "TBILISI", "GEORGIA");
    }

    @Test
    @Transactional
    void anUnknownRouteIsRefused() {
        assertThatThrownBy(() -> service.update("TELEPORT", Map.of("enabled", true)))
            .hasMessageContaining("Unknown delivery route");
    }

    @Test
    @Transactional
    void anUnconfiguredStoreStillOffersCollectionInPerson() {
        // No rows exist until the owner opens the screen. Answering "no routes"
        // would leave this store's shoppers unable to check out at all.
        List<Map<String, Object>> shown = service.listPublic();
        assertThat(shown).hasSize(1);
        assertThat(shown.get(0).get("route")).isEqualTo("PICKUP");
        assertThat(shown.get(0).get("enabled")).isEqualTo(true);

        // ...and the quote must agree with what the storefront just offered.
        assertThat(service.feeFor("PICKUP", new BigDecimal("40"))).isEqualByComparingTo("0");
        assertThat(service.requiresAddress()).isFalse();
    }

    @Test
    @Transactional
    void theImpliedPickupIsNotWrittenToTheDatabase() {
        // A shopper loading a page must not write rows.
        service.listPublic();
        assertThat(repository.findByTenant(
            tenantRepository.findBySubdomain(SUB).orElseThrow())).isEmpty();
    }

    @Test
    @Transactional
    void anUnconfiguredStoreDoesNotSilentlyOfferCouriers() {
        assertThatThrownBy(() -> service.feeFor("TBILISI", new BigDecimal("40")))
            .hasMessageContaining("not offered");
    }

    @Test
    void theCourierRoutesAreTheTwoThatPostAParcel() {
        assertThat(DeliveryOption.COURIER_ROUTES).containsExactly("TBILISI", "GEORGIA");
        assertThat(DeliveryOption.ROUTES).containsAll(DeliveryOption.COURIER_ROUTES);
    }
}
