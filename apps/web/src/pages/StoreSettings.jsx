import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { tenantApi, handleApiError } from '../utils/api';
import { useGlow } from '../styles/glow';
import { Icon } from '../components/glow/GlowPrimitives';
import { GlowScreen } from '../components/glow/GlowChrome';
import { ContactChannelsEditor } from '../components/store/ContactChannels';

// Server-allowed store categories (mirrors TenantService.CATEGORIES).
const CATEGORIES = ['fashion', 'electronics', 'home', 'food', 'art', 'sport', 'wear'];

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
  const { isStoreOwner, loading: authLoading } = useAuth();
  const { T } = useGlow();
  const { tenant, refresh } = useTenant();

  const [form, setForm] = useState({
    displayName: '', description: '', logoUrl: '',
    category: '', primaryColor: '#6366f1', secondaryColor: '#8b5cf6',
    addressStreet: '', addressCity: '', addressCountry: '',
    addressPostalCode: '', establishedYear: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef(null);

  // BOG credentials are never sent back to the browser (only tenant
  // .bogConfigured), so these stay out of `form` (which resets from tenant).
  // bogDirty gates whether the save payload carries the BOG keys at all —
  // a plain branding save must leave the stored credentials untouched.
  const [bogClientId, setBogClientId] = useState('');
  const [bogSecret, setBogSecret] = useState('');
  const [bogDirty, setBogDirty] = useState(false);

  useEffect(() => {
    if (!authLoading && !isStoreOwner) navigate('/'); // OWNER-only: the API refuses MANAGERs here
  }, [authLoading, isStoreOwner, navigate]);

  useEffect(() => {
    if (!tenant) return;
    setForm({
      displayName: tenant.displayName || tenant.name || '',
      description: tenant.description || '',
      logoUrl: tenant.logoUrl || '',
      category: tenant.category || '',
      primaryColor: tenant.primaryColor || '#6366f1',
      secondaryColor: tenant.secondaryColor || '#8b5cf6',
      addressStreet: tenant.addressStreet || '',
      addressCity: tenant.addressCity || '',
      addressCountry: tenant.addressCountry || '',
      addressPostalCode: tenant.addressPostalCode || '',
      establishedYear: tenant.establishedYear ? String(tenant.establishedYear) : '',
    });
  }, [tenant]);

  const set = (field) => (e) => {
    setSaved(false);
    setForm((p) => ({ ...p, [field]: e.target.value }));
  };

  const onLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file || logoBusy) return;
    setLogoBusy(true);
    setApiError('');
    setSaved(false);
    try {
      const t2 = await tenantApi.uploadLogo(file, devTenant());
      setForm((p) => ({ ...p, logoUrl: t2.logoUrl || '' }));
      await refresh();
    } catch (err) {
      setApiError(handleApiError(err, t('logoUploadFailed')));
    } finally {
      setLogoBusy(false);
    }
  };

  const removeLogo = async () => {
    if (logoBusy) return;
    setLogoBusy(true);
    setApiError('');
    setSaved(false);
    try {
      await tenantApi.deleteLogo(devTenant());
      setForm((p) => ({ ...p, logoUrl: '' }));
      await refresh();
    } catch (err) {
      setApiError(handleApiError(err, t('logoUploadFailed')));
    } finally {
      setLogoBusy(false);
    }
  };

  // disconnect=true forces the BOG keys into the payload with a blank
  // clientId, which the backend reads as "clear the merchant account".
  const save = async (disconnect = false) => {
    if (saving) return;
    setSaving(true);
    setApiError('');
    setSaved(false);
    try {
      const payload = {
        displayName: form.displayName.trim(),
        description: form.description.trim(),
        logoUrl: form.logoUrl.trim(),
        category: form.category,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        addressStreet: form.addressStreet.trim(),
        addressCity: form.addressCity.trim(),
        addressCountry: form.addressCountry.trim(),
        addressPostalCode: form.addressPostalCode.trim(),
        establishedYear: form.establishedYear.trim(),
      };
      // Only carry BOG keys when the owner touched that section — otherwise
      // they stay absent so the backend leaves stored credentials alone.
      if (disconnect) {
        payload.bogClientId = '';
        payload.bogClientSecret = '';
      } else if (bogDirty) {
        payload.bogClientId = bogClientId.trim();
        payload.bogClientSecret = bogSecret.trim();
      }
      await tenantApi.update(payload, devTenant());
      await refresh();
      setBogClientId('');
      setBogSecret('');
      setBogDirty(false);
      setSaved(true);
    } catch (err) {
      setApiError(handleApiError(err, t('storeSaveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const submit = () => save(false);

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

  // 44×44 rounded swatch previewing the colour; a transparent native
  // <input type="color"> sits on top so a click still opens the OS picker.
  const colorField = (key) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label style={{ position: 'relative', width: 44, height: 44, borderRadius: 12, background: form[key], border: `1.5px solid ${T.border}`, cursor: 'pointer', flexShrink: 0, display: 'inline-block' }}>
        <input
          type="color" value={form[key]} onChange={set(key)} aria-label={form[key]}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 'none', padding: 0, cursor: 'pointer' }}
        />
      </label>
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
          {tenant?.subdomain && (
            <div style={{ marginTop: 6, font: `400 12.5px ${T.font}`, color: T.textMute }}>
              {t('subdomainLocked', { domain: `${tenant.subdomain}.esy.ge` })}
            </div>
          )}
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
            <div style={label}>{t('fieldAddressStreet')}</div>
            <input value={form.addressStreet} onChange={set('addressStreet')} style={field} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={label}>{t('fieldAddressCity')}</div>
              <input value={form.addressCity} onChange={set('addressCity')} style={field} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={label}>{t('fieldAddressCountry')}</div>
              <input value={form.addressCountry} onChange={set('addressCountry')} style={field} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={label}>{t('fieldAddressPostal')}</div>
              <input value={form.addressPostalCode} onChange={set('addressPostalCode')} style={field} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={label}>{t('fieldEstablished')}</div>
              <input
                type="number" inputMode="numeric" min="1900" max="2100"
                value={form.establishedYear} onChange={set('establishedYear')}
                placeholder="2024" style={field}
              />
            </div>
          </div>

          <div>
            <div style={label}>{t('fieldLogo')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
                border: `1.5px solid ${T.border}`, background: T.surface,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {form.logoUrl
                  ? <img src={form.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ font: `800 24px ${T.font}`, color: T.textMute }}>
                      {(form.displayName || 'S').charAt(0).toUpperCase()}
                    </span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button" onClick={() => logoInputRef.current?.click()} disabled={logoBusy}
                  style={{ height: 40, padding: '0 16px', borderRadius: 12, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, font: `600 13px ${T.font}`, cursor: logoBusy ? 'default' : 'pointer', opacity: logoBusy ? 0.6 : 1 }}
                >
                  {logoBusy ? t('logoUploading') : (form.logoUrl ? t('logoReplace') : t('logoUpload'))}
                </button>
                {form.logoUrl && !logoBusy && (
                  <button
                    type="button" onClick={removeLogo}
                    style={{ height: 36, padding: '0 16px', borderRadius: 12, border: 'none', background: 'transparent', color: T.danger, font: `600 12.5px ${T.font}`, cursor: 'pointer', textAlign: 'left' }}
                  >
                    {t('logoRemove')}
                  </button>
                )}
              </div>
              <input
                ref={logoInputRef} type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onLogoFile} style={{ display: 'none' }}
              />
            </div>
            <div style={{ marginTop: 8, font: `500 11.5px ${T.font}`, color: T.textMute }}>{t('logoHint')}</div>
          </div>

          <div>
            <div style={label}>{t('fieldCategory')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map((c) => {
                const on = form.category === c;
                return (
                  <button
                    key={c} type="button"
                    onClick={() => { setSaved(false); setForm((p) => ({ ...p, category: on ? '' : c })); }}
                    style={{
                      padding: '8px 12px', borderRadius: 999, cursor: 'pointer',
                      background: on ? T.accent : T.surface,
                      color: on ? '#fff' : T.text,
                      border: `1px solid ${on ? T.accent : T.border}`,
                      font: `600 12px ${T.font}`, textTransform: 'capitalize',
                    }}
                  >
                    {t(`cat_${c}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={label}>{t('fieldPrimary')}</div>
            {colorField('primaryColor')}
          </div>

          <div>
            <div style={label}>{t('fieldSecondary')}</div>
            {colorField('secondaryColor')}
          </div>

          {/* Payments — Bank of Georgia merchant credentials */}
          <div style={{ padding: '16px 16px 18px', borderRadius: 16, background: T.surface, border: `1.5px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ font: `700 14px ${T.font}`, color: T.text }}>{t('bog.title')}</div>
              <span style={{
                font: `700 10.5px ${T.font}`, letterSpacing: '0.04em', textTransform: 'uppercase',
                padding: '5px 10px', borderRadius: 999,
                background: tenant?.bogConfigured ? `${T.success}1f` : T.surface2,
                color: tenant?.bogConfigured ? T.success : T.textMute,
                border: `1px solid ${tenant?.bogConfigured ? `${T.success}55` : T.border}`,
              }}>
                {tenant?.bogConfigured ? t('bog.connected') : t('bog.notConnected')}
              </span>
            </div>
            <div style={{ font: `500 12px/1.6 ${T.font}`, color: T.textMute }}>{t('bog.hint')}</div>

            <div>
              <div style={label}>{t('bog.clientId')}</div>
              <input
                value={bogClientId}
                onChange={(e) => { setBogClientId(e.target.value); setBogDirty(true); setSaved(false); }}
                placeholder={tenant?.bogConfigured ? t('bog.keptPlaceholder') : ''}
                autoComplete="off" style={field}
              />
            </div>
            <div>
              <div style={label}>{t('bog.clientSecret')}</div>
              <input
                type="password"
                value={bogSecret}
                onChange={(e) => { setBogSecret(e.target.value); setBogDirty(true); setSaved(false); }}
                placeholder={tenant?.bogConfigured ? t('bog.keptPlaceholder') : ''}
                autoComplete="new-password" style={field}
              />
            </div>

            {tenant?.bogConfigured && (
              <button
                type="button" onClick={() => save(true)} disabled={saving}
                style={{ alignSelf: 'flex-start', height: 38, padding: '0 16px', borderRadius: 12, border: `1px solid ${T.danger}55`, background: 'transparent', color: T.danger, font: `600 12.5px ${T.font}`, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {t('bog.disconnect')}
              </button>
            )}
          </div>

          {/* Contact channels save themselves per entry rather than riding the
              form's Save button — each row is its own write, so a half-typed
              new number cannot block saving the rest of the store's settings. */}
          <div style={{ padding: '16px 0', borderTop: `1px solid ${T.border}` }}>
            <ContactChannelsEditor T={T} devTenant={devTenant()} />
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
