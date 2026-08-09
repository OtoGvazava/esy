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
            .containsExactly("pickup", "tbilisi", "georgia", "express");
        // A shop that never opened the screen must still be able to sell.
        assertThat(route("pickup").get("enabled")).isEqualTo(true);
    }

    @Test
    @Transactional
    void theLastEnabledRouteCannotBeSwitchedOff() {
        service.listForOwner(); // PICKUP is the only one on
        assertThatThrownBy(() -> service.update("pickup", Map.of("enabled", false)))
            .hasMessageContaining("only way");
    }

    @Test
    @Transactional
    void aRouteCanBeSwitchedOffOnceAnotherIsOn() {
        enable("tbilisi");
        service.update("pickup", Map.of("enabled", false));
        assertThat(route("pickup").get("enabled")).isEqualTo(false);
        assertThat(route("tbilisi").get("enabled")).isEqualTo(true);
    }

    @Test
    @Transactional
    void expressCannotBeEnabledWithoutACourier() {
        assertThatThrownBy(() -> service.update("express", Map.of("enabled", true)))
            .hasMessageContaining("courier");
    }

    @Test
    @Transactional
    void expressCanBeEnabledOnceACourierIsOn() {
        enable("georgia");
        enable("express");
        assertThat(route("express").get("enabled")).isEqualTo(true);
    }

    @Test
    @Transactional
    void turningOffTheLastCourierIsRefusedWhileExpressIsOn() {
        enable("tbilisi");
        enable("express");
        // Silently disabling express too would hide the consequence.
        assertThatThrownBy(() -> service.update("tbilisi", Map.of("enabled", false)))
            .hasMessageContaining("express off first");
    }

    @Test
    @Transactional
    void theLastCourierCanGoOnceExpressIsOff() {
        enable("tbilisi");
        enable("express");
        service.update("express", Map.of("enabled", false));
        service.update("tbilisi", Map.of("enabled", false));
        assertThat(route("tbilisi").get("enabled")).isEqualTo(false);
    }

    @Test
    @Transactional
    void checkoutDropsTheAddressBlockWhenNoCourierIsOn() {
        service.listForOwner(); // pickup only
        assertThat(service.requiresAddress()).isFalse();
        enable("georgia");
        assertThat(service.requiresAddress()).isTrue();
    }

    @Test
    @Transactional
    void theFreeOverThresholdAppliesAutomatically() {
        service.update("tbilisi", Map.of(
            "enabled", true, "price", "5.00", "freeOverTotal", "100.00"));

        assertThat(service.feeFor("tbilisi", false, new BigDecimal("99.99")))
            .isEqualByComparingTo("5.00");
        // At the threshold, not merely above it.
        assertThat(service.feeFor("tbilisi", false, new BigDecimal("100.00")))
            .isEqualByComparingTo("0");
        assertThat(service.feeFor("tbilisi", false, new BigDecimal("250.00")))
            .isEqualByComparingTo("0");
    }

    @Test
    @Transactional
    void aRouteTheStoreDoesNotOfferCannotBeCharged() {
        service.listForOwner();
        // GEORGIA exists as a row but is switched off — quoting a price for it
        // would let a shopper check out on a route the shop cannot serve.
        assertThatThrownBy(() -> service.feeFor("georgia", false, new BigDecimal("10")))
            .hasMessageContaining("not offered");
    }

    @Test
    @Transactional
    void aNegativePriceIsRefused() {
        assertThatThrownBy(() -> service.update("tbilisi", Map.of("enabled", true, "price", "-1")))
            .hasMessageContaining("negative");
    }

    @Test
    @Transactional
    void thePublicListShowsOnlyEnabledRoutesInDisplayOrder() {
        enable("georgia");
        enable("tbilisi");
        List<Map<String, Object>> shown = service.listPublic();
        assertThat(shown.stream().map(r -> r.get("route")))
            .containsExactly("pickup", "tbilisi", "georgia");
    }

    @Test
    @Transactional
    void anUnknownRouteIsRefused() {
        assertThatThrownBy(() -> service.update("teleport", Map.of("enabled", true)))
            .hasMessageContaining("Unknown delivery route");
    }

    @Test
    @Transactional
    void anUnconfiguredStoreStillOffersCollectionInPerson() {
        // No rows exist until the owner opens the screen. Answering "no routes"
        // would leave this store's shoppers unable to check out at all.
        List<Map<String, Object>> shown = service.listPublic();
        assertThat(shown).hasSize(1);
        assertThat(shown.get(0).get("route")).isEqualTo("pickup");
        assertThat(shown.get(0).get("enabled")).isEqualTo(true);

        // ...and the quote must agree with what the storefront just offered.
        assertThat(service.feeFor("pickup", false, new BigDecimal("40"))).isEqualByComparingTo("0");
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
        assertThatThrownBy(() -> service.feeFor("tbilisi", false, new BigDecimal("40")))
            .hasMessageContaining("not offered");
    }

    // ─── Express is an upgrade, not a route ─────────────────────────────────
    // The design's checkout renders it as a "+₾" row that appears only once a
    // courier is chosen. Treating it as a fourth radio button would let a
    // shopper buy speed without buying any delivery to accelerate.

    @Test
    @Transactional
    void expressIsNotOfferedAsAWayToReceiveAnOrder() {
        enable("tbilisi");
        enable("express");
        assertThat(service.listPublic().stream().map(r -> r.get("route")))
            .containsExactly("pickup", "tbilisi")
            .doesNotContain("express");
    }

    @Test
    @Transactional
    void expressIsOfferedSeparatelyWithItsOwnPrice() {
        enable("tbilisi");
        service.update("express", Map.of("enabled", true, "price", "12.00"));

        Map<String, Object> offer = service.expressOffer();
        assertThat(offer).isNotNull();
        assertThat(offer.get("price")).isEqualTo(new BigDecimal("12.00"));
    }

    @Test
    @Transactional
    void aStoreWithoutExpressOffersNothingToUpgradeTo() {
        enable("tbilisi");
        assertThat(service.expressOffer()).isNull();
    }

    @Test
    @Transactional
    void expressAddsToTheCourierPriceRatherThanReplacingIt() {
        service.update("tbilisi", Map.of("enabled", true, "price", "8.00"));
        service.update("express", Map.of("enabled", true, "price", "12.00"));

        assertThat(service.feeFor("tbilisi", false, new BigDecimal("50"))).isEqualByComparingTo("8.00");
        assertThat(service.feeFor("tbilisi", true, new BigDecimal("50"))).isEqualByComparingTo("20.00");
    }

    @Test
    @Transactional
    void aFreeRouteStillChargesForSpeed() {
        // Free delivery over 150 is a gift of the courier fee, not of same-day.
        service.update("tbilisi", Map.of(
            "enabled", true, "price", "8.00", "freeOverTotal", "150.00"));
        service.update("express", Map.of("enabled", true, "price", "12.00"));

        assertThat(service.feeFor("tbilisi", true, new BigDecimal("200"))).isEqualByComparingTo("12.00");
    }

    @Test
    @Transactional
    void expressCannotBeBoughtAsIfItWereARoute() {
        enable("tbilisi");
        enable("express");
        assertThatThrownBy(() -> service.feeFor("express", false, new BigDecimal("50")))
            .hasMessageContaining("not a route of its own");
    }

    @Test
    @Transactional
    void thereIsNothingToAccelerateAboutCollectingInPerson() {
        enable("tbilisi");
        enable("express");
        assertThatThrownBy(() -> service.feeFor("pickup", true, new BigDecimal("50")))
            .hasMessageContaining("nothing to accelerate");
    }

    @Test
    @Transactional
    void expressCannotBeAddedWhenTheStoreDoesNotOfferIt() {
        enable("tbilisi");
        assertThatThrownBy(() -> service.feeFor("tbilisi", true, new BigDecimal("50")))
            .hasMessageContaining("does not offer express");
    }

    @Test
    void theCourierRoutesAreTheTwoThatPostAParcel() {
        assertThat(DeliveryOption.COURIER_ROUTES).containsExactly("tbilisi", "georgia");
        assertThat(DeliveryOption.ROUTES).containsAll(DeliveryOption.COURIER_ROUTES);
    }
}
