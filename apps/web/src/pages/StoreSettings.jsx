import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { tenantApi, handleApiError } from '../utils/api';
import { useGlow } from '../styles/glow';
import { Icon } from '../components/glow/GlowPrimitives';
import { GlowScreen } from '../components/glow/GlowChrome';

// Server-allowed store categories (mirrors TenantService.CATEGORIES).
const CATEGORIES = ['fashion', 'electronics', 'home', 'food', 'art'];

const devTenant = () => {
  try { return new URLSearchParams(window.location.search).get('tenant') || undefined; }
  catch { return undefined; }
};

// Full-page store settings (the former Edit-store modal, now a route).
// Styled to match the new-store flow (CreateStore): accent glow, centered
// 460px column, same field + colour controls. Owner/admin only — shoppers and
// non-owners are bounced home. Branding only: subdomain + unique name stay
// fixed (routing key / SSO cookie domain).
export default function StoreSettings() {
  const navigate = useNavigate();
  const { t } = useTranslation(['owner', 'common']);
  const { canManageStore, loading: authLoading } = useAuth();
  const { T } = useGlow();
  const { tenant, refresh } = useTenant();

  const [form, setForm] = useState({
    displayName: '', description: '', logoUrl: '',
    category: '', primaryColor: '#6366f1', secondaryColor: '#8b5cf6',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (!authLoading && !canManageStore) navigate('/');
  }, [authLoading, canManageStore, navigate]);

  useEffect(() => {
    if (!tenant) return;
    setForm({
      displayName: tenant.displayName || tenant.name || '',
      description: tenant.description || '',
      logoUrl: tenant.logoUrl || '',
      category: tenant.category || '',
      primaryColor: tenant.primaryColor || '#6366f1',
      secondaryColor: tenant.secondaryColor || '#8b5cf6',
    });
  }, [tenant]);

  const set = (field) => (e) => {
    setSaved(false);
    setForm((p) => ({ ...p, [field]: e.target.value }));
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setApiError('');
    setSaved(false);
    try {
      await tenantApi.update({
        displayName: form.displayName.trim(),
        description: form.description.trim(),
        logoUrl: form.logoUrl.trim(),
        category: form.category,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
      }, devTenant());
      await refresh();
      setSaved(true);
    } catch (err) {
      setApiError(handleApiError(err, t('storeSaveFailed')));
    } finally {
      setSaving(false);
    }
  };

  // Field / label / colour styles copied from CreateStore so the two flows
  // are visually identical.
  const field = {
    width: '100%',
    height: 52,
    padding: '0 16px',
    borderRadius: 14,
    background: T.surface,
    border: `1.5px solid ${T.border}`,
    color: T.text,
    font: `500 14px ${T.font}`,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const label = {
    font: `500 10.5px ${T.font}`,
    color: T.textMute,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: 6,
  };

  const swatch = {
    width: 52, height: 52, padding: 0,
    border: `1.5px solid ${T.border}`, borderRadius: 14,
    background: T.surface, cursor: 'pointer',
  };

  const colorField = (key) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <input type="color" value={form[key]} onChange={set(key)} style={swatch} />
      <span style={{ font: `600 14px ${T.mono}`, color: T.textDim }}>{form[key]}</span>
    </div>
  );

  return (
    <GlowScreen T={T} padBottom={40}>
      <div style={{ position: 'absolute', top: -160, left: -80, right: -80, height: 360, background: `radial-gradient(60% 80% at 50% 30%, ${form.primaryColor}48, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 460, margin: '0 auto', position: 'relative' }}>
        <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => navigate(-1)} aria-label={t('cancel', { ns: 'common', defaultValue: 'Close' })} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon.close /></button>
        </div>

        <div style={{ padding: '16px 24px 24px', textAlign: 'center' }}>
          <div style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.03em' }}>
            {t('storeTitle')}
          </div>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={label}>{t('fieldDisplayName')}</div>
            <input value={form.displayName} onChange={set('displayName')} style={field} />
          </div>

          <div>
            <div style={label}>{t('fieldStoreDescription')}</div>
            <textarea
              value={form.description} onChange={set('description')} rows={3}
              style={{ ...field, height: 'auto', padding: '12px 16px', resize: 'vertical' }}
            />
          </div>

          <div>
            <div style={label}>{t('fieldLogoUrl')}</div>
            <input value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://…" style={field} />
          </div>

          <div>
            <div style={label}>{t('fieldCategory')}</div>
            <select value={form.category} onChange={set('category')} style={field}>
              <option value="">{t('catNone')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`cat_${c}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={label}>{t('fieldPrimary')}</div>
            {colorField('primaryColor')}
          </div>

          <div>
            <div style={label}>{t('fieldSecondary')}</div>
            {colorField('secondaryColor')}
          </div>

          {apiError && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: `${T.danger}14`, border: `1px solid ${T.danger}40`, color: T.danger, font: `500 12.5px ${T.font}` }}>
              {apiError}
            </div>
          )}

          <button onClick={submit} disabled={saving} style={{ width: '100%', height: 54, borderRadius: 16, border: 'none', background: T.grad, color: '#fff', font: `700 14.5px ${T.font}`, cursor: saving ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}>
            {saving ? t('saving') : <>{t('save')} <Icon.check /></>}
          </button>

          {saved && !saving && (
            <div style={{ textAlign: 'center', font: `600 13px ${T.font}`, color: T.success }}>
              {t('settingsSaved')}
            </div>
          )}
        </div>
      </div>
    </GlowScreen>
  );
}
