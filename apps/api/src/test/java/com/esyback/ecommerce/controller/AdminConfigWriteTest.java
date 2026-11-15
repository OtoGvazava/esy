package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.config.AppProperties;
import com.esyback.ecommerce.config.BogProperties;
import com.esyback.ecommerce.config.DesignProperties;
import com.esyback.ecommerce.config.EmailProperties;
import com.esyback.ecommerce.config.PlatformProperties;
import com.esyback.ecommerce.config.SmsProperties;
import com.esyback.ecommerce.entity.AuditLog;
import com.esyback.ecommerce.repository.AuditLogRepository;
import com.esyback.ecommerce.service.ConfigStore;
import com.esyback.ecommerce.service.EmailSender;
import com.esyback.ecommerce.service.EmailTemplates;
import com.esyback.ecommerce.service.SmsSender;
import com.esyback.ecommerce.service.SmsTemplates;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The admin config and integrations screens write all or nothing, and leave a
 * trail (review, Low: "A config PUT applies earlier keys before a later key
 * fails validation" and "Live config and integration writes leave no audit
 * trail").
 */
class AdminConfigWriteTest {

    private final ConfigStore store = mock(ConfigStore.class);
    private final PlatformProperties platform = mock(PlatformProperties.class);
    private final AuditLogRepository audit = mock(AuditLogRepository.class);
    private final AdminConfigController config = new AdminConfigController(mock(BogProperties.class),
        platform, mock(AppProperties.class), store, mock(DesignProperties.class), audit);

    private final SmsProperties sms = mock(SmsProperties.class);
    private final SmsTemplates smsTemplates = mock(SmsTemplates.class);
    private final AdminIntegrationsController integrations = new AdminIntegrationsController(sms, smsTemplates,
        mock(SmsSender.class), mock(EmailProperties.class), mock(EmailTemplates.class), mock(EmailSender.class), audit);

    private static TestingAuthenticationToken admin() {
        return new TestingAuthenticationToken("boss@esy.ge", null, "ROLE_ADMIN");
    }

    @Test
    @DisplayName("a config body with one bad value writes nothing, not the values before it")
    void configAllOrNothing() {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("serviceFeeRate", "0.05");
        body.put("bogEnv", "production");
        assertThatThrownBy(() -> config.update(body, admin())).isInstanceOf(ResponseStatusException.class);
        verify(store, never()).set(anyString(), anyString());
        verify(audit, never()).save(any());
    }

    @Test
    @DisplayName("a config write is audited with who changed it, from what, to what")
    void configAudited() {
        when(platform.getServiceFeeRate()).thenReturn(new BigDecimal("0.02"));
        config.update(Map.of("serviceFeeRate", "0.05"), admin());

        verify(store).set("app.platform.service-fee-rate", "0.05");
        ArgumentCaptor<AuditLog> row = ArgumentCaptor.forClass(AuditLog.class);
        verify(audit).save(row.capture());
        assertThat(row.getValue().getActorEmail()).isEqualTo("boss@esy.ge");
        assertThat(row.getValue().getTargetId()).isEqualTo("serviceFeeRate");
        assertThat(row.getValue().getDetail()).isEqualTo("0.02 -> 0.05");
    }

    @Test
    @DisplayName("an integrations body with one bad value writes nothing")
    void integrationsAllOrNothing() {
        when(smsTemplates.isEnabled(anyString())).thenReturn(true);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sender", "esy");
        body.put("enabled", false);
        body.put("templateEnabled", Map.of("otp", false)); // the OTP cannot be switched off
        assertThatThrownBy(() -> integrations.update(body, admin())).isInstanceOf(ResponseStatusException.class);
        verify(sms, never()).setSender(anyString());
        verify(sms, never()).setEnabled(anyBoolean());
        verify(audit, never()).save(any());
    }

    @Test
    @DisplayName("turning SMS off is audited")
    void killSwitchAudited() {
        when(sms.isEnabled()).thenReturn(true);
        integrations.update(Map.of("enabled", false), admin());

        verify(sms).setEnabled(false);
        ArgumentCaptor<AuditLog> row = ArgumentCaptor.forClass(AuditLog.class);
        verify(audit).save(row.capture());
        assertThat(row.getValue().getActorEmail()).isEqualTo("boss@esy.ge");
        assertThat(row.getValue().getTargetId()).isEqualTo("sms.enabled");
        assertThat(row.getValue().getDetail()).isEqualTo("true -> false");
    }
}
