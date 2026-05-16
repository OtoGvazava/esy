import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import SearchOverlay from "./pages/SearchOverlay";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Saved from "./pages/Saved";
import Account from "./pages/Account";
import MyOrders from "./pages/MyOrders";
import Admin from "./pages/Admin";
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
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <GlowDock />
    </>
  );
}

function App() {
  const { mode, theme, toggleTheme } = useAppTheme();
  return (
    <Router>
      <AppProviders theme={theme} mode={mode}>
        <ThemeModeProvider value={{ mode, toggle: toggleTheme }}>
          <AppShell />
        </ThemeModeProvider>
      </AppProviders>
    </Router>
  );
}

export default App;
