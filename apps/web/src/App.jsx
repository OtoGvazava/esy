import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import SearchOverlay from "./pages/SearchOverlay";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Saved from "./pages/Saved";
import Account from "./pages/Account";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import SignIn from "./pages/SignIn";
import SignInVerify from "./pages/SignInVerify";
import LanguageSettings from "./pages/LanguageSettings";
import AppearanceSettings from "./pages/AppearanceSettings";
import AppProviders from "./providers/AppProviders";
import GlowDock from "./components/glow/GlowDock";
import { useAppTheme } from "./hooks/useAppTheme";
import { ThemeModeProvider } from "./contexts/ThemeModeContext";

function AppShell() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/search" element={<SearchOverlay />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/success" element={<OrderSuccess />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/account" element={<Account />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signin/verify" element={<SignInVerify />} />
        <Route path="/settings/language" element={<LanguageSettings />} />
        <Route path="/settings/appearance" element={<AppearanceSettings />} />
      </Routes>
      <GlowDock />
    </>
  );
}

function App() {
  const { mode, theme, toggleTheme, setMode, language, setLanguage } = useAppTheme();
  return (
    <Router>
      <AppProviders theme={theme} mode={mode}>
        <ThemeModeProvider value={{ mode, toggle: toggleTheme, setMode, language, setLanguage }}>
          <AppShell />
        </ThemeModeProvider>
      </AppProviders>
    </Router>
  );
}

export default App;
