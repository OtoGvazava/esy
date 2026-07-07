import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useGlow } from '../styles/glow';
import { adminApi, handleApiError } from '../utils/api';
import { GlowScreen } from '../components/glow/GlowChrome';
import { Icon } from '../components/glow/GlowPrimitives';

// ADMIN-only live config screen. Reads the currently-effective values and
// writes changes to the config store (Redis/Valkey) via /api/admin/config; the app
// picks them up within a couple of seconds — no redeploy.
export default function ConfigSettings() {
  const navigate = useNavigate();
  const { t } = useTranslation(['adminConfig', 'common']);
  const { isAdmin, loading: authLoading } = useAuth();
  const { T } = useGlow();

  const [form, setForm] = useState({
    serviceFeeRate: '', bogEnv: 'live', bogAuthUrl: '', bogBaseUrl: '', publicBaseUrl: '',
  });
  const [storeReady, setStoreReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/');
  }, [authLoading, isAdmin, navigate]);

  const load = useCallback(async () => {
    try {
      const d = await adminApi.getConfig();
      setForm({
        serviceFeeRate: d?.serviceFeeRate != null ? String(d.serviceFeeRate) : '',
        bogEnv: d?.bogEnv || 'live',
        bogAuthUrl: d?.bogAuthUrl || '',
        bogBaseUrl: d?.bogBaseUrl || '',
        publicBaseUrl: d?.publicBaseUrl || '',
      });
      setStoreReady(!!d?.storeReady);
    } catch (e) {
      setApiError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin, load]);

  const set = (k) => (e) => { setSaved(false); setForm((p) => ({ ...p, [k]: e.target.value })); };

  const save = async () => {
    if (saving || !storeReady) return;
    setSaving(true); setApiError(''); setSaved(false);
    try {
      await adminApi.updateConfig({
        serviceFeeRate: form.serviceFeeRate.trim(),
        bogEnv: form.bogEnv,
        bogAuthUrl: form.bogAuthUrl.trim(),
        bogBaseUrl: form.bogBaseUrl.trim(),
        publicBaseUrl: form.publicBaseUrl.trim(),
      });
      setSaved(true);
      // The store's cache TTL applies the change in ~1-2s; re-pull to show it.
      setTimeout(load, 2500);
    } catch (e) {
      setApiError(handleApiError(e, t('saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const field = {
    width: '100%', height: 52, padding: '0 16px', borderRadius: 14,
    background: T.surface, border: `1.5px solid ${T.border}`, color: T.text,
    font: `500 14px ${T.font}`, outline: 'none', boxSizing: 'border-box',
  };
  const label = {
    font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em',
    textTransform: 'uppercase', marginBottom: 6,
  };
  const hint = { marginTop: 6, font: `500 11.5px ${T.font}`, color: T.textMute };

  if (authLoading || (isAdmin && loading)) {
    return (
      <GlowScreen T={T}>
        <div style={{ padding: '80px 24px', textAlign: 'center', color: T.textDim, font: `500 14px ${T.font}` }}>
          {t('loading', { ns: 'common', defaultValue: 'Loading…' })}
        </div>
      </GlowScreen>
    );
  }

  return (
    <GlowScreen T={T} padBottom={40}>
      <div style={{ position: 'absolute', top: -160, left: -80, right: -80, height: 360, background: `radial-gradient(60% 80% at 50% 30%, ${T.accent}40, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 460, margin: '0 auto', position: 'relative' }}>
        <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => navigate(-1)} aria-label={t('cancel', { ns: 'common', defaultValue: 'Close' })} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon.close /></button>
        </div>

        <div style={{ padding: '16px 24px 8px', textAlign: 'center' }}>
          <div style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.03em' }}>{t('title')}</div>
          <div style={{ marginTop: 8, font: `500 13px/1.5 ${T.font}`, color: T.textDim }}>{t('subtitle')}</div>
        </div>

        {/* Config store connectivity badge */}
        <div style={{ padding: '4px 20px 12px', display: 'flex', justifyContent: 'center' }}>
          <span style={{
            font: `700 10.5px ${T.font}`, letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '6px 12px', borderRadius: 999,
            background: storeReady ? `${T.success}1f` : `${T.danger}14`,
            color: storeReady ? T.success : T.danger,
            border: `1px solid ${storeReady ? `${T.success}55` : `${T.danger}55`}`,
          }}>
            {storeReady ? t('storeConnected') : t('storeOffline')}
          </span>
        </div>

        {!storeReady && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: `${T.danger}12`, border: `1px solid ${T.danger}44`, color: T.danger, font: `500 12.5px/1.5 ${T.font}` }}>
              {t('storeOfflineHint')}
            </div>
          </div>
        )}

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={label}>{t('serviceFeeRate')}</div>
            <input type="number" step="0.001" min="0" max="1" value={form.serviceFeeRate} onChange={set('serviceFeeRate')} placeholder="0.02" style={field} />
            <div style={hint}>{t('serviceFeeRateHint')}</div>
          </div>

          <div>
            <div style={label}>{t('bogEnv')}</div>
            <select value={form.bogEnv} onChange={set('bogEnv')} style={field}>
              <option value="live">{t('bogEnvLive')}</option>
              <option value="sandbox">{t('bogEnvSandbox')}</option>
            </select>
            <div style={hint}>{t('bogEnvHint')}</div>
          </div>

          <div>
            <div style={label}>{t('publicBaseUrl')}</div>
            <input value={form.publicBaseUrl} onChange={set('publicBaseUrl')} placeholder="https://www.esy.ge" style={field} />
            <div style={hint}>{t('publicBaseUrlHint')}</div>
          </div>

          <details>
            <summary style={{ cursor: 'pointer', font: `600 12.5px ${T.font}`, color: T.accentFg, marginBottom: 8 }}>{t('advanced')}</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
              <div>
                <div style={label}>{t('bogAuthUrl')}</div>
                <input value={form.bogAuthUrl} onChange={set('bogAuthUrl')} placeholder={t('deriveFromEnv')} style={field} />
              </div>
              <div>
                <div style={label}>{t('bogBaseUrl')}</div>
                <input value={form.bogBaseUrl} onChange={set('bogBaseUrl')} placeholder={t('deriveFromEnv')} style={field} />
              </div>
            </div>
          </details>

          {apiError && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: `${T.danger}14`, border: `1px solid ${T.danger}40`, color: T.danger, font: `500 12.5px ${T.font}` }}>{apiError}</div>
          )}

          <button onClick={save} disabled={saving || !storeReady} style={{ width: '100%', height: 54, borderRadius: 16, border: 'none', background: T.grad, color: '#fff', font: `700 14.5px ${T.font}`, cursor: saving || !storeReady ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving || !storeReady ? 0.6 : 1 }}>
            {saving ? t('saving') : <>{t('save')} <Icon.check /></>}
          </button>

          {saved && !saving && (
            <div style={{ textAlign: 'center', font: `600 13px ${T.font}`, color: T.success }}>{t('savedLive')}</div>
          )}
        </div>
      </div>
    </GlowScreen>
  );
}
