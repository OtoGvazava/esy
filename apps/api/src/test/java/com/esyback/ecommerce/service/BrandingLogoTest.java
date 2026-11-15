package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.UpdateStoreRequest;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.TenantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A branding save leaves a logo it did not mention alone, and the live fee
 * rate is public for the screens that state it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BrandingLogoTest {

    @Autowired TenantService tenantService;
    @Autowired TenantRepository tenantRepository;
    @Autowired MockMvc mvc;

    private Tenant store() {
        return tenantRepository.findBySubdomain("branding-logo-store").orElseGet(() -> {
            Tenant t = new Tenant();
            t.setName("Branding Logo Store");
            t.setSubdomain("branding-logo-store");
            t.setIsActive(true);
            t.setLogoUrl("/api/tenant/logo/7");
            return tenantRepository.save(t);
        });
    }

    @Test
    @DisplayName("a save without logoUrl keeps the logo; a blank one clears it")
    void absentKeepsBlankClears() {
        Tenant t = store();
        UpdateStoreRequest keep = new UpdateStoreRequest();
        keep.setDisplayName("Renamed");
        assertThat(tenantService.updateBranding(t, keep).getLogoUrl()).isEqualTo("/api/tenant/logo/7");

        UpdateStoreRequest clear = new UpdateStoreRequest();
        clear.setDisplayName("Renamed");
        clear.setLogoUrl("");
        assertThat(tenantService.updateBranding(t, clear).getLogoUrl()).isNull();
    }

    @Test
    @DisplayName("the service fee rate is public")
    void feeRateIsPublic() throws Exception {
        mvc.perform(get("/api/tenant/fee-rate"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.serviceFeeRate").isNumber());
    }
}
