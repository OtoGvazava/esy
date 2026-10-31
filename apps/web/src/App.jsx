import { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { platformUrl } from './utils/hosts';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import StoreAbout from './pages/StoreAbout';
import StoreClosed from './pages/StoreClosed';
import SearchOverlay from './pages/SearchOverlay';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import PayReturn from './pages/PayReturn';
import OrderSuccess from './pages/OrderSuccess';
import Account from './pages/Account';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import SignIn from './pages/SignIn';
import AuthCallback from './pages/AuthCallback';
import DisplaySettings from './pages/DisplaySettings';
import AppProviders from './providers/AppProviders';
import GlowDock from './components/glow/GlowDock';
import StoreBar from './components/store/StoreBar';
import { useDevice } from './contexts/DeviceContext';
import { TenantContext } from './contexts/TenantContext';
import ProfileGate from './components/ProfileGate';
import PlatformShell from './platform/PlatformShell';
import ManagerShell from './manager/ManagerShell';
import AdminShell from './admin/AdminShell';
import { useAppTheme } from './hooks/useAppTheme';
import { usePlatformHost, isManagerHost, isAdminHost } from './hooks/usePlatformHost';
import { ThemeModeProvider } from './contexts/ThemeModeContext';
import { DisplayPrefsProvider } from './contexts/DisplayPrefsContext';
import { safeAccent, PLATFORM_BRAND, ADMIN_BRAND } from './core/tokens';
import { normalizeDesign } from './core/design/normalize';

/** Leaves the SPA for another host. react-router only moves within one. */
function GoTo({ href }) {
  useEffect(() => { window.location.replace(href); }, [href]);
  return null;
}

// Storefront: shopping only (scope rule: no admin functions in the store).
// Management lives at manager.esy.ge — the ManageButton on Home is the one
// affordance, and the old /manage + /settings/store|config routes are gone.
function AppShell() {
  // The storefront takes two shapes, as the design specifies: a bar across the
  // top on desktop, and on a phone or tablet the store's own header with the
  // store's menu (tab bar, capsule, top tabs, side menu…). It had only ever had
  // the phone shape, so a desktop shopper got a dock and no search or cart.
  const { isDesktop } = useDevice();
  const { tenant, loading } = useContext(TenantContext);
  // A product page carries its own buy bar where the dock would sit.
  const { pathname } = useLocation();
  const dock = !isDesktop && !pathname.startsWith('/product/');

  // A suspended shop is closed to shoppers (D15). Nothing below this line
  // renders — not the bar, not the dock, not a single route — because a
  // suspended store that still lists products and accepts checkout is exactly
  // what suspension is supposed to stop. It gates on the resolved tenant, so a
  // slow first response shows nothing rather than flashing the shop open.
  if (!loading && tenant?.suspended) return <StoreClosed />;

  return (
    <>
      {isDesktop && <StoreBar />}
      {/* The page apart from the store's menu: text size zooms this (styles/display.css). */}
      <div className="esy-content">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/about" element={<StoreAbout />} />
        <Route path="/search" element={<SearchOverlay />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pay/return" element={<PayReturn />} />
        <Route path="/success" element={<OrderSuccess />} />
        <Route path="/account" element={<Account />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:orderNumber" element={<OrderDetail />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/settings/display" element={<DisplaySettings />} />
        {/* Language and appearance became the one display screen; old links land there. */}
        <Route path="/settings/language" element={<Navigate to="/settings/display" replace />} />
        <Route path="/settings/appearance" element={<Navigate to="/settings/display" replace />} />
        {/* /create-store was a real storefront route until the duplicate
            wizard was removed. Bookmarks and old links still point at it, so
            it forwards to the one flow that remains rather than dead-ending. */}
        <Route path="/create-store" element={<GoTo href={platformUrl('/sell')} />} />
        {/* Without this, an unknown path rendered a blank page — the shell
            drew, the router matched nothing, and the shopper got the chrome
            around an empty middle. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
      {dock && <GlowDock />}
      <ProfileGate />
    </>
  );
}

// The store style options drawn as data-* on <html> (styles/design-style.css).
const STYLE_KEYS = ['btn', 'corner', 'card', 'font', 'bg'];

// Faces a design may ask for, loaded only when a store uses them. Georgian
// text falls back to the matching Noto face, so each brings its own.
const FONT_FAMILIES = {
  serif: ['Fraunces:opsz,wght@9..144,400..700', 'Noto+Serif+Georgian:wght@400..700'],
  rounded: ['Nunito:wght@400..800'],
  mono: ['JetBrains+Mono:wght@400;600'],
  neon: ['Chakra+Petch:wght@500;700', 'JetBrains+Mono:wght@400;600'],
};

// Puts the active theme on <html>, where styles/themes.css keys every token:
// data-th is `esy` on the platform, manager and admin hosts and the store's
// theme on a storefront (Liquid Glass until a store picks another), data-md is
// light or dark, and --k-brand is the colour the theme draws its accent from —
// the store's own, esy blue on the platform, teal on admin. A storefront also
// carries its design's style options, each only when it differs from the theme.
function ThemeRoot({ mode }) {
  const platform = usePlatformHost();
  const { tenant } = useContext(TenantContext);
  const admin = isAdminHost();
  const store = !admin && !isManagerHost() && !platform;
  const design = normalizeDesign(store ? tenant?.design : null);
  const th = store ? design.theme : 'esy';
  const brand = admin ? ADMIN_BRAND : platform ? PLATFORM_BRAND : safeAccent(tenant?.primaryColor);
  const style = STYLE_KEYS.map((k) => (store && design.style[k] !== 'theme' ? design.style[k] : '')).join('|');
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.th = th;
    el.dataset.md = mode === 'dark' ? 'dark' : 'light';
    el.style.setProperty('--k-brand', brand);
    style.split('|').forEach((v, i) => {
      if (v) el.dataset[STYLE_KEYS[i]] = v; else delete el.dataset[STYLE_KEYS[i]];
    });
    const families = [...new Set([
      ...(FONT_FAMILIES[style.split('|')[3]] || []),
      ...(th === 'neon' ? FONT_FAMILIES.neon : []),
    ])];
    let link = document.getElementById('esy-design-fonts');
    if (families.length) {
      if (!link) {
        link = document.createElement('link');
        link.id = 'esy-design-fonts';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
    } else if (link) {
      link.remove();
    }
  }, [th, mode, brand, style]);
  return null;
}

// esy.ge → platform front door; manager.esy.ge → back office;
// <sub>.esy.ge → tenant storefront. Same bundle, host-selected shell.
function Shell() {
  const platform = usePlatformHost(); // unconditional — hooks rules
  if (isAdminHost()) return <AdminShell />;
  if (isManagerHost()) return <ManagerShell />;
  return platform ? <PlatformShell /> : <AppShell />;
}

function App() {
  const { mode, appearance, theme, toggleTheme, setMode, language, setLanguage } = useAppTheme();
  return (
    <Router>
      <AppProviders theme={theme} mode={mode}>
        <ThemeModeProvider value={{ mode, appearance, toggle: toggleTheme, setMode, language, setLanguage }}>
          <ThemeRoot mode={mode} />
          <DisplayPrefsProvider><Shell /></DisplayPrefsProvider>
        </ThemeModeProvider>
      </AppProviders>
    </Router>
  );
}

export default App;
