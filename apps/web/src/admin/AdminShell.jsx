// admin.esy.ge — platform administration (D6).
//
// Its own host, deliberately not a scope inside the back office. Two things
// make that split worth the extra surface: a support account can be given this
// address without being handed the merchant back office, and the teal chrome
// plus the permanent banner make it impossible to mistake an admin action for
// a merchant one.
//
// Every screen here reads ONLY the /api/admin/** namespace, and the backend
// ignores ?tenant on this host — administration is cross-store and names its
// target explicitly. Keeping that true is what would make a future move cheap
// again, exactly as it made this one cheap.
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTK } from '../core/useTK';
import { Btn, Card, Note } from '../core/primitives';
import { EsyMark } from '../core/domain';
import { Icons } from '../core/icons';
import SignIn from '../pages/SignIn';
import AuthCallback from '../pages/AuthCallback';

const ConfigSettings = lazy(() => import('../pages/ConfigSettings'));

// Administration is teal, never the platform indigo. The accent is fixed rather
// than tenant-derived: this host serves no single store, so borrowing a store's
// brand here would be a lie about whose data is on screen.
const ADMIN_ACCENT = '#0f766e';

function useAdminTokens() {
  const { T, dark } = useTK();
  return { ...T, accent: ADMIN_ACCENT, accentFg: T.adminFg, accentBg: T.adminBg, dark };
}

/** Permanent, non-dismissable reminder of the scope you are operating in. */
function ScopeBand({ T }) {
  const { t } = useTranslation('admin');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 20px', background: T.admin, color: '#fff',
      font: `600 11.5px ${T.font}`, letterSpacing: '0.02em',
    }}>
      <Icons.shield size={13} />
      <span>{t('band.allStores')}</span>
    </div>
  );
}

function TopBar({ T }) {
  const { t } = useTranslation('admin');
  const { pathname } = useLocation();
  const tab = (active) => ({
    padding: '8px 12px', borderRadius: 10, textDecoration: 'none',
    font: `${active ? 600 : 500} 13px ${T.font}`,
    color: active ? T.text : T.textDim,
    background: active ? T.surface2 : 'transparent',
  });
  const tabs = [
    { to: '/stores', label: t('nav.stores') },
    { to: '/billing', label: t('nav.billing') },
    { to: '/config', label: t('nav.config') },
    { to: '/admins', label: t('nav.admins') },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 20px', borderBottom: `1px solid ${T.border}`, background: T.surface,
    }}>
      <EsyMark T={T} size={28} />
      <span style={{ font: `700 13px ${T.mono}`, color: T.admin, letterSpacing: '-0.01em' }}>admin</span>
      <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
        {tabs.map((x) => (
          <Link key={x.to} to={x.to} style={tab(pathname.startsWith(x.to))}>{x.label}</Link>
        ))}
      </nav>
    </div>
  );
}

/**
 * The two states a non-admin can be in on this host. Both are designed rather
 * than left to a redirect, because the likely visitor is a merchant who
 * followed a link and needs to be told plainly that their account manages
 * shops, not the platform.
 */
function Gate({ T, kind }) {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      font: `400 14px ${T.font}`,
    }}>
      <Card T={T} pad={28} style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <EsyMark T={T} size={34} />
        </div>
        <div style={{ font: `700 18px ${T.font}`, marginBottom: 6, letterSpacing: '-0.01em' }}>
          {kind === 'denied' ? t('gate.deniedTitle') : t('gate.signInTitle')}
        </div>
        <div style={{ color: T.textDim, marginBottom: 18, lineHeight: 1.55 }}>
          {kind === 'denied' ? t('gate.deniedBody') : t('gate.signInBody')}
        </div>
        {kind === 'denied' && user?.email && (
          <Note T={T} tone="admin" style={{ marginBottom: 18, textAlign: 'left' }}>
            {t('gate.signedInAs', { email: user.email })}
          </Note>
        )}
        <Btn
          T={T}
          kind={kind === 'denied' ? 'ghost' : 'primary'}
          size="md"
          full
          onClick={() => { window.location.href = kind === 'denied' ? '/' : '/signin'; }}
        >
          {kind === 'denied' ? t('gate.backToPlatform') : t('gate.signIn')}
        </Btn>
      </Card>
    </div>
  );
}

/** Placeholder for a screen whose /api/admin endpoint is not built yet. */
function Pending({ T, titleKey }) {
  const { t } = useTranslation('admin');
  return (
    <div style={{ padding: 20 }}>
      <div style={{ font: `700 17px ${T.font}`, marginBottom: 10 }}>{t(titleKey)}</div>
      <Note T={T} tone="admin">{t('pending')}</Note>
    </div>
  );
}

export default function AdminShell() {
  const T = useAdminTokens();
  const { isAuthenticated, loading, user } = useAuth();
  const { pathname } = useLocation();

  // The OAuth round-trip must reach its own routes before any gate runs, or
  // signing in on this host can never complete.
  if (pathname.startsWith('/signin') || pathname.startsWith('/auth/callback')) {
    return (
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    );
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: T.bg }} />;
  }
  if (!isAuthenticated) return <Gate T={T} kind="signin" />;
  if (user?.role !== 'admin') return <Gate T={T} kind="denied" />;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
      <ScopeBand T={T} />
      <TopBar T={T} />
      <Suspense fallback={<div style={{ padding: 20, color: T.textMute }} />}>
        <Routes>
          <Route path="/" element={<Navigate to="/stores" replace />} />
          <Route path="/stores" element={<Pending T={T} titleKey="nav.stores" />} />
          <Route path="/billing" element={<Pending T={T} titleKey="nav.billing" />} />
          <Route path="/config" element={<ConfigSettings />} />
          <Route path="/admins" element={<Pending T={T} titleKey="nav.admins" />} />
          <Route path="*" element={<Navigate to="/stores" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
