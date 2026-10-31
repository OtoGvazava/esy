package com.esyback.ecommerce.config;

import com.esyback.ecommerce.controller.AdminConfigController;
import com.esyback.ecommerce.service.ConfigStore;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The store design kill switch, {@code app.design.enabled}: how it reads, and
 * that admin.esy.ge/config can flip it.
 */
class DesignSwitchTest {

    private final ConfigStore store = mock(ConfigStore.class);
    private final DesignProperties design = new DesignProperties(store);

    @Test
    @DisplayName("on unless it says false, like the SMS and email switches")
    void onUnlessFalse() {
        for (String on : List.of("true", "TRUE", "", "yes")) {
            when(store.get(DesignProperties.ENABLED_KEY, "true")).thenReturn(on);
            assertTrue(design.isEnabled(), "'" + on + "'");
        }
        for (String off : List.of("false", "FALSE", " false ")) {
            when(store.get(DesignProperties.ENABLED_KEY, "true")).thenReturn(off);
            assertFalse(design.isEnabled(), "'" + off + "'");
        }
    }

    @Test
    @DisplayName("flipping it writes the live key, as true or false")
    void writesTheLiveKey() {
        design.setEnabled(false);
        verify(store).set("app.design.enabled", "false");
        design.setEnabled(true);
        verify(store).set("app.design.enabled", "true");
    }

    @Test
    @DisplayName("the admin config screen lists it with the other live keys and writes only true or false")
    void adminConfigCarriesIt() {
        DesignProperties switchBean = mock(DesignProperties.class);
        AdminConfigController admin = new AdminConfigController(mock(BogProperties.class),
            mock(PlatformProperties.class), mock(AppProperties.class), store, switchBean);

        when(switchBean.isEnabled()).thenReturn(false);
        assertEquals(false, admin.current().get("designEnabled"));

        // The screen saves every row as a string; a JSON boolean binds to the same.
        admin.update(Map.of("designEnabled", " FALSE "));
        verify(switchBean).setEnabled(false);

        ResponseStatusException refused = assertThrows(ResponseStatusException.class,
            () -> admin.update(Map.of("designEnabled", "maybe")));
        assertEquals(422, refused.getStatusCode().value());

        // Neither the refused value nor a save of another row touched it again.
        admin.update(Map.of("bogEnv", "sandbox"));
        verify(switchBean, times(1)).setEnabled(anyBoolean());
    }
}
