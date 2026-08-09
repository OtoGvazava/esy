package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.ContactChannel;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ContactChannelRepository;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * The rules from decision D10 that a reader of the entity alone would not see:
 * the primary marker is exclusive and phone-only, hiding is not deleting, and
 * the storefront read never returns a hidden entry.
 *
 * <p>TenantContextService is mocked because it resolves the store from the HTTP
 * Host header, which no unit test has.
 */
@SpringBootTest
class ContactChannelServiceTest {

    @Autowired ContactChannelService service;
    @Autowired ContactChannelRepository repository;
    @Autowired TenantRepository tenantRepository;

    @MockBean TenantContextService tenantContextService;

    private static final String SUB = "contact-test-store";

    /**
     * Reuse the store rather than dropping and recreating it. Within one
     * transaction Hibernate orders inserts before deletes, so a
     * delete-then-insert of the same unique name collides — and the tests that
     * are not transactional leave the row behind for the next one.
     */
    private Tenant store(String subdomain, String name) {
        return tenantRepository.findBySubdomain(subdomain).orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName(name);
            t.setSubdomain(subdomain);
            t.setIsActive(true);
            return tenantRepository.save(t);
        });
    }

    @BeforeEach
    void setUp() {
        Tenant t = store(SUB, "Contact Test Store");
        repository.deleteAll(repository.findByTenantOrderBySortOrderAscIdAsc(t));
        when(tenantContextService.getCurrentTenant()).thenReturn(t);
    }

    private Map<String, Object> phone(String value, boolean primary) {
        return Map.of("type", "phone", "value", value, "isPrimary", primary);
    }

    @Test
    @Transactional
    void onlyOneChannelHoldsThePrimaryMarker() {
        Map<String, Object> first = service.create(phone("+995 555 000 001", true));
        Map<String, Object> second = service.create(phone("+995 555 000 002", true));

        assertThat(second.get("isPrimary")).isEqualTo(true);
        List<Map<String, Object>> all = service.listForOwner();
        assertThat(all).filteredOn(c -> Boolean.TRUE.equals(c.get("isPrimary"))).hasSize(1);
        assertThat(all.stream()
            .filter(c -> first.get("id").equals(c.get("id")))
            .findFirst().orElseThrow()
            .get("isPrimary")).isEqualTo(false);
    }

    @Test
    @Transactional
    void aHandleCannotBeThePrimaryContact() {
        // A "primary" Instagram handle tells a shopper nothing about how to call.
        assertThatThrownBy(() -> service.create(
            Map.of("type", "instagram", "value", "@shop", "isPrimary", true)))
            .hasMessageContaining("phone");
    }

    @Test
    @Transactional
    void whatsappCountsAsAPhoneForThePrimaryMarker() {
        Map<String, Object> saved = service.create(
            Map.of("type", "whatsapp", "value", "+995 555 000 003", "isPrimary", true));
        assertThat(saved.get("isPrimary")).isEqualTo(true);
    }

    @Test
    @Transactional
    void hidingKeepsTheValueWhereDeletingDiscardsIt() {
        Map<String, Object> saved = service.create(phone("+995 555 000 004", false));
        Long id = (Long) saved.get("id");

        service.update(id, Map.of("isPublic", false));

        // Gone from the storefront...
        assertThat(service.listPublic()).isEmpty();
        // ...but the owner still has the number to switch back on.
        assertThat(service.listForOwner()).hasSize(1);
        assertThat(service.listForOwner().get(0).get("value")).isEqualTo("+995 555 000 004");
    }

    @Test
    @Transactional
    void anUnknownChannelTypeIsRefused() {
        assertThatThrownBy(() -> service.create(Map.of("type", "TELEGRAM", "value", "@x")))
            .hasMessageContaining("Channel type");
    }

    @Test
    @Transactional
    void reorderWritesTheWholeOrderAtOnce() {
        Long a = (Long) service.create(phone("+995 555 000 011", false)).get("id");
        Long b = (Long) service.create(phone("+995 555 000 012", false)).get("id");
        Long c = (Long) service.create(phone("+995 555 000 013", false)).get("id");

        List<Map<String, Object>> reordered = service.reorder(List.of(c, a, b));
        assertThat(reordered.stream().map(m -> m.get("id")))
            .containsExactly(c, a, b);
    }

    @Test
    @Transactional
    void aStaleIdInAReorderDoesNotCostTheOwnerTheOrdering() {
        Long a = (Long) service.create(phone("+995 555 000 021", false)).get("id");
        Long b = (Long) service.create(phone("+995 555 000 022", false)).get("id");

        // 999999 belongs to no store — the list may have changed in another tab.
        List<Map<String, Object>> reordered = service.reorder(List.of(b, 999999L, a));
        assertThat(reordered.stream().map(m -> m.get("id"))).containsExactly(b, a);
    }

    @Test
    @Transactional
    void thePublicReadNeverReturnsHiddenEntries() {
        service.create(Map.of("type", "phone", "value", "+995 555 000 031", "isPublic", true));
        service.create(Map.of("type", "facebook", "value", "fb/shop", "isPublic", false));

        assertThat(service.listPublic()).hasSize(1);
        assertThat(service.listPublic().get(0).get("type")).isEqualTo("phone");
        assertThat(service.listForOwner()).hasSize(2);
    }

    @Test
    @Transactional
    void oneStoreCannotReachAnotherStoresChannelById() {
        Long id = (Long) service.create(phone("+995 555 000 041", false)).get("id");

        when(tenantContextService.getCurrentTenant())
            .thenReturn(store("contact-test-other", "Other Contact Store"));

        assertThatThrownBy(() -> service.update(id, Map.of("value", "hijacked")))
            .hasMessageContaining("No such contact channel");
    }

    @Test
    @Transactional
    void theListIsBounded() {
        for (int i = 0; i < 12; i++) service.create(phone("+995 555 100 0" + i, false));
        assertThatThrownBy(() -> service.create(phone("+995 555 999 999", false)))
            .hasMessageContaining("at most");
    }

    @Test
    @Transactional
    void theTypeIsStoredLowercaseWhateverCasingArrives() {
        // The stored string is the API value, the brand-colour key and the i18n
        // key all at once, so it has to be one spelling.
        Map<String, Object> saved = service.create(Map.of("type", "WhatsApp", "value", "+995 555 1"));
        assertThat(saved.get("type")).isEqualTo("whatsapp");
    }

    @Test
    void everyDeclaredTypeIsAccepted() {
        assertThat(ContactChannel.TYPES).containsExactly("phone", "whatsapp", "facebook", "instagram");
        assertThat(ContactChannel.PHONE_TYPES).allMatch(ContactChannel.TYPES::contains);
    }
}
