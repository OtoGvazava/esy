import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { glowTokens, shiftHue } from '../styles/glow';
import { usePlatform } from './PlatformShared';
import { useAuth } from '../contexts/AuthContext';
import { tenantApi, handleApiError } from './../utils/api';
import { CATEGORIES, storeUrl } from './platformData';
import PhoneVerifyBox from '../components/PhoneVerifyBox';

const REG_STEP_KEYS = ['reg.stepAccount', 'reg.stepIdentity', 'reg.stepBrand', 'reg.stepReview', 'reg.stepLive'];
const BRAND_SWATCHES = ['#6366f1', '#c95b30', '#3f8a4a', '#0f766e', '#0891b2', '#a23b72', '#7c3aed', '#dc2626', '#f59e0b', '#65a30d', '#1e40af', '#0d0d0d'];

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

function Stepper({ T, t, current, signedIn }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {REG_STEP_KEYS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const auto = signedIn && i === 0;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, flex: i < REG_STEP_KEYS.length - 1 ? 1 : '0 0 auto' }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: done || auto ? T.accent : (active ? 'transparent' : T.surface2),
              border: active ? `1.5px solid ${T.accent}` : 'none', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `700 10px ${T.font}`, flexShrink: 0,
            }}>
              {done || auto
                ? <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="m5 12 5 5L20 7" /></svg>
                : (active ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.accent }} /> : null)}
            </span>
            <span style={{ font: `600 11px ${T.font}`, color: active ? T.text : T.textDim, whiteSpace: 'nowrap' }}>{t(label)}{auto && <span style={{ marginLeft: 4, color: T.textMute, fontWeight: 500 }}>{t('reg.skipped')}</span>}</span>
            {i < REG_STEP_KEYS.length - 1 && <span style={{ flex: 1, height: 1, background: done || auto ? T.accent : T.border }} />}
          </div>
        );
      })}
    </div>
  );
}

const SUB_META = {
  checking: { color: 'textDim' },
  available: { color: '#3f8a4a' },
  taken: { color: '#dc2626' },
  reserved: { color: '#dc2626' },
  invalid: { color: '#f59e0b' },
};

export default function PlatformRegistration() {
  const { T, dark } = usePlatform();
  const { t } = useTranslation('platform');
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const signedIn = isAuthenticated;
  const phoneVerified = !!user?.phoneVerified;

  const [step, setStep] = useState(signedIn ? 1 : 0);
  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [subTouched, setSubTouched] = useState(false);
  const [subState, setSubState] = useState('invalid');
  const [color, setColor] = useState('#6366f1');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  const subdomain = subTouched ? sub : slugify(name);
  const previewT = glowTokens(dark, color);

  // `useState(signedIn ? 1 : 0)` reads the flag on the FIRST render, and auth
  // resolves a moment later — so a signed-in merchant opening /sell was left
  // on the sign-in step while the stepper above it already said "skipped". The
  // two disagreed on screen. Advance once the session is known.
  useEffect(() => {
    if (signedIn) setStep((s) => (s === 0 ? 1 : s));
  }, [signedIn]);

  // Live subdomain availability (debounced) against the real backend.
  const checkSeq = useRef(0);
  useEffect(() => {
    if (step !== 1) return undefined;
    if (!subdomain || subdomain.length < 3) { setSubState('invalid'); return undefined; }
    setSubState('checking');
    const seq = ++checkSeq.current;
    const t = setTimeout(() => {
      tenantApi.checkSubdomain(subdomain)
        .then((r) => { if (seq === checkSeq.current) setSubState(r.status || 'invalid'); })
        .catch(() => { if (seq === checkSeq.current) setSubState('invalid'); });
    }, 400);
    return () => clearTimeout(t);
  }, [subdomain, step]);

  const googleSignIn = () => {
    const base = window.location.port === '5173' ? 'http://localhost:8080' : '';
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${base}/oauth2/authorization/google?tenant_origin=${origin}`;
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const t = await tenantApi.create({ name: name.trim(), subdomain, primaryColor: color, description: desc.trim() || undefined, category: category || undefined });
      setCreated(t);
      setStep(4);
    } catch (e) {
      setError({ kind: e?.status === 409 ? 'taken' : 'network', msg: handleApiError(e, 'Could not create the store') });
    } finally {
      setSubmitting(false);
    }
  };

  const screen = { maxWidth: 460, margin: '0 auto', padding: '0 22px' };
  const field = { display: 'flex', alignItems: 'center', height: 56, padding: '0 16px', borderRadius: 14, background: T.surface, border: `1.5px solid ${T.border}`, color: T.text };
  const primaryBtn = (bg, shadow) => ({ width: '100%', height: 54, borderRadius: 16, border: 'none', background: bg, color: '#fff', cursor: 'pointer', font: `700 14.5px ${T.font}`, letterSpacing: '-0.01em', boxShadow: shadow, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 });

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}`, position: 'relative', overflow: 'hidden', paddingBottom: 40 }}>
      <div style={{ position: 'absolute', top: -160, left: -80, right: -80, height: 360, background: `radial-gradient(60% 80% at 50% 30%, ${(created ? color : T.accent)}40, transparent 70%)`, filter: 'blur(24px)', pointerEvents: 'none' }} />

      {/* header */}
      <div style={{ ...screen, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 0', position: 'relative' }}>
        <button onClick={() => (step <= (signedIn ? 1 : 0) ? navigate('/') : setStep(step - 1))} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
        </button>
        <span style={{ font: `500 11px ${T.font}`, color: T.textMute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('reg.stepOf', { n: Math.min(step + 1, 4) })}</span>
        <span style={{ width: 38 }} />
      </div>
      <div style={{ ...screen, padding: '16px 22px 18px', position: 'relative' }}><Stepper T={T} t={t} current={step} signedIn={signedIn} /></div>

      {/* STEP 0 — Account */}
      {step === 0 && (
        <div style={{ ...screen, position: 'relative' }}>
          <div style={{ textAlign: 'center', padding: '8px 0 18px' }}>
            <div style={{ width: 58, height: 58, borderRadius: 18, background: T.grad, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', font: `800 26px ${T.font}`, boxShadow: `0 14px 32px ${T.accent}55` }}>e</div>
            <h1 style={{ font: `700 24px/1.2 ${T.font}`, color: T.text, letterSpacing: '-0.03em', margin: '0 0 8px' }}>{t('reg.createAccount')}</h1>
            <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim, maxWidth: 320, margin: '0 auto' }}>{t('reg.createAccountBody')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={googleSignIn} style={{ ...field, gap: 12, cursor: 'pointer', font: `600 14px ${T.font}`, height: 54 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: dark ? 'rgba(255,255,255,0.06)' : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#EA4335" d="M12 10v4h5.7c-.7 2.3-2.7 4-5.7 4a6 6 0 0 1 0-12c1.5 0 2.9.6 3.9 1.5l3-3A10 10 0 0 0 12 2a10 10 0 1 0 9.9 11.7H12Z" /></svg>
              </span>
              {t('reg.continueGmail')}
            </button>
            <div style={{ font: `400 10.5px/1.5 ${T.font}`, color: T.textMute, textAlign: 'center', marginTop: 6 }}>
              {t('reg.accountNote')}
            </div>
          </div>
        </div>
      )}

      {/* Second gate: a verified phone (design's NSGate, kind='phone').
          Both gates are platform-level facts, so a person who has already
          shopped on esy passes straight through them. Only the sign-in half was
          enforced — a merchant could open a shop with no reachable number,
          which is the one thing a buyer and a courier both need. */}
      {step === 1 && signedIn && !phoneVerified && (
        <div style={{ ...screen, position: 'relative' }}>
          <div style={{ padding: '0 0 18px' }}>
            <div style={{ font: `600 10.5px ${T.font}`, color: T.accentFg, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{t('reg.phoneGateEyebrow')}</div>
            <h1 style={{ font: `700 24px/1.2 ${T.font}`, color: T.text, letterSpacing: '-0.03em', margin: '0 0 8px' }}>{t('reg.phoneGateTitle')}</h1>
            <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim }}>{t('reg.phoneGateBody')}</div>
          </div>
          <div style={{ borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, padding: 16 }}>
            <PhoneVerifyBox compact />
          </div>
          <div style={{ marginTop: 14, font: `400 11.5px/1.5 ${T.font}`, color: T.textMute }}>
            {t('reg.phoneGateNote')}
          </div>
        </div>
      )}

      {/* STEP 1 — Identity */}
      {step === 1 && (!signedIn || phoneVerified) && (
        <div style={{ ...screen, position: 'relative' }}>
          <div style={{ padding: '0 0 18px' }}>
            <div style={{ font: `600 10.5px ${T.font}`, color: T.accentFg, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{t('reg.yourStore')}</div>
            <h1 style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: '0 0 8px' }}>{t('reg.identityTitle')}</h1>
            <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim }}>{t('reg.identityBody')}</div>
          </div>
          <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('reg.storeName')}</div>
          <div style={{ ...field, marginBottom: 18 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('reg.storeNamePlaceholder')} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: T.text, font: `600 15.5px ${T.font}`, letterSpacing: '-0.02em' }} />
            <span style={{ font: `500 10.5px ${T.font}`, color: T.textMute }}>{name.length} / 60</span>
          </div>
          <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('reg.subdomain')}</div>
          <div style={{ display: 'flex', alignItems: 'center', height: 56, padding: '0 12px 0 16px', borderRadius: 14, background: T.surface, border: `1.5px solid ${subState === 'available' ? T.accent : T.border}`, boxShadow: subState === 'available' ? `0 0 0 4px ${T.accent}1a` : 'none' }}>
            <span style={{ font: `500 11.5px ${T.mono}`, color: T.textMute }}>https://</span>
            <input value={subdomain} onChange={(e) => { setSubTouched(true); setSub(slugify(e.target.value)); }} style={{ flex: 1, marginLeft: 2, border: 'none', outline: 'none', background: 'transparent', color: T.text, font: `600 15.5px ${T.mono}`, minWidth: 0 }} />
            <span style={{ font: `500 13px ${T.mono}`, color: T.textDim }}>.esy.ge</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, font: `500 11.5px ${T.font}`, color: SUB_META[subState].color === 'textDim' ? T.textDim : SUB_META[subState].color }}>
            {subState === 'checking'
              ? <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${T.textMute}`, borderTopColor: 'transparent', animation: 'pfspin 1s linear infinite' }} />
              : <span style={{ width: 8, height: 8, borderRadius: '50%', background: SUB_META[subState].color === 'textDim' ? T.textMute : SUB_META[subState].color }} />}
            {t(`reg.sub.${subState}`)}
            <style>{'@keyframes pfspin{to{transform:rotate(360deg)}}'}</style>
          </div>
          <div style={{ marginTop: 24 }}>
            <button disabled={subState !== 'available' || !name.trim()} onClick={() => setStep(2)} style={{ ...primaryBtn(subState === 'available' && name.trim() ? T.grad : T.surface2, subState === 'available' ? `0 12px 28px ${T.accent}55` : 'none'), color: subState === 'available' && name.trim() ? '#fff' : T.textMute, cursor: subState === 'available' && name.trim() ? 'pointer' : 'not-allowed' }}>
              {t('reg.continue')}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Branding */}
      {step === 2 && (
        <div style={{ ...screen, position: 'relative' }}>
          <div style={{ padding: '0 0 14px' }}>
            <div style={{ font: `600 10.5px ${T.font}`, color, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{t('reg.branding')}</div>
            <h1 style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: '0 0 8px' }}>{t('reg.brandingTitle')}</h1>
            <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim }}>{t('reg.brandingBodyPre')}<span style={{ color: T.text, fontFamily: T.mono }}>{subdomain}.esy.ge</span>.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 18 }}>
            {BRAND_SWATCHES.map((c) => {
              const active = c === color;
              return (
                <button key={c} onClick={() => setColor(c)} style={{ aspectRatio: '1 / 1', borderRadius: 12, background: c, border: active ? `2px solid ${T.text}` : `1px solid ${T.border}`, cursor: 'pointer', position: 'relative', boxShadow: active ? `0 0 0 4px ${c}33, 0 8px 20px ${c}55` : 'none' }}>
                  {active && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" style={{ position: 'absolute', inset: 0, margin: 'auto' }}><path d="m5 12 5 5L20 7" /></svg>}
                </button>
              );
            })}
          </div>
          <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{t('reg.livePreview')}</div>
          <div style={{ background: previewT.surface, borderRadius: 16, border: `1px solid ${previewT.border}`, padding: 14, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 54, height: 54, borderRadius: 12, background: `linear-gradient(135deg, ${color}30 0%, ${shiftHue(color, 25)}20 100%)`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `700 13px ${T.font}`, color: previewT.text }}>{name || t('reg.yourStore')}</div>
              <div style={{ font: `400 11.5px ${T.font}`, color: previewT.textMute }}>{subdomain}.esy.ge</div>
            </div>
            <button style={{ height: 36, padding: '0 14px', borderRadius: 999, border: 'none', background: previewT.grad, color: '#fff', font: `700 12px ${T.font}`, boxShadow: `0 8px 20px ${color}55` }}>+</button>
          </div>
          <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{t('reg.shortDescription')}</div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('reg.descPlaceholder')} style={{ width: '100%', height: 76, resize: 'none', padding: '10px 12px', borderRadius: 12, background: T.surface, border: `1.5px solid ${T.border}`, color: T.text, font: `400 13px/1.4 ${T.font}`, outline: 'none', marginBottom: 18 }} />

          {/* Category (D14). The wizard never asked, so every store opened
              uncategorised and could not be found under any filter in the
              directory — the owner had to discover the field later in settings.
              The taxonomy is the union the decision fixes; `all` is a filter
              value, not something a store can be. */}
          <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{t('reg.category')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
            {CATEGORIES.filter((c) => c.id !== 'all').map((c) => {
              const on = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(on ? '' : c.id)}
                  style={{
                    padding: '9px 13px', borderRadius: 999, cursor: 'pointer',
                    font: `600 12.5px ${T.font}`,
                    background: on ? color : T.surface,
                    color: on ? '#fff' : T.textDim,
                    border: `1px solid ${on ? color : T.border}`,
                  }}
                >
                  {t(`cat.${c.id}`, { defaultValue: c.label })}
                </button>
              );
            })}
          </div>
          <button onClick={() => setStep(3)} style={primaryBtn(`linear-gradient(135deg, ${color} 0%, ${shiftHue(color, 25)} 100%)`, `0 12px 28px ${color}55`)}>
            {t('reg.reviewYourStore')}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
          </button>
        </div>
      )}

      {/* STEP 3 — Review */}
      {step === 3 && (
        <div style={{ ...screen, position: 'relative' }}>
          <div style={{ padding: '0 0 14px' }}>
            <div style={{ font: `600 10.5px ${T.font}`, color, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{t('reg.review')}</div>
            <h1 style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: '0 0 8px' }}>{t('reg.reviewTitle')}</h1>
            <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim }}>{t('reg.reviewBody')}</div>
          </div>
          <div style={{ borderRadius: 18, overflow: 'hidden', border: `1px solid ${color}40`, background: previewT.surface, marginBottom: 16 }}>
            <div style={{ height: 78, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${color} 0%, ${shiftHue(color, 25)} 100%)` }}>
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 14px, transparent 14px 28px)' }} />
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ font: `700 18px ${T.font}`, color: previewT.text, letterSpacing: '-0.03em' }}>{name || t('reg.yourStore')}</div>
              <div style={{ font: `500 11.5px ${T.mono}`, color, marginTop: 2 }}>{subdomain}.esy.ge</div>
              {desc && <div style={{ marginTop: 10, font: `400 12.5px/1.45 ${T.font}`, color: previewT.textDim }}>{desc}</div>}
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 0', borderTop: `1px solid ${previewT.border}` }}>
                {[[t('reg.fieldBrand'), color.toUpperCase(), true], [t('reg.fieldPlan'), t('reg.fieldPlanValue'), false], [t('reg.fieldRegion'), t('reg.fieldRegionValue'), false]].map(([k, v, mono]) => (
                  <div key={k}>
                    <div style={{ font: `500 9.5px ${T.font}`, color: previewT.textMute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ font: `700 11.5px ${mono ? T.mono : T.font}`, color: previewT.text, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {error && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: dark ? '#dc262622' : '#fee2e2', border: `1px solid ${dark ? '#dc262655' : '#fca5a5'}`, color: '#dc2626', marginBottom: 14 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v.1" /></svg>
              <div>
                <div style={{ font: `700 12.5px ${T.font}` }}>{error.kind === 'taken' ? t('reg.errTakenTitle', { sub: subdomain }) : t('reg.errCreateTitle')}</div>
                <div style={{ marginTop: 2, font: `400 11.5px/1.4 ${T.font}`, color: dark ? '#fca5a5' : '#9b1c1c' }}>{error.msg}</div>
              </div>
            </div>
          )}
          <button disabled={submitting} onClick={submit} style={{ ...primaryBtn(`linear-gradient(135deg, ${color} 0%, ${shiftHue(color, 25)} 100%)`, `0 12px 28px ${color}55`), opacity: submitting ? 0.7 : 1 }}>
            {submitting ? t('reg.creating') : (error ? t('reg.tryAgain') : t('reg.createMyStore'))}
            {!submitting && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>}
          </button>
          <div style={{ marginTop: 10, font: `500 11px ${T.font}`, color: T.textMute, textAlign: 'center' }}>{t('reg.terms')}</div>
        </div>
      )}

      {/* STEP 4 — Live */}
      {step === 4 && created && (
        <div style={{ ...screen, position: 'relative', textAlign: 'center' }}>
          <div style={{ width: 84, height: 84, borderRadius: 26, background: `linear-gradient(135deg, ${color} 0%, ${shiftHue(color, 25)} 100%)`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '24px auto 22px', boxShadow: `0 20px 44px ${color}77` }}>
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m5 12 5 5L20 7" /></svg>
          </div>
          <h1 style={{ font: `700 30px/1.1 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: '0 0 10px' }}>{t('reg.live')}</h1>
          <div style={{ font: `400 13.5px/1.55 ${T.font}`, color: T.textDim, maxWidth: 320, margin: '0 auto 22px' }}>{t('reg.liveBody', { name: created.name })}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 10px 16px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 18, textAlign: 'left' }}>
            <span style={{ flex: 1, minWidth: 0, font: `700 14px ${T.mono}`, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>https://{created.subdomain}.esy.ge</span>
            <button onClick={() => navigator.clipboard?.writeText(`https://${created.subdomain}.esy.ge`)} style={{ height: 32, padding: '0 12px', borderRadius: 10, border: 'none', background: color, color: '#fff', font: `700 11.5px ${T.font}`, cursor: 'pointer' }}>{t('reg.copy')}</button>
          </div>
          <button onClick={() => navigate('/account')} style={primaryBtn(`linear-gradient(135deg, ${color} 0%, ${shiftHue(color, 25)} 100%)`, `0 12px 28px ${color}55`)}>
            {t('reg.openDashboard')}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
          </button>
          <button onClick={() => { window.location.href = storeUrl(created); }} style={{ width: '100%', height: 50, borderRadius: 14, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer', font: `600 13.5px ${T.font}`, marginTop: 10 }}>
            {t('reg.visitStore', { host: `${created.subdomain}.esy.ge` })}
          </button>
        </div>
      )}
    </div>
  );
}
