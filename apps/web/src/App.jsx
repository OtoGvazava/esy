import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import SearchOverlay from './pages/SearchOverlay';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import PayReturn from './pages/PayReturn';
import OrderSuccess from './pages/OrderSuccess';
import Account from './pages/Account';
import Orders from './pages/Orders';
import StoreOrders from './pages/StoreOrders';
import SignIn from './pages/SignIn';
import CreateStore from './pages/CreateStore';
import AuthCallback from './pages/AuthCallback';
import LanguageSettings from './pages/LanguageSettings';
import AppearanceSettings from './pages/AppearanceSettings';
import StoreSettings from './pages/StoreSettings';
import ConfigSettings from './pages/ConfigSettings';
import AppProviders from './providers/AppProviders';
import GlowDock from './components/glow/GlowDock';
import ProfileGate from './components/ProfileGate';
import PlatformShell from './platform/PlatformShell';
import { useAppTheme } from './hooks/useAppTheme';
import { usePlatformHost } from './hooks/usePlatformHost';
import { ThemeModeProvider } from './contexts/ThemeModeContext';
import { OwnerToolsProvider } from './contexts/OwnerToolsContext';

function AppShell() {
  return (
    <OwnerToolsProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/search" element={<SearchOverlay />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pay/return" element={<PayReturn />} />
        <Route path="/success" element={<OrderSuccess />} />
        <Route path="/account" element={<Account />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/manage/orders" element={<StoreOrders />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/create-store" element={<CreateStore />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/settings/language" element={<LanguageSettings />} />
        <Route path="/settings/appearance" element={<AppearanceSettings />} />
        <Route path="/settings/store" element={<StoreSettings />} />
        <Route path="/settings/config" element={<ConfigSettings />} />
      </Routes>
      <GlowDock />
      <ProfileGate />
    </OwnerToolsProvider>
  );
}

// esy.ge → platform front door; <sub>.esy.ge → tenant storefront. Same bundle,
// host-selected shell (see usePlatformHost).
function Shell() {
  return usePlatformHost() ? <PlatformShell /> : <AppShell />;
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
