// The back office (manager.esy.ge). One host serves every store the account
// may manage; the selected store rides the URL as ?tenant=<sub> and the API
// client appends it to every /api call (see utils/api.js withManagerTenant).
//
// Store switching does a full page load on purpose: /api/auth/user's
// canManageStore is computed against the ?tenant= selection, and AuthContext
// fetches it once per load — a soft route change would keep the previous
// store's permission snapshot.
//
// Two scopes (see the architecture board): store scope (products / orders /
// settings, gated per store by OWNER/MANAGER membership) and the admin scope
// (platform-wide, gated by the ADMIN role). Admin routes live under /admin
// and call only /api/admin/** — keep it that way so a future split to its own
// host stays a routing change.
import { Routes, Route, Navigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useGlow } from '../styles/glow';
import { ThemePill, LangPill } from '../components/glow/GlowPills';
import { EsyMark } from '../platform/PlatformShared';
import ManagerHome from './ManagerHome';
import ManagerProducts from './ManagerProducts';
import StoreOrders from '../pages/StoreOrders';
import StoreSettings from '../pages/StoreSettings';
import ConfigSettings from '../pages/ConfigSettings';
import SignIn from '../pages/SignIn';
import AuthCallback from '../pages/AuthCallback';

function storeUrlFor(sub) {
  const { hostname, port, protocol } = window.location;
  const p = port ? `:${port}` : '';
  const base = hostname.endsWith('lvh.me') ? 'lvh.me'
    : hostname.endsWith('localhost') ? 'localhost' : 'esy.ge';
  return `${protocol}//${sub}.${base}${p}/`;
}

function TopBar() {
  const { t } = useTranslation('manager');
  const { user, isAuthenticated } = useAuth();
  const { T } = useGlow();
  const [params] = useSearchParams();
  const tenant = params.get('tenant');
  const { pathname } = useLocation();
  const q = tenant ? `?tenant=${encodeURIComponent(tenant)}` : '';
  const isAdmin = user?.role === 'admin';

  const tabs = tenant ? [
    { to: `/products${q}`, label: t('nav.products'), active: pathname.startsWith('/products') },
    { to: `/orders${q}`, label: t('nav.orders'), active: pathname.startsWith('/orders') },
    { to: `/settings${q}`, label: t('nav.settings'), active: pathname.startsWith('/settings') },
  ] : [];

  const tab = (active) => ({
    padding: '7px 14px', borderRadius: 999, textDecoration: 'none',
    font: `600 13px ${T.font}`,
    color: active ? T.accentFg : T.textDim,
    background: active ? T.accentBg : 'transparent',
    border: `1px solid ${active ? T.accent : 'transparent'}`,
  });

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
      borderBottom: `1px solid ${T.border}`, background: T.surface,
      position: 'sticky', top: 0, zIndex: 50, flexWrap: 'wrap',
    }}>
      {/* Full load on purpose — clears the ?tenant selection AND refreshes auth */}
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: T.text }}>
        <EsyMark T={T} size={26} />
        <span style={{ font: `800 15px ${T.font}`, letterSpacing: '-0.02em' }}>{t('title')}</span>
      </a>

      {tenant && (
        <span style={{
          font: `600 12px ${T.mono}`, color: T.textDim, padding: '4px 10px',
          border: `1px solid ${T.border}`, borderRadius: 999,
        }}>{tenant}</span>
      )}

      <nav style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
        {tabs.map(({ to, label, active }) => (
          <Link key={to} to={to} style={tab(active)}>{label}</Link>
        ))}
        {isAdmin && (
          <Link to="/admin/config" style={tab(pathname.startsWith('/admin'))}>{t('nav.admin')}</Link>
        )}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {tenant && (
          <>
            <a href={storeUrlFor(tenant)} target="_blank" rel="noreferrer"
               style={{ font: `600 12px ${T.font}`, color: T.textDim, textDecoration: 'none' }}>
              {t('nav.viewStore')} ↗
            </a>
            <a href="/" style={{ font: `600 12px ${T.font}`, color: T.textDim, textDecoration: 'none' }}>
              {t('nav.switchStore')}
            </a>
          </>
        )}
        <ThemePill T={T} />
        <LangPill T={T} />
        {isAuthenticated && (
          <span style={{ font: `500 12px ${T.font}`, color: T.textMute }}>{user?.email}</span>
        )}
      </div>
    </header>
  );
}

// Admin scope: ADMIN only — mirrors the backend's hasRole('ADMIN') gate on
// /api/admin/** so non-admins get a message instead of a broken screen.
function AdminGate({ children }) {
  const { t } = useTranslation('manager');
  const { user, loading } = useAuth();
  const { T } = useGlow();
  if (loading) return null;
  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: 48, textAlign: 'center', font: `600 15px ${T.font}`, color: T.textDim }}>
        {t('admin.restricted')}
      </div>
    );
  }
  return children;
}

export default function ManagerShell() {
  const { T } = useGlow();
  return (
    <div style={{ minHeight: '100vh', background: T.bg }}>
      <TopBar />
      <Routes>
        <Route path="/" element={<ManagerHome />} />
        <Route path="/products" element={<ManagerProducts />} />
        <Route path="/orders" element={<StoreOrders />} />
        <Route path="/settings" element={<StoreSettings />} />
        <Route path="/admin/config" element={<AdminGate><ConfigSettings /></AdminGate>} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
