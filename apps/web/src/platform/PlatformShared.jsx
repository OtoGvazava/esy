/* eslint-disable react-refresh/only-export-components */
// Platform-site shared primitives. Reuses the Glow design tokens with the
// platform indigo as the default accent; tenant brand colors only ever appear
// on store cards (the "wall of brands against calm indigo chrome" rule).
// (Shared module: intentionally exports hooks + components together.)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow, glowTokens, shiftHue } from '../styles/glow';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { useAuth } from '../contexts/AuthContext';
import { tenantApi } from '../utils/api';
import { PLATFORM_ACCENT, storeInitials } from './platformData';

export { shiftHue };

// Platform chrome state: tokens are always built on PLATFORM_ACCENT (never the
// resolved tenant), dark + breakpoint come from the app theme, language from
// the shared ThemeMode context.
export function usePlatform() {
  const { dark, isDesktop } = useGlow();
  const tm = useThemeMode();
  const lang = tm.language === 'ka' ? 'ka' : 'en';
  const T = glowTokens(dark, PLATFORM_ACCENT);
  return {
    T, dark, isDesktop, lang,
    setLang: tm.setLanguage || (() => {}),
    toggleTheme: tm.toggle || (() => {}),
  };
}

// Live store directory from the real backend (GET /api/tenant).
export function useStores() {
  const [stores, setStores] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    tenantApi.list()
      .then((data) => { if (alive) setStores(Array.isArray(data) ? data : []); })
      .catch((e) => { if (alive) { setError(e); setStores([]); } });
    return () => { alive = false; };
  }, []);
  return { stores, loading: stores === null, error };
}

// "esy" wordmark — gradient e-tile + lowercase wordmark + ".ge" suffix.
export function EsyMark({ T, size = 26, suffix = '.ge', onClick }) {
  const px = size;
  return (
    <div onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: T.text, cursor: onClick ? 'pointer' : 'default' }}>
      <span style={{
        width: px * 0.95, height: px * 0.95, borderRadius: px * 0.32,
        background: T.grad, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        font: `800 ${px * 0.6}px ${T.font}`, letterSpacing: '-0.04em',
        boxShadow: `0 8px 22px ${T.accent}40`,
      }}>e</span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1 }}>
        <span style={{ font: `700 ${px * 0.78}px ${T.font}`, letterSpacing: '-0.035em', color: T.text }}>esy</span>
        {suffix && <span style={{ font: `500 ${px * 0.5}px ${T.font}`, letterSpacing: '-0.02em', color: T.textDim }}>{suffix}</span>}
      </span>
    </div>
  );
}

// Store mark — the uploaded logo when set, else a gradient tile with initials.
export function StoreMark({ store, size = 40, radius = 12, ring = false }) {
  const initials = storeInitials(store);
  const shadow = ring ? `0 8px 22px ${store.primaryColor}40` : 'none';
  if (store.logoUrl) {
    return (
      <img
        src={store.logoUrl} alt={store.displayName || store.name || ''}
        style={{
          width: size, height: size, borderRadius: radius, objectFit: 'cover',
          display: 'block', boxShadow: shadow, flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: radius,
      background: `linear-gradient(135deg, ${store.primaryColor} 0%, ${store.secondaryColor || store.primaryColor} 100%)`,
      color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      font: `800 ${size * 0.4}px ${'Inter, sans-serif'}`, letterSpacing: '-0.04em',
      boxShadow: shadow,
      flexShrink: 0,
    }}>{initials}</span>
  );
}

export function StatusPill({ T, kind, children }) {
  const map = {
    live: { bg: T.dark ? '#3f8a4a26' : '#3f8a4a1a', fg: '#3f8a4a' },
    draft: { bg: T.surface2, fg: T.textDim },
    delivered: { bg: T.dark ? '#3f8a4a26' : '#3f8a4a1a', fg: '#3f8a4a' },
    shipped: { bg: T.accentBg, fg: T.accentFg },
    'out for delivery': { bg: '#f59e0b22', fg: '#b06800' },
    error: { bg: T.dark ? '#dc262633' : '#dc26261a', fg: '#dc2626' },
    new: { bg: T.accentBg, fg: T.accentFg },
  };
  const v = map[kind] || map.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px',
      borderRadius: 999, background: v.bg, color: v.fg,
      font: '700 10px Inter, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: v.fg }} />
      {children}
    </span>
  );
}

function IconBtn({ T, children, onClick, accent = false }) {
  return (
    <button onClick={onClick} style={{
      width: 36, height: 36, borderRadius: 12, border: `1px solid ${T.border}`,
      background: accent ? T.accentBg : 'transparent', color: accent ? T.accentFg : T.text,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    }}>{children}</button>
  );
}

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
);
const ThemeIcon = ({ dark }) => (dark
  ? <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></svg>
  : <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z" /></svg>);

// Responsive top bar — full nav on desktop, compact on mobile.
export function PTopBar({ current = 'home' }) {
  const { T, dark, isDesktop, lang, setLang, toggleTheme } = usePlatform();
  const { t } = useTranslation('platform');
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const signedIn = isAuthenticated;
  const initials = (user?.name || user?.firstName || 'You').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const flipLang = () => setLang(lang === 'ka' ? 'en' : 'ka');

  const link = (label, key, to) => (
    <span onClick={() => navigate(to)} style={{
      font: `600 13px ${T.font}`, color: current === key ? T.text : T.textDim,
      letterSpacing: '-0.01em', cursor: 'pointer',
      borderBottom: current === key ? `1.5px solid ${T.accent}` : '1.5px solid transparent',
      paddingBottom: 4,
    }}>{label}</span>
  );

  if (!isDesktop) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <EsyMark T={T} size={26} onClick={() => navigate('/')} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconBtn T={T} onClick={flipLang}><GlobeIcon /></IconBtn>
          <IconBtn T={T} onClick={toggleTheme}><ThemeIcon dark={dark} /></IconBtn>
          {signedIn ? (
            <span onClick={() => navigate('/account')} style={{
              width: 36, height: 36, borderRadius: 999, background: T.grad, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              font: `700 12px ${T.font}`, cursor: 'pointer', boxShadow: `0 8px 22px ${T.accent}40`,
            }}>{initials}</span>
          ) : (
            <button onClick={() => navigate('/signin')} style={{
              height: 36, padding: '0 14px', borderRadius: 999, border: `1px solid ${T.border}`,
              background: 'transparent', color: T.text, font: `600 12.5px ${T.font}`, cursor: 'pointer',
            }}>{t('nav.signIn')}</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 56px', borderBottom: `1px solid ${T.border}`,
      background: dark ? 'rgba(10,10,18,0.7)' : 'rgba(255,255,255,0.7)',
      backdropFilter: 'saturate(180%) blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        <EsyMark T={T} size={26} onClick={() => navigate('/')} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          {link(t('nav.browse'), 'browse', '/stores')}
          {link(t('nav.sell'), 'sell', '/sell')}
          {link(t('nav.account'), 'account', '/account')}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={flipLang} style={{
          height: 34, padding: '0 12px', borderRadius: 999, border: `1px solid ${T.border}`,
          background: 'transparent', color: T.textDim, font: `600 12px ${T.font}`, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}><GlobeIcon />{lang === 'ka' ? 'ქართული' : 'English'}</button>
        <button onClick={toggleTheme} style={{
          width: 34, height: 34, borderRadius: 999, border: `1px solid ${T.border}`,
          background: 'transparent', color: T.text,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><ThemeIcon dark={dark} /></button>
        {signedIn ? (
          <button onClick={() => navigate('/account')} style={{
            height: 34, padding: '4px 12px 4px 4px', borderRadius: 999, border: `1px solid ${T.border}`,
            background: T.surface, color: T.text, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8, font: `600 12.5px ${T.font}`,
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%', background: T.grad, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `700 10.5px ${T.font}`,
            }}>{initials}</span>
            {(user?.name || 'Account').split(' ')[0]}
          </button>
        ) : (
          <>
            <button onClick={() => navigate('/signin')} style={{
              height: 34, padding: '0 14px', borderRadius: 999, border: `1px solid ${T.border}`,
              background: 'transparent', color: T.text, font: `600 12.5px ${T.font}`, cursor: 'pointer',
            }}>{t('nav.signIn')}</button>
            <button onClick={() => navigate('/sell')} style={{
              height: 34, padding: '0 14px', borderRadius: 999, border: 'none',
              background: T.grad, color: '#fff', font: `700 12.5px ${T.font}`, cursor: 'pointer',
              boxShadow: `0 10px 28px ${T.accent}55`, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>{t('nav.openStore')}
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function PFooter({ compact = false }) {
  const { T, isDesktop } = usePlatform();
  const { t } = useTranslation('platform');
  const cols = [
    { title: t('footer.col.esy'), items: [t('footer.link.about'), t('footer.link.brand'), t('footer.link.careers'), t('footer.link.press')] },
    { title: t('footer.col.sellers'), items: [t('footer.link.openStore'), t('footer.link.pricing'), t('footer.link.sellerDocs'), t('footer.link.api')] },
    { title: t('footer.col.shoppers'), items: [t('footer.link.browseStores'), t('footer.link.giftCards'), t('footer.link.orderStatus'), t('footer.link.refunds')] },
    { title: t('footer.col.resources'), items: [t('footer.link.helpCenter'), t('footer.link.status'), t('footer.link.terms'), t('footer.link.privacy')] },
  ];
  const darkT = { ...T, text: '#f2f2f7', textDim: 'rgba(242,242,247,0.6)', textMute: 'rgba(242,242,247,0.4)' };
  if (!isDesktop) {
    return (
      <div style={{ padding: '32px 22px 26px', background: '#0b0b14', color: '#cfd0d8', font: `400 12.5px ${T.font}` }}>
        <EsyMark T={darkT} size={24} />
        <div style={{ marginTop: 12, color: 'rgba(242,242,247,0.55)', font: `400 12px/1.5 ${T.font}` }}>
          {t('footer.taglineShort')}
        </div>
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', font: `500 12px ${T.font}` }}>
          {[t('footer.link.about'), t('footer.link.pricing'), t('footer.link.helpCenter'), t('footer.link.openStore'), t('footer.link.browseStores'), t('footer.link.terms')].map((it) => (
            <span key={it} style={{ color: '#cfd0d8' }}>{it}</span>
          ))}
        </div>
        <div style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', font: `400 10.5px ${T.font}`, color: 'rgba(242,242,247,0.4)' }}>
          <span>{t('footer.rightsShort')}</span><span>{t('footer.langs')}</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: compact ? '40px 56px 28px' : '56px 56px 32px', borderTop: `1px solid ${T.border}`, background: '#0b0b14', color: '#cfd0d8', font: `400 13px ${T.font}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 36, marginBottom: 36 }}>
        <div>
          <EsyMark T={darkT} size={28} />
          <div style={{ marginTop: 16, color: 'rgba(242,242,247,0.6)', font: `400 13px/1.55 ${T.font}`, maxWidth: 280 }}>
            {t('footer.tagline')}
          </div>
          <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', font: `600 10.5px ${T.mono}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(242,242,247,0.7)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3f8a4a' }} />{t('footer.status')}
          </div>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <div style={{ font: `700 10.5px ${T.font}`, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(242,242,247,0.7)', marginBottom: 14 }}>{col.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {col.items.map((it) => <span key={it} style={{ color: '#cfd0d8', cursor: 'pointer' }}>{it}</span>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 22, borderTop: '1px solid rgba(255,255,255,0.1)', font: `400 11.5px ${T.font}`, color: 'rgba(242,242,247,0.45)' }}>
        <div>{t('footer.rights')}</div>
        <div style={{ display: 'flex', gap: 18 }}><span>{t('footer.langs')}</span><span>{t('footer.version')}</span></div>
      </div>
    </div>
  );
}

// Subtle striped placeholder used in store cards.
export function StoreArtStrip({ store, height = 96 }) {
  return (
    <div style={{
      height, width: '100%', borderRadius: 12,
      background: `linear-gradient(135deg, ${store.primaryColor}24 0%, ${(store.secondaryColor || store.primaryColor)}18 100%)`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: `repeating-linear-gradient(135deg, ${store.primaryColor}14 0 14px, transparent 14px 28px)` }} />
      <div style={{ position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(circle, ${store.primaryColor}55 0%, transparent 70%)`, filter: 'blur(8px)' }} />
    </div>
  );
}
