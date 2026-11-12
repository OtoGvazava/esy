/* eslint-disable react-refresh/only-export-components */
// Platform-site shared primitives. Reuses the Glow design tokens with the
// platform blue as the default accent; tenant brand colors only ever appear
// on store cards (the "wall of brands against calm esy chrome" rule).
// (Shared module: intentionally exports hooks + components together.)
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow, glowTokens, shiftHue } from '../styles/glow';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { directoryQuery } from '../core/query/queries';
import { managerUrl } from '../utils/hosts';
import AccountMenu from '../components/account/AccountMenu';
import { PLATFORM_ACCENT, storeInitials } from './platformData';
import { Av, Btn, Glyph, IconBtn, Logo, initialsOf, miStyle, usePDevice } from './PlatformKit';
import { markIfComplete, markLoaded } from '../core/imgFade';

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
// One cached read for the landing page, the directory and the not-found page.
export function useStores() {
  const { data, error, isPending } = useQuery(directoryQuery());
  const stores = data || (error ? NO_STORES : null);
  return { stores, loading: isPending, error: error || null };
}
const NO_STORES = [];

// "esy" wordmark — the design's bag mark (a bag with a smile) in the platform
// colour, then the lowercase wordmark. The design writes plain "esy"; a caller
// can still pass a suffix such as ".ge".
export function EsyMark({ T, size = 26, suffix = '', onClick }) {
  const px = size;
  return (
    <div onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: T.text, cursor: onClick ? 'pointer' : 'default' }}>
      <svg viewBox="0 0 48 48" aria-hidden="true" style={{ width: px * 1.1, height: px * 1.1, color: T.accent, flex: 'none' }}>
        <rect x="4" y="10" width="40" height="34" rx="13" fill="currentColor" />
        <path d="M17 12V9.5a7 7 0 0 1 14 0V12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M15.5 27.5c4.5 5.5 12.5 5.5 17 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1 }}>
        <span style={{ font: `700 ${px * 0.78}px ${T.font}`, letterSpacing: '-0.035em', color: T.text }}>{'esy'}</span>
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
        className="esy-img" ref={markIfComplete} onLoad={markLoaded} decoding="async"
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
      font: '700 10px Inter, sans-serif', letterSpacing: '0.06em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: v.fg }} />
      {children}
    </span>
  );
}

/** "ქა · EN" — both languages named, the current one first, as on every esy header. */
function LangBtn({ T, ph, style }) {
  const { lang, setLang } = usePlatform();
  const { t } = useTranslation('platform');
  return (
    <Btn
      T={T}
      size="sm"
      ph={ph}
      aria-label={t('chrome.langLabel')}
      onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}
      style={style}
    >
      {t('chrome.lang')}
    </Btn>
  );
}

/**
 * A link to a section of the landing page. The landing owns the section ids
 * (`how`, `pricing`); from any other page this goes home first, and the hash
 * effect in the top bar scrolls once the section exists.
 */
function useSectionLink() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (id) => (e) => {
    e.preventDefault();
    const el = pathname === '/' && document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else navigate(`/#${id}`);
  };
}

// The design's PlatTop. Phone: the mark, the open-a-store button and a menu.
// Tablet: two links (prices and help would not fit), the language, sign in,
// the button and the menu. Desktop: four links and no menu. Signed in, the
// avatar and "my store" take the place of sign-in and the open button.
// `current` marks the link of the page you are on; `cta={false}` leaves the
// open-a-store button out where the page is itself that offer (the landing).
export function PTopBar({ current = 'none', cta = true }) {
  const { T } = usePlatform();
  const { ph, desk, gut } = usePDevice();
  const { t } = useTranslation('platform');
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [menu, setMenu] = useState(false);
  const barRef = useRef(null);
  // The scrim dims the page under the bar, not the bar itself: measured when the menu opens.
  const [scrimTop, setScrimTop] = useState(0);
  const toggleMenu = () => {
    setScrimTop(Math.max(0, barRef.current?.getBoundingClientRect().bottom || 0));
    setMenu((v) => !v);
  };
  const section = useSectionLink();
  // Older call sites name the directory "browse".
  const active = current === 'browse' ? 'stores' : current;

  // Land on #how, #pricing or #contact wherever the page carries that section.
  useEffect(() => {
    if (!hash) return undefined;
    const id = decodeURIComponent(hash.slice(1));
    const timer = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 60);
    return () => clearTimeout(timer);
  }, [hash, pathname]);

  useEffect(() => { setMenu(false); }, [pathname, hash]);
  useEffect(() => {
    if (!menu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  const name = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
  const links = [
    { k: 'stores', label: t('chrome.stores'), to: '/stores' },
    { k: 'how', label: t('chrome.how'), section: 'how' },
    { k: 'price', label: t('chrome.price'), section: 'pricing', wide: true },
    { k: 'help', label: t('chrome.help'), to: '/help', wide: true },
  ];
  const linkProps = (l) => (l.to
    ? { as: Link, to: l.to }
    : { as: 'a', href: `/#${l.section}`, onClick: section(l.section) });

  // The avatar opens the account menu, the same one every app has (U1): a
  // popover under it on a desktop, a sheet on a tablet and a phone.
  const avatar = (
    <AccountMenu app="platform" sheet={!desk} wide={!ph} wrapStyle={{ display: 'inline-flex' }} onSignedOut={() => navigate('/')}>
      {({ triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          aria-label={t('chrome.account', { name: name || user?.email || '' })}
          className="esy-press"
          style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer', display: 'inline-flex', borderRadius: '50%' }}
        >
          <Av T={T} size="sm" ink>{initialsOf(name, user?.email)}</Av>
        </button>
      )}
    </AccountMenu>
  );

  // Each page draws its own bar, so the bar is named for the page change
  // (styles/motion.css): it stays in place while the page under it changes,
  // and the current link's underline, named too, slides from the old link to
  // the new one rather than jumping.
  return (
    <header ref={barRef} style={{
      display: 'flex', alignItems: 'center', gap: 28, padding: `14px ${gut}px`,
      position: 'relative', zIndex: 30, flex: 'none', viewTransitionName: 'esy-topbar',
    }}>
      {/* The bar's own controls sit above the open menu's panel (z 2); the scrim starts under the bar. */}
      <Link to="/" aria-label={t('chrome.home')} style={{ textDecoration: 'none', display: 'inline-flex', position: 'relative', zIndex: 3 }}>
        <Logo T={T} />
      </Link>

      {!ph && (
        <nav aria-label={t('chrome.navLabel')} style={{ display: 'flex', gap: 24, whiteSpace: 'nowrap', font: `500 14px ${T.font}`, position: 'relative', zIndex: 3 }}>
          {links.filter((l) => desk || !l.wide).map((l) => {
            const { as: As, ...p } = linkProps(l);
            const on = active === l.k;
            return (
              <As
                key={l.k}
                {...p}
                aria-current={on ? 'page' : undefined}
                className="esy-press-soft"
                style={{ position: 'relative', textDecoration: 'none', color: on ? T.text : T.textDim, fontWeight: on ? 600 : 500 }}
              >
                {l.label}
                {on && (
                  <span aria-hidden="true" style={{
                    position: 'absolute', left: 0, right: 0, bottom: -7, height: 2, borderRadius: 2,
                    background: T.accent, viewTransitionName: 'esy-pnav-ind',
                  }} />
                )}
              </As>
            );
          })}
        </nav>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 3 }}>
        {!ph && <LangBtn T={T} ph={ph} />}
        {isAuthenticated && avatar}
        {!isAuthenticated && !ph && (
          <Btn T={T} size="sm" ph={ph} to="/signin">{t('chrome.signIn')}</Btn>
        )}
        {!isAuthenticated && cta && (
          <Btn T={T} kind="p" size="sm" ph={ph} to="/sell">{t('chrome.openStore')}</Btn>
        )}
        {isAuthenticated && !ph && (
          <Btn T={T} kind="s" size="sm" ph={ph} href={managerUrl('/')}>{t('chrome.myStore')}</Btn>
        )}
        {!desk && (
          <IconBtn
            T={T}
            label={t('chrome.menu')}
            aria-expanded={menu}
            aria-controls="esy-platform-menu"
            onClick={toggleMenu}
          >
            <Glyph name={menu ? 'close' : 'menu'} />
          </IconBtn>
        )}
      </div>

      {menu && !desk && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setMenu(false)}
            style={{ position: 'fixed', left: 0, right: 0, bottom: 0, top: scrimTop, background: 'rgba(8,8,12,0.44)', zIndex: 1 }}
          />
          <nav
            id="esy-platform-menu"
            aria-label={t('chrome.menu')}
            // Opens out of the menu button at the bar's end.
            className="esy-menu-in"
            style={{
              position: 'absolute', top: '100%', left: gut, right: gut, zIndex: 2,
              background: T.surface, border: 'var(--k-card-bd)', borderRadius: 'var(--k-r-card)',
              boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)', padding: 8,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            {links.map((l) => {
              const { as: As, onClick, ...p } = linkProps(l);
              // A section of the page you are on changes no route, so the menu closes here too.
              return (
                <As
                  key={l.k}
                  {...p}
                  onClick={(e) => { onClick?.(e); setMenu(false); }}
                  aria-current={active === l.k ? 'page' : undefined}
                  style={miStyle(T, active === l.k)}
                >
                  {l.label}
                </As>
              );
            })}
            <span aria-hidden="true" style={{ height: 1, background: T.border, margin: '6px 4px' }} />
            {isAuthenticated ? (
              <>
                <Link to="/account" style={miStyle(T, pathname === '/account')}>{t('chrome.myAccount')}</Link>
                <a href={managerUrl('/')} style={miStyle(T, false)}>{t('chrome.myStore')}</a>
              </>
            ) : (
              <Link to="/signin" style={miStyle(T, false)}>{t('chrome.signIn')}</Link>
            )}
            <LangRow T={T} />
          </nav>
        </>
      )}
    </header>
  );
}

/** The language switch as a menu row (phone and tablet menu). */
function LangRow({ T }) {
  const { lang, setLang } = usePlatform();
  const { t } = useTranslation('platform');
  return (
    <button type="button" onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')} aria-label={t('chrome.langLabel')} style={miStyle(T, false)}>
      <Glyph name="globe" size={18} />
      <span style={{ flex: 1 }}>{t('chrome.langRow')}</span>
      <span style={{ font: `600 13px ${T.font}`, color: T.textDim }}>{t('chrome.lang')}</span>
    </button>
  );
}

// The design's PlatFoot: the mark and one line, three short columns where
// every entry goes somewhere real, then the year and the language switch.
// (Older call sites still pass `compact`; the footer has one size now.)
export function PFooter() {
  const { T } = usePlatform();
  const { ph, tab } = usePDevice();
  const { t } = useTranslation('platform');
  const section = useSectionLink();
  const gut = ph ? 16 : tab ? 24 : 48;
  const cols = [
    { h: 'esy', links: [
      { label: t('chrome.stores'), to: '/stores' },
      { label: t('chrome.how'), section: 'how' },
      { label: t('chrome.price'), section: 'pricing' },
    ] },
    { h: t('chrome.footHelp'), links: [
      { label: t('chrome.helpCenter'), to: '/help' },
      { label: t('chrome.contact'), to: '/help#contact' },
    ] },
    { h: t('chrome.footRules'), links: [
      { label: t('chrome.terms'), to: '/terms' },
      { label: t('chrome.privacy'), to: '/privacy' },
      { label: t('chrome.returns'), to: '/returns' },
      { label: t('chrome.sellerTerms'), to: '/seller-terms' },
    ] },
  ];
  const linkStyle = {
    display: 'flex', alignItems: 'center', minHeight: ph ? 40 : 30, color: T.textDim,
    textDecoration: 'none', fontSize: 12.5,
  };

  return (
    <footer style={{
      borderTop: `1px solid ${T.border}`, background: T.surface, color: T.text, font: `400 14px/1.45 ${T.font}`,
      padding: `${ph ? 24 : 32}px ${gut}px ${ph ? 20 : 24}px`,
      display: 'flex', flexDirection: 'column', gap: ph ? 16 : 24, flex: 'none',
    }}>
      <div style={{ display: 'flex', flexDirection: ph ? 'column' : 'row', gap: ph ? 18 : 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, flex: '1.2 1 0' }}>
          <Link to="/" aria-label={t('chrome.home')} style={{ textDecoration: 'none', display: 'inline-flex', alignSelf: 'flex-start' }}>
            <Logo T={T} />
          </Link>
          <span style={{ fontSize: 12.5, color: T.textDim, maxWidth: 300, textWrap: 'pretty' }}>{t('chrome.tagline')}</span>
        </div>
        <nav
          aria-label={t('chrome.footLabel')}
          style={{
            display: 'grid', gridTemplateColumns: `repeat(${ph ? 2 : 3}, minmax(0, 1fr))`,
            gap: ph ? '12px 16px' : '0 32px', flex: '3 1 0', minWidth: 0,
          }}
        >
          {cols.map((col) => (
            <div key={col.h} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <b style={{ display: 'block', marginBottom: 4, fontSize: 12.5, color: T.text }}>{col.h}</b>
              {col.links.map((l) => (l.to
                ? <Link key={l.label} to={l.to} style={linkStyle}>{l.label}</Link>
                : <a key={l.label} href={`/#${l.section}`} onClick={section(l.section)} style={linkStyle}>{l.label}</a>))}
            </div>
          ))}
        </nav>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, borderTop: `1px solid ${T.border}`,
        paddingTop: ph ? 12 : 16,
      }}>
        <span style={{ fontSize: 12.5, color: T.textDim }}>{t('chrome.rights')}</span>
        <LangBtn T={T} ph={ph} style={{ marginLeft: 'auto' }} />
      </div>
    </footer>
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
