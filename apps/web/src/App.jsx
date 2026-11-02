import { useContext, useEffect, useLayoutEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import StoreClosed from './pages/StoreClosed';
import OfflineBanner from './components/shop/OfflineBanner';
import AppProviders from './providers/AppProviders';
import GlowDock from './components/glow/GlowDock';
import StoreBar from './components/store/StoreBar';
import { useDevice } from './contexts/DeviceContext';
import { TenantContext } from './contexts/TenantContext';
import ProfileGate from './components/ProfileGate';
import { useAppTheme } from './hooks/useAppTheme';
import { usePlatformHost, isManagerHost, isAdminHost } from './hooks/usePlatformHost';
import { ThemeModeProvider } from './contexts/ThemeModeContext';
import { DisplayPrefsProvider } from './contexts/DisplayPrefsContext';
import { safeAccent, PLATFORM_BRAND, ADMIN_BRAND } from './core/tokens';
import { normalizeDesign } from './core/design/normalize';
import { STYLE_KEYS, designFamilies, fontsHref } from './core/design/htmlAttrs';
import NavProgress from './router/NavProgress';

/** Leaves the SPA for another host. react-router only moves within one. */
export function GoTo({ href }) {
  useEffect(() => { window.location.replace(href); }, [href]);
  return null;
}

// Storefront: shopping only (scope rule: no admin functions in the store).
// Management lives at manager.esy.ge — the ManageButton on Home is the one
// affordance, and the old /manage + /settings/store|config routes are gone.
// The routes themselves are router/store.jsx; this is the chrome around them.
export function StoreLayout() {
  // The storefront takes two shapes, as the design specifies: a bar across the
  // top on desktop, and on a phone or tablet the store's own header with the
  // store's menu (tab bar, capsule, top tabs, side menu…). It had only ever had
  // the phone shape, so a desktop shopper got a dock and no search or cart.
  const { isDesktop } = useDevice();
  const { tenant, loading } = useContext(TenantContext);
  // A product page carries its own buy bar where the dock would sit.
  const { pathname } = useLocation();
  // The bank's return page asks the shopper to wait on it, so it is drawn
  // with no store menus at all (A8). The placed order, one order, personal
  // details and sign-in are pushed screens with their own way back: the design
  // draws them without the tab bar (A9, C2, C3, D2, B1).
  const focus = pathname === '/pay/return';
  const pushed = focus || pathname === '/success' || pathname === '/signin'
    || pathname.startsWith('/orders/') || pathname === '/account/personal';
  const dock = !isDesktop && !pathname.startsWith('/product/') && !pushed;

  // Without the store inlined in the page (SpaIndex.java), its chrome waits for
  // the store rather than drawing esy's name and colours first: the page's
  // own ground until it arrives.
  if (loading && !tenant) return <div style={{ minHeight: '100vh' }} />;

  // A suspended shop is closed to shoppers (D15). Nothing below this line
  // renders — not the bar, not the dock, not a single route — because a
  // suspended store that still lists products and accepts checkout is exactly
  // what suspension is supposed to stop. It gates on the resolved tenant, so a
  // slow first response shows nothing rather than flashing the shop open.
  if (!loading && tenant?.suspended) return <StoreClosed />;

  return (
    <>
      {isDesktop && !focus && <StoreBar />}
      {/* The page apart from the store's menu: text size zooms this (styles/display.css). */}
      <div className="esy-content">
      <OfflineBanner />
      <Outlet />
      </div>
      {dock && <GlowDock />}
      <ProfileGate />
    </>
  );
}

// The store style options are drawn as data-* on <html> (styles/design-style.css),
// and a design's faces load only when a store uses them (core/design/htmlAttrs.js,
// which the page's pre-paint script reads too).

// Puts the active theme on <html>, where styles/themes.css keys every token:
// data-th is `esy` on the platform, manager and admin hosts and the store's
// theme on a storefront (Liquid Glass until a store picks another), data-md is
// light or dark, and --k-brand is the colour the theme draws its accent from —
// the store's own, esy blue on the platform, teal on admin. A storefront also
// carries its design's style options, each only when it differs from the theme.
function ThemeRoot({ mode }) {
  const platform = usePlatformHost();
  const { tenant, loading } = useContext(TenantContext);
  const admin = isAdminHost();
  // A suspended store has no storefront of its own: its page is esy's, in the
  // esy theme and the platform's colour (E2).
  const storefront = !admin && !isManagerHost() && !platform;
  const closed = storefront && !!tenant?.suspended;
  const store = storefront && !closed;
  const design = normalizeDesign(store ? tenant?.design : null);
  const th = store ? design.theme : 'esy';
  const brand = admin ? ADMIN_BRAND : platform || closed ? PLATFORM_BRAND : safeAccent(tenant?.primaryColor);
  const style = STYLE_KEYS.map((k) => (store && design.style[k] !== 'theme' ? design.style[k] : '')).join('|');
  // Before paint, so a change of store or theme never shows one frame of the
  // old one. The first frame is drawn by the page itself (boot/paint.js) from
  // the same store and the same lists, so on mount this changes nothing.
  useLayoutEffect(() => {
    // A store not known yet keeps what the page drew: drawing the defaults
    // until it arrives is exactly the flash the page draws its first frame
    // to avoid.
    if (storefront && loading && !tenant) return;
    const el = document.documentElement;
    el.dataset.th = th;
    el.dataset.md = mode === 'dark' ? 'dark' : 'light';
    el.style.setProperty('--k-brand', brand);
    style.split('|').forEach((v, i) => {
      if (v) el.dataset[STYLE_KEYS[i]] = v; else delete el.dataset[STYLE_KEYS[i]];
    });
    const families = designFamilies(style.split('|')[3], th);
    let link = document.getElementById('esy-design-fonts');
    if (families.length) {
      if (!link) {
        link = document.createElement('link');
        link.id = 'esy-design-fonts';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      const href = fontsHref(families);
      // The same faces the pre-paint script started: left alone, not fetched again.
      if (link.href !== href) link.href = href;
    } else if (link) {
      link.remove();
    }
  }, [th, mode, brand, style, storefront, loading, tenant]);
  return null;
}

// The root of every host's route table (router/index.jsx): the providers, the
// theme on <html>, the navigation bar and scroll restoration. esy.ge is the
// platform front door, manager.esy.ge the back office, admin.esy.ge
// administration and <sub>.esy.ge a storefront: the same bundle, with the
// host's own chrome as the layout route under this one.
export default function AppRoot() {
  const { mode, appearance, theme, toggleTheme, setMode, language, setLanguage } = useAppTheme();
  return (
    <AppProviders theme={theme} mode={mode}>
      <ThemeModeProvider value={{ mode, appearance, toggle: toggleTheme, setMode, language, setLanguage }}>
        <ThemeRoot mode={mode} />
        <NavProgress />
        {/* A new page opens at its top; back and forward return to where the
            page was left, which the query cache can redraw at once. */}
        <ScrollRestoration />
        <DisplayPrefsProvider><Outlet /></DisplayPrefsProvider>
      </ThemeModeProvider>
    </AppProviders>
  );
}
