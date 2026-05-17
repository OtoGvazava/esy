import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatform, PTopBar } from './PlatformShared';

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

export default function PlatformNotFound() {
  const { T, isDesktop, lang } = usePlatform();
  const navigate = useNavigate();
  const [sub, setSub] = useState('cassette-press');

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
      <PTopBar />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 160px)', padding: isDesktop ? '0 56px' : '0 22px' }}>
        <div style={{ position: 'absolute', top: '20%', left: '25%', right: '25%', height: 320, background: `radial-gradient(60% 80% at 50% 50%, ${T.accent}30, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 720, width: '100%', textAlign: 'center' }}>
          <div style={{ font: `800 12px ${T.mono}`, color: T.accentFg, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 22 }}>404 · no such store</div>
          <h1 style={{ font: `700 ${isDesktop ? 56 : 32}px/1.04 ${T.font}`, color: T.text, letterSpacing: '-0.04em', margin: '0 0 16px' }}>
            That subdomain doesn't exist yet.
          </h1>
          <div style={{ font: `400 ${isDesktop ? 16.5 : 14}px/1.55 ${T.font}`, color: T.textDim, maxWidth: 540, margin: '0 auto 28px' }}>
            But it could — <span style={{ color: T.text, fontFamily: T.mono, fontSize: isDesktop ? 15 : 13 }}>{sub || 'your-name'}.esy.ge</span> is available. Want to claim it?
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 8px 8px 16px', background: T.surface, border: `1.5px solid ${T.accent}`, borderRadius: 16, boxShadow: `0 0 0 4px ${T.accent}1a`, maxWidth: 480, width: '100%' }}>
            <span style={{ font: `500 13.5px ${T.mono}`, color: T.textMute }}>https://</span>
            <input value={sub} onChange={(e) => setSub(slugify(e.target.value))} style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: T.text, font: `700 16px ${T.mono}` }} />
            <span style={{ font: `500 14px ${T.mono}`, color: T.textDim }}>.esy.ge</span>
            <button onClick={() => navigate('/sell')} style={{ height: 40, padding: '0 16px', borderRadius: 12, border: 'none', background: T.grad, color: '#fff', font: `700 13px ${T.font}`, cursor: 'pointer', boxShadow: `0 10px 28px ${T.accent}55`, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              Claim it
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
            </button>
          </div>
          <div style={{ marginTop: 36, display: 'inline-flex', gap: 14, alignItems: 'center' }}>
            <span onClick={() => navigate('/stores')} style={{ font: `600 13px ${T.font}`, color: T.text, cursor: 'pointer' }}>← Browse stores</span>
            <span style={{ color: T.textMute }}>·</span>
            <span onClick={() => navigate('/')} style={{ font: `600 13px ${T.font}`, color: T.text, cursor: 'pointer' }}>Home</span>
          </div>
        </div>
      </div>
    </div>
  );
}
