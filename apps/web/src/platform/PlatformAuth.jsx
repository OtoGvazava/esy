import { useNavigate } from 'react-router-dom';
import { usePlatform, EsyMark } from './PlatformShared';

export default function PlatformAuth() {
  const { T, dark } = usePlatform();
  const navigate = useNavigate();

  const googleSignIn = () => {
    const base = window.location.port === '5173' ? 'http://localhost:8080' : '';
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${base}/oauth2/authorization/google?tenant_origin=${origin}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -160, left: -80, right: -80, height: 380, background: `radial-gradient(60% 80% at 50% 30%, ${T.accent}40, transparent 70%)`, filter: 'blur(22px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 460, margin: '0 auto', padding: '0 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 0 0' }}>
          <button onClick={() => navigate('/')} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '20px 0 22px' }}>
          <EsyMark T={T} size={34} />
          <h1 style={{ font: `700 26px/1.2 ${T.font}`, color: T.text, letterSpacing: '-0.03em', margin: '20px 0 8px' }}>One account for all of esy</h1>
          <div style={{ font: `400 13.5px/1.55 ${T.font}`, color: T.textDim, maxWidth: 320, margin: '0 auto' }}>Sign in to buy from any shop, or open one of your own. The same login covers both.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={googleSignIn} style={{ width: '100%', height: 54, borderRadius: 14, border: `1px solid ${T.border}`, background: T.surface, color: T.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 12, padding: '0 16px', font: `600 14px ${T.font}` }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: dark ? 'rgba(255,255,255,0.06)' : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="#EA4335" d="M12 10v4h5.7c-.7 2.3-2.7 4-5.7 4a6 6 0 0 1 0-12c1.5 0 2.9.6 3.9 1.5l3-3A10 10 0 0 0 12 2a10 10 0 1 0 9.9 11.7H12Z" /></svg>
            </span>
            Continue with Gmail
          </button>

          <div style={{ marginTop: 14, padding: '11px 14px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </span>
            <div style={{ flex: 1, font: `500 11.5px/1.4 ${T.font}`, color: T.textDim }}>Encrypted end-to-end. <span style={{ color: T.text }}>esy</span> never sees your Google password.</div>
          </div>
          <div style={{ marginTop: 10, font: `400 10.5px ${T.font}`, color: T.textMute, textAlign: 'center' }}>New to esy? Just sign in — we'll create your account.</div>
        </div>
      </div>
    </div>
  );
}
