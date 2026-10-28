import { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import LanguageSettings from './pages/LanguageSettings';
import AppearanceSettings from './pages/AppearanceSettings';
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
  // top on desktop and tablet, the dock on a phone. It had only ever had the
  // phone shape, so a desktop shopper got a dock and no search or cart.
  const { isMobile } = useDevice();
  const { tenant, loading } = useContext(TenantContext);

  // A suspended shop is closed to shoppers (D15). Nothing below this line
  // renders — not the bar, not the dock, not a single route — because a
  // suspended store that still lists products and accepts checkout is exactly
  // what suspension is supposed to stop. It gates on the resolved tenant, so a
  // slow first response shows nothing rather than flashing the shop open.
  if (!loading && tenant?.suspended) return <StoreClosed />;

  return (
    <>
      {!isMobile && <StoreBar />}
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
        <Route path="/settings/language" element={<LanguageSettings />} />
        <Route path="/settings/appearance" element={<AppearanceSettings />} />
        {/* /create-store was a real storefront route until the duplicate
            wizard was removed. Bookmarks and old links still point at it, so
            it forwards to the one flow that remains rather than dead-ending. */}
        <Route path="/create-store" element={<GoTo href={platformUrl('/sell')} />} />
        {/* Without this, an unknown path rendered a blank page — the shell
            drew, the router matched nothing, and the shopper got the chrome
            around an empty middle. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isMobile && <GlowDock />}
      <ProfileGate />
    </>
  );
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
  const { mode, theme, toggleTheme, setMode, language, setLanguage } = useAppTheme();
  return (
    <Router>
      <AppProviders theme={theme} mode={mode}>
        <ThemeModeProvider value={{ mode, toggle: toggleTheme, setMode, language, setLanguage }}>
          <Shell />
        </ThemeModeProvider>
      </AppProviders>
    </Router>
  );
}

export default App;
