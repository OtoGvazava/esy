import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { glowTokens, shiftHue } from '../styles/glow';
import { usePlatform } from './PlatformShared';
import { useAuth } from '../contexts/AuthContext';
import { tenantApi, handleApiError } from './../utils/api';
import { storeUrl } from './platformData';

const REG_STEPS = ['Account', 'Identity', 'Brand', 'Review', 'Live'];
const BRAND_SWATCHES = ['#6366f1', '#c95b30', '#3f8a4a', '#0f766e', '#0891b2', '#a23b72', '#7c3aed', '#dc2626', '#f59e0b', '#65a30d', '#1e40af', '#0d0d0d'];

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

function Stepper({ T, current, signedIn }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {REG_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const auto = signedIn && i === 0;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, flex: i < REG_STEPS.length - 1 ? 1 : '0 0 auto' }}>
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
            <span style={{ font: `600 11px ${T.font}`, color: active ? T.text : T.textDim, whiteSpace: 'nowrap' }}>{label}{auto && <span style={{ marginLeft: 4, color: T.textMute, fontWeight: 500 }}>· skipped</span>}</span>
            {i < REG_STEPS.length - 1 && <span style={{ flex: 1, height: 1, background: done || auto ? T.accent : T.border }} />}
          </div>
        );
      })}
    </div>
  );
}

const SUB_META = {
  checking: { color: 'textDim', label: 'Checking…' },
  available: { color: '#3f8a4a', label: 'Available' },
  taken: { color: '#dc2626', label: 'Taken' },
  reserved: { color: '#dc2626', label: 'Reserved' },
  invalid: { color: '#f59e0b', label: 'Invalid — 3–30 chars, a–z 0–9 hyphens' },
};

export default function PlatformRegistration() {
  const { T, dark, lang } = usePlatform();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const signedIn = isAuthenticated;

  const [step, setStep] = useState(signedIn ? 1 : 0);
  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [subTouched, setSubTouched] = useState(false);
  const [subState, setSubState] = useState('invalid');
  const [color, setColor] = useState('#6366f1');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  const subdomain = subTouched ? sub : slugify(name);
  const previewT = glowTokens(dark, color);

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
      const t = await tenantApi.create({ name: name.trim(), subdomain, primaryColor: color, description: desc.trim() || undefined });
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
        <span style={{ font: `500 11px ${T.font}`, color: T.textMute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Step {Math.min(step + 1, 4)} / 4</span>
        <span style={{ width: 38 }} />
      </div>
      <div style={{ ...screen, padding: '16px 22px 18px', position: 'relative' }}><Stepper T={T} current={step} signedIn={signedIn} /></div>

      {/* STEP 0 — Account */}
      {step === 0 && (
        <div style={{ ...screen, position: 'relative' }}>
          <div style={{ textAlign: 'center', padding: '8px 0 18px' }}>
            <div style={{ width: 58, height: 58, borderRadius: 18, background: T.grad, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', font: `800 26px ${T.font}`, boxShadow: `0 14px 32px ${T.accent}55` }}>e</div>
            <h1 style={{ font: `700 24px/1.2 ${T.font}`, color: T.text, letterSpacing: '-0.03em', margin: '0 0 8px' }}>Create your esy account</h1>
            <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim, maxWidth: 320, margin: '0 auto' }}>One login covers everything on esy — selling, buying, following stores. No separate seller account.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={googleSignIn} style={{ ...field, gap: 12, cursor: 'pointer', font: `600 14px ${T.font}`, height: 54 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: dark ? 'rgba(255,255,255,0.06)' : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#EA4335" d="M12 10v4h5.7c-.7 2.3-2.7 4-5.7 4a6 6 0 0 1 0-12c1.5 0 2.9.6 3.9 1.5l3-3A10 10 0 0 0 12 2a10 10 0 1 0 9.9 11.7H12Z" /></svg>
              </span>
              Continue with Gmail
            </button>
            <div style={{ font: `400 10.5px/1.5 ${T.font}`, color: T.textMute, textAlign: 'center', marginTop: 6 }}>
              We create your account on first sign-in. Same login for buying and selling.
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 — Identity */}
      {step === 1 && (
        <div style={{ ...screen, position: 'relative' }}>
          <div style={{ padding: '0 0 18px' }}>
            <div style={{ font: `600 10.5px ${T.font}`, color: T.accentFg, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Your store</div>
            <h1 style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: '0 0 8px' }}>Pick a name and a subdomain.</h1>
            <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim }}>You can change the name later. The subdomain becomes your store's permanent URL.</div>
          </div>
          <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Store name</div>
          <div style={{ ...field, marginBottom: 18 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aurora Audio" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: T.text, font: `600 15.5px ${T.font}`, letterSpacing: '-0.02em' }} />
            <span style={{ font: `500 10.5px ${T.font}`, color: T.textMute }}>{name.length} / 60</span>
          </div>
          <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Subdomain</div>
          <div style={{ display: 'flex', alignItems: 'center', height: 56, padding: '0 12px 0 16px', borderRadius: 14, background: T.surface, border: `1.5px solid ${subState === 'available' ? T.accent : T.border}`, boxShadow: subState === 'available' ? `0 0 0 4px ${T.accent}1a` : 'none' }}>
            <span style={{ font: `500 11.5px ${T.mono}`, color: T.textMute }}>https://</span>
            <input value={subdomain} onChange={(e) => { setSubTouched(true); setSub(slugify(e.target.value)); }} style={{ flex: 1, marginLeft: 2, border: 'none', outline: 'none', background: 'transparent', color: T.text, font: `600 15.5px ${T.mono}`, minWidth: 0 }} />
            <span style={{ font: `500 13px ${T.mono}`, color: T.textDim }}>.esy.ge</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, font: `500 11.5px ${T.font}`, color: SUB_META[subState].color === 'textDim' ? T.textDim : SUB_META[subState].color }}>
            {subState === 'checking'
              ? <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${T.textMute}`, borderTopColor: 'transparent', animation: 'pfspin 1s linear infinite' }} />
              : <span style={{ width: 8, height: 8, borderRadius: '50%', background: SUB_META[subState].color === 'textDim' ? T.textMute : SUB_META[subState].color }} />}
            {SUB_META[subState].label}
            <style>{'@keyframes pfspin{to{transform:rotate(360deg)}}'}</style>
          </div>
          <div style={{ marginTop: 24 }}>
            <button disabled={subState !== 'available' || !name.trim()} onClick={() => setStep(2)} style={{ ...primaryBtn(subState === 'available' && name.trim() ? T.grad : T.surface2, subState === 'available' ? `0 12px 28px ${T.accent}55` : 'none'), color: subState === 'available' && name.trim() ? '#fff' : T.textMute, cursor: subState === 'available' && name.trim() ? 'pointer' : 'not-allowed' }}>
              Continue
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Branding */}
      {step === 2 && (
        <div style={{ ...screen, position: 'relative' }}>
          <div style={{ padding: '0 0 14px' }}>
            <div style={{ font: `600 10.5px ${T.font}`, color, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Branding</div>
            <h1 style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: '0 0 8px' }}>Pick a color. The whole store will use it.</h1>
            <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim }}>Your brand color lives on buttons, badges, and accents across <span style={{ color: T.text, fontFamily: T.mono }}>{subdomain}.esy.ge</span>.</div>
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
          <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Live preview</div>
          <div style={{ background: previewT.surface, borderRadius: 16, border: `1px solid ${previewT.border}`, padding: 14, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 54, height: 54, borderRadius: 12, background: `linear-gradient(135deg, ${color}30 0%, ${shiftHue(color, 25)}20 100%)`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `700 13px ${T.font}`, color: previewT.text }}>{name || 'Your store'}</div>
              <div style={{ font: `400 11.5px ${T.font}`, color: previewT.textMute }}>{subdomain}.esy.ge</div>
            </div>
            <button style={{ height: 36, padding: '0 14px', borderRadius: 999, border: 'none', background: previewT.grad, color: '#fff', font: `700 12px ${T.font}`, boxShadow: `0 8px 20px ${color}55` }}>+ Add</button>
          </div>
          <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Short description</div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What you make, in one sentence." style={{ width: '100%', height: 76, resize: 'none', padding: '10px 12px', borderRadius: 12, background: T.surface, border: `1.5px solid ${T.border}`, color: T.text, font: `400 13px/1.4 ${T.font}`, outline: 'none', marginBottom: 18 }} />
          <button onClick={() => setStep(3)} style={primaryBtn(`linear-gradient(135deg, ${color} 0%, ${shiftHue(color, 25)} 100%)`, `0 12px 28px ${color}55`)}>
            Review your store
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
          </button>
        </div>
      )}

      {/* STEP 3 — Review */}
      {step === 3 && (
        <div style={{ ...screen, position: 'relative' }}>
          <div style={{ padding: '0 0 14px' }}>
            <div style={{ font: `600 10.5px ${T.font}`, color, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Review</div>
            <h1 style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: '0 0 8px' }}>Looking good?</h1>
            <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim }}>Confirm and we'll spin up your subdomain — usually under 10 seconds.</div>
          </div>
          <div style={{ borderRadius: 18, overflow: 'hidden', border: `1px solid ${color}40`, background: previewT.surface, marginBottom: 16 }}>
            <div style={{ height: 78, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${color} 0%, ${shiftHue(color, 25)} 100%)` }}>
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 14px, transparent 14px 28px)' }} />
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ font: `700 18px ${T.font}`, color: previewT.text, letterSpacing: '-0.03em' }}>{name || 'Your store'}</div>
              <div style={{ font: `500 11.5px ${T.mono}`, color, marginTop: 2 }}>{subdomain}.esy.ge</div>
              {desc && <div style={{ marginTop: 10, font: `400 12.5px/1.45 ${T.font}`, color: previewT.textDim }}>{desc}</div>}
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '12px 0', borderTop: `1px solid ${previewT.border}` }}>
                {[['Brand', color.toUpperCase()], ['Plan', 'Free · 2%'], ['Region', 'EU']].map(([k, v], i) => (
                  <div key={k}>
                    <div style={{ font: `500 9.5px ${T.font}`, color: previewT.textMute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k}</div>
                    <div style={{ font: `700 11.5px ${i === 0 ? T.mono : T.font}`, color: previewT.text, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {error && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: dark ? '#dc262622' : '#fee2e2', border: `1px solid ${dark ? '#dc262655' : '#fca5a5'}`, color: '#dc2626', marginBottom: 14 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v.1" /></svg>
              <div>
                <div style={{ font: `700 12.5px ${T.font}` }}>{error.kind === 'taken' ? `${subdomain}.esy.ge was just claimed` : 'Could not create the store'}</div>
                <div style={{ marginTop: 2, font: `400 11.5px/1.4 ${T.font}`, color: dark ? '#fca5a5' : '#9b1c1c' }}>{error.msg}</div>
              </div>
            </div>
          )}
          <button disabled={submitting} onClick={submit} style={{ ...primaryBtn(`linear-gradient(135deg, ${color} 0%, ${shiftHue(color, 25)} 100%)`, `0 12px 28px ${color}55`), opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Creating…' : (error ? 'Try again' : 'Create my store')}
            {!submitting && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>}
          </button>
          <div style={{ marginTop: 10, font: `500 11px ${T.font}`, color: T.textMute, textAlign: 'center' }}>By creating you accept esy's Seller Terms. No credit card needed.</div>
        </div>
      )}

      {/* STEP 4 — Live */}
      {step === 4 && created && (
        <div style={{ ...screen, position: 'relative', textAlign: 'center' }}>
          <div style={{ width: 84, height: 84, borderRadius: 26, background: `linear-gradient(135deg, ${color} 0%, ${shiftHue(color, 25)} 100%)`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '24px auto 22px', boxShadow: `0 20px 44px ${color}77` }}>
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m5 12 5 5L20 7" /></svg>
          </div>
          <h1 style={{ font: `700 30px/1.1 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: '0 0 10px' }}>You're live.</h1>
          <div style={{ font: `400 13.5px/1.55 ${T.font}`, color: T.textDim, maxWidth: 320, margin: '0 auto 22px' }}>{created.name} is now hosted on esy. Share the link below — the first sale is the hardest one.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 10px 16px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 18, textAlign: 'left' }}>
            <span style={{ flex: 1, minWidth: 0, font: `700 14px ${T.mono}`, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>https://{created.subdomain}.esy.ge</span>
            <button onClick={() => navigator.clipboard?.writeText(`https://${created.subdomain}.esy.ge`)} style={{ height: 32, padding: '0 12px', borderRadius: 10, border: 'none', background: color, color: '#fff', font: `700 11.5px ${T.font}`, cursor: 'pointer' }}>Copy</button>
          </div>
          <button onClick={() => navigate('/account')} style={primaryBtn(`linear-gradient(135deg, ${color} 0%, ${shiftHue(color, 25)} 100%)`, `0 12px 28px ${color}55`)}>
            Open the dashboard
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
          </button>
          <button onClick={() => { window.location.href = storeUrl(created); }} style={{ width: '100%', height: 50, borderRadius: 14, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer', font: `600 13.5px ${T.font}`, marginTop: 10 }}>
            Visit {created.subdomain}.esy.ge
          </button>
        </div>
      )}
    </div>
  );
}
