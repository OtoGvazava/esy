import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { Icon } from '../components/glow/GlowPrimitives';
import { GlowScreen } from '../components/glow/GlowChrome';
import { tenantApi, handleApiError } from '../utils/api';
import { storeUrl } from '../platform/platformData';

// Self-serve store signup. The backend resolves tenants by Host header, so a
// created store is live the moment the row exists (on the deployed wildcard
// domain; locally reachable via ?tenant=<subdomain>).
const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

const SWATCHES = ['#6366f1', '#c95b30', '#3f8a4a', '#0f766e', '#dc2626', '#0d0d0d'];

export default function CreateStore() {
  const { T } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [touchedSub, setTouchedSub] = useState(false);
  const [description, setDescription] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [addressPostalCode, setAddressPostalCode] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [accent, setAccent] = useState('#6366f1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const sub = touchedSub ? subdomain : slugify(name);

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError(t('createStore.errNameRequired'));
    if (sub.length < 3) return setError(t('createStore.errSubShort'));
    setBusy(true);
    try {
      const res = await tenantApi.create({
        name: name.trim(),
        subdomain: sub,
        primaryColor: accent,
        description: description.trim(),
        addressStreet: addressStreet.trim(),
        addressCity: addressCity.trim(),
        addressCountry: addressCountry.trim(),
        addressPostalCode: addressPostalCode.trim(),
        establishedYear: establishedYear.trim(),
      });
      setCreated(res);
    } catch (e) {
      setError(handleApiError(e, t('createStore.errCreate')));
    } finally {
      setBusy(false);
    }
  };

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
  };

  if (created) {
    const url = storeUrl(created);
    return (
      <GlowScreen T={T} padBottom={40}>
        <div style={{ maxWidth: 460, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 62, height: 62, borderRadius: 18, background: T.grad, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Icon.check />
          </div>
          <div style={{ font: `700 24px/1.2 ${T.font}`, color: T.text, marginBottom: 8 }}>
            {t('createStore.liveTitle', { name: created.displayName || created.name })}
          </div>
          <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim, marginBottom: 20 }}>
            {t('createStore.liveBody')}
          </div>
          <a href={url} style={{ display: 'block', padding: '14px 16px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, font: `600 14px ${T.mono}`, color: T.accentFg, wordBreak: 'break-all', textDecoration: 'none' }}>
            {url}
          </a>
          <button onClick={() => navigate('/')} style={{ marginTop: 22, width: '100%', height: 52, borderRadius: 16, border: 'none', background: T.grad, color: '#fff', font: `700 14.5px ${T.font}`, cursor: 'pointer' }}>
            {t('createStore.backToStorefront')}
          </button>
        </div>
      </GlowScreen>
    );
  }

  return (
    <GlowScreen T={T} padBottom={40}>
      <div style={{ position: 'absolute', top: -160, left: -80, right: -80, height: 360, background: `radial-gradient(60% 80% at 50% 30%, ${accent}48, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 460, margin: '0 auto', position: 'relative' }}>
        <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => navigate('/')} aria-label="close" style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon.close /></button>
        </div>

        <div style={{ padding: '16px 24px 24px', textAlign: 'center' }}>
          <div style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.03em', marginBottom: 8 }}>
            {t('createStore.title')}
          </div>
          <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim, maxWidth: 320, margin: '0 auto' }}>
            {t('createStore.subtitle')}
          </div>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('createStore.storeName')}</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('createStore.storeNamePlaceholder')} style={field} />
          </div>

          <div>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('createStore.subdomain')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                value={sub}
                onChange={(e) => { setTouchedSub(true); setSubdomain(slugify(e.target.value)); }}
                placeholder={t('createStore.subdomainPlaceholder')}
                style={{ ...field, flex: 1 }}
              />
              <span style={{ font: `600 14px ${T.mono}`, color: T.textDim, whiteSpace: 'nowrap' }}>.esy.ge</span>
            </div>
            <div style={{ marginTop: 6, font: `500 11.5px ${T.font}`, color: T.textMute }}>
              {sub ? `${sub}.esy.ge` : t('createStore.subdomainHint')}
            </div>
          </div>

          <div>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('createStore.description')}</div>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder={t('createStore.descriptionPlaceholder')}
              style={{ ...field, height: 'auto', padding: '12px 16px', resize: 'vertical' }}
            />
          </div>

          <div>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('createStore.addressStreet')}</div>
            <input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder={t('createStore.addressStreetPlaceholder')} style={field} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('createStore.addressCity')}</div>
              <input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} style={field} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('createStore.addressCountry')}</div>
              <input value={addressCountry} onChange={(e) => setAddressCountry(e.target.value)} style={field} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('createStore.addressPostal')}</div>
              <input value={addressPostalCode} onChange={(e) => setAddressPostalCode(e.target.value)} style={field} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('createStore.established')}</div>
              <input
                type="number" inputMode="numeric" min="1900" max="2100"
                value={establishedYear} onChange={(e) => setEstablishedYear(e.target.value)}
                placeholder="2024" style={field}
              />
            </div>
          </div>

          <div>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('createStore.brandAccent')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {SWATCHES.map((s) => (
                <button
                  key={s} type="button" aria-label={s} onClick={() => setAccent(s)}
                  style={{
                    width: 44, height: 44, borderRadius: 14, background: s, cursor: 'pointer', padding: 0,
                    border: `2.5px solid ${accent === s ? T.text : 'transparent'}`,
                    boxShadow: accent === s ? `0 0 0 3px ${T.bg}` : 'none',
                  }}
                />
              ))}
            </div>
            <div style={{ marginTop: 8, font: `600 12px ${T.mono}`, color: T.textDim }}>{accent}</div>
          </div>

          {error && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: `${T.danger}14`, border: `1px solid ${T.danger}40`, color: T.danger, font: `500 12.5px ${T.font}` }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={busy} style={{ width: '100%', height: 54, borderRadius: 16, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, color: '#fff', font: `700 14.5px ${T.font}`, cursor: busy ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.7 : 1, boxShadow: `0 12px 30px ${accent}55` }}>
            {busy ? t('createStore.creating') : <>{t('createStore.create')} <Icon.arrowR /></>}
          </button>
        </div>
      </div>
    </GlowScreen>
  );
}
