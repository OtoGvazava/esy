package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateTenantRequest;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.TenantRepository;
import com.esyback.ecommerce.security.SecretCipher;
import com.esyback.ecommerce.web.ApiRefusal;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * How the store row is written (review, Low: tenancy and products).
 */
@SpringBootTest
class TenantRowWritesTest {

    @Autowired EntityManagerFactory emf;
    @Autowired TenantRepository tenantRepository;
    @Autowired TenantService tenantService;

    private Tenant store(String sub) {
        Tenant t = new Tenant();
        t.setName("Row writes " + sub);
        t.setSubdomain(sub);
        t.setIsActive(true);
        return tenantRepository.saveAndFlush(t);
    }

    @Test
    @DisplayName("two requests holding the same store each keep their own change")
    void staleCopiesDoNotUndoEachOther() {
        Long id = store("row-writes-race").getId();

        // Two requests load the store before either writes, as a draft save
        // and an admin's suspension arriving together do.
        EntityManager draftRequest = emf.createEntityManager();
        EntityManager adminRequest = emf.createEntityManager();
        try {
            draftRequest.getTransaction().begin();
            Tenant asDrafter = draftRequest.find(Tenant.class, id);
            adminRequest.getTransaction().begin();
            Tenant asAdmin = adminRequest.find(Tenant.class, id);

            asAdmin.setSuspendedAt(Instant.now());
            asAdmin.setSuspendedBy("admin@esy.test");
            adminRequest.getTransaction().commit();

            asDrafter.setDesignDraft("{\"theme\":\"glow\"}");
            draftRequest.getTransaction().commit();
        } finally {
            draftRequest.close();
            adminRequest.close();
        }

        Tenant after = tenantRepository.findById(id).orElseThrow();
        // The draft save wrote its own columns only: the suspension stands.
        assertThat(after.getSuspendedAt()).isNotNull();
        assertThat(after.getDesignDraft()).isEqualTo("{\"theme\":\"glow\"}");
    }

    @Test
    @DisplayName("the directory lists active stores only, newest first")
    void directoryIsActiveNewestFirst() {
        Tenant older = store("row-writes-older");
        Tenant newer = store("row-writes-newer");
        Tenant closed = store("row-writes-closed");
        older.setCreatedAt(LocalDateTime.now().minusDays(3));
        newer.setCreatedAt(LocalDateTime.now().plusDays(1));
        closed.setIsActive(false);
        tenantRepository.saveAllAndFlush(List.of(older, newer, closed));

        List<String> subs = tenantService.listActiveStores().stream().map(Tenant::getSubdomain).toList();
        assertThat(subs).doesNotContain("row-writes-closed");
        assertThat(subs.indexOf("row-writes-newer")).isLessThan(subs.indexOf("row-writes-older"));
        assertThat(subs.get(0)).isEqualTo("row-writes-newer");
    }

    @Test
    @DisplayName("losing a sign-up race for a subdomain is a 409, not a 500")
    void uniqueRaceIsAConflict() {
        TenantRepository repo = Mockito.mock(TenantRepository.class);
        when(repo.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate key"));
        TenantService service = new TenantService(repo, Mockito.mock(SecretCipher.class),
            Mockito.mock(TenantDesignService.class));
        CreateTenantRequest req = new CreateTenantRequest();
        req.setName("Raced");
        req.setSubdomain("raced-store");

        assertThatThrownBy(() -> service.createTenant(req))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    @DisplayName("a field longer than its column is refused by name, and nothing is saved")
    void overlongFieldIsRefused() {
        CreateTenantRequest req = new CreateTenantRequest();
        req.setName("Long fields");
        req.setSubdomain("row-writes-long");
        req.setAddressStreet("x".repeat(TenantService.FIELD_MAX + 1));

        assertThatThrownBy(() -> tenantService.createTenant(req))
            .isInstanceOfSatisfying(ApiRefusal.class, e -> {
                assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(e.getCode()).isEqualTo("STORE_FIELD_TOO_LONG");
                assertThat(e.getDetails()).containsEntry("field", "addressStreet");
            });
        assertThat(tenantRepository.findBySubdomain("row-writes-long")).isEmpty();
    }
}
