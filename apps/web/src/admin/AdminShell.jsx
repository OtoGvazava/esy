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
// target explicitly.
//
// The chrome takes the same three shapes as the back office — 252px sidebar,
// 76px icon rail, mobile dock — so the two surfaces feel like one product
// while staying unmistakably different colours. Each nav entry shows its route
// underneath, which the merchant sidebar does not: an admin reading a support
// ticket needs to know which URL they are being asked about.
import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { Btn, Card, Note } from '../core/primitives';
import { Icons } from '../core/icons';
import SignIn from '../pages/SignIn';
import AuthCallback from '../pages/AuthCallback';
import { useAdminTokens } from './adminTokens';
import AdminStores from './AdminStores';
import AdminStoreDetail from './AdminStoreDetail';
import AdminBilling from './AdminBilling';
import AdminAdmins from './AdminAdmins';

const AdminConfig = lazy(() => import('./AdminConfig'));
const AdminIntegrations = lazy(() => import('./AdminIntegrations'));

/** [key, icon, route] — the order the sidebar shows them in. */
const ANAV = [
  ['stores', 'grid', '/stores'],
  ['billing', 'card', '/billing'],
  ['integrations', 'phone', '/integrations'],
  ['config', 'gear', '/config'],
  ['admins', 'shield', '/admins'],
];

/** The admin lockup: a shield tile plus the host, never the platform mark. */
function AdminMark({ T, size = 17 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: T.text }}>
      <span style={{
        width: size * 1.18, height: size * 1.18, borderRadius: size * 0.32,
        background: T.admin, color: '#fff', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icons.shield width={size * 0.72} height={size * 0.72} />
      </span>
      <span style={{ font: `800 ${size}px ${T.font}`, letterSpacing: '-0.03em' }}>admin.esy.ge</span>
    </span>
  );
}

function activeKey(pathname) {
  const hit = ANAV.find(([, , route]) => pathname.startsWith(route));
  return hit ? hit[0] : 'stores';
}

function Side({ T, t, active, email }) {
  return (
    <div style={{
      width: 252, flexShrink: 0, borderRight: `1px solid ${T.border}`,
      background: T.surface, display: 'flex', flexDirection: 'column',
      padding: '20px 14px 16px', minHeight: '100vh',
    }}>
      <div style={{ padding: '0 8px' }}><AdminMark T={T} size={17} /></div>

      <div style={{
        margin: '14px 0', padding: '11px 12px', borderRadius: 13,
        background: T.adminBg, border: `1px solid ${T.admin}55`,
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <span style={{
          width: 30, height: 30, borderRadius: 10, background: T.admin, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, font: `800 12px ${T.font}`,
        }}>{(email || 'A').charAt(0).toUpperCase()}</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', font: `700 12px ${T.font}`, color: T.adminFg }}>
            {t('role.ADMIN')}
          </span>
          <span style={{
            display: 'block', font: `500 10px ${T.font}`, color: T.textMute,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{email}</span>
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {ANAV.map(([k, icon, route]) => {
          const Ic = Icons[icon];
          const on = k === active;
          return (
            <Link key={k} to={route} style={{
              display: 'flex', flexDirection: 'column', gap: 1,
              padding: '8px 12px', borderRadius: 12, textDecoration: 'none',
              background: on ? T.adminBg : 'transparent',
              color: on ? T.adminFg : T.textDim,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 11, font: `${on ? 700 : 500} 13.5px ${T.font}` }}>
                {Ic && <Ic width="16" height="16" />} {t(`nav.${k}`)}
              </span>
              {/* The URL, because a support conversation is usually about one. */}
              <span style={{ font: `500 9.5px ${T.mono}`, color: T.textMute, paddingLeft: 27 }}>
                {route}
              </span>
            </Link>
          );
        })}
      </nav>

      <span style={{ flex: 1 }} />
      <div style={{ padding: '0 4px 12px', font: `400 11px/1.55 ${T.font}`, color: T.textMute }}>
        {t('shell.sidebarNote')}
      </div>
      <a href={managerUrl()} style={{ textDecoration: 'none' }}>
        <Btn T={T} kind="ghost" size="sm" full>
          <Icons.arrowL width="14" height="14" /> manager.esy.ge
        </Btn>
      </a>
    </div>
  );
}

function Rail({ T, t, active }) {
  return (
    <div style={{
      width: 76, flexShrink: 0, borderRight: `1px solid ${T.border}`,
      background: T.surface, display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '18px 0 16px', gap: 5, minHeight: '100vh',
    }}>
      <span style={{
        width: 40, height: 40, borderRadius: 13, background: T.admin, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}><Icons.shield width="19" height="19" /></span>
      <span style={{ font: `600 8.5px ${T.mono}`, color: T.textMute, marginBottom: 8 }}>admin</span>
      {ANAV.map(([k, icon, route]) => {
        const Ic = Icons[icon];
        const on = k === active;
        return (
          <Link key={k} to={route} style={{
            width: 56, height: 48, borderRadius: 14, textDecoration: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3,
            background: on ? T.adminBg : 'transparent',
            color: on ? T.adminFg : T.textDim,
          }}>
            {Ic && <Ic width="17" height="17" />}
            <span style={{ font: `600 7.5px ${T.font}`, whiteSpace: 'nowrap' }}>
              {t(`nav.${k}`).split(' ')[0]}
            </span>
          </Link>
        );
      })}
      <span style={{ flex: 1 }} />
    </div>
  );
}

function Dock({ T, t, active }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 40, margin: '0 12px 12px',
      height: 64, borderRadius: 20, display: 'flex', alignItems: 'center',
      justifyContent: 'space-around',
      background: T.dark ? 'rgba(18,18,28,0.88)' : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px)', border: `1px solid ${T.border}`, boxShadow: T.shadow,
    }}>
      {ANAV.map(([k, icon, route]) => {
        const Ic = Icons[icon];
        const on = k === active;
        return (
          <Link key={k} to={route} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            textDecoration: 'none', color: on ? T.adminFg : T.textDim,
          }}>
            <span style={{
              width: 36, height: 32, borderRadius: 11, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              background: on ? T.adminBg : 'transparent',
            }}>{Ic && <Ic width="17" height="17" />}</span>
            <span style={{ font: `600 9px ${T.font}` }}>{t(`nav.${k}`).split(' ')[0]}</span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * The permanent scope reminder. It carries the current route on the right,
 * so what is on screen and what it is called are never in doubt — this host
 * is where someone acts on a shop that is not theirs.
 */
function ScopeBand({ T, pad }) {
  const { t } = useTranslation('admin');
  const { pathname } = useLocation();
  return (
    <div style={{
      height: 36, background: T.adminBg, borderBottom: `1px solid ${T.admin}33`,
      display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${pad}px`, flexShrink: 0,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.admin, flexShrink: 0 }} />
      <span style={{
        font: `600 11.5px ${T.font}`, color: T.adminFg, minWidth: 0,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{t('band.allStores')}</span>
      <span style={{ flex: 1 }} />
      <span style={{ font: `500 10px ${T.mono}`, color: T.adminFg, opacity: 0.8, flexShrink: 0 }}>
        admin.esy.ge{pathname}
      </span>
    </div>
  );
}

function managerUrl() {
  const { hostname, port, protocol } = window.location;
  const p = port ? `:${port}` : '';
  const base = hostname.endsWith('lvh.me') ? 'lvh.me'
    : hostname.endsWith('localhost') ? 'localhost' : 'esy.ge';
  return `${protocol}//manager.${base}${p}/`;
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
          <AdminMark T={T} size={19} />
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
          onClick={() => { window.location.href = kind === 'denied' ? managerUrl() : '/signin'; }}
        >
          {kind === 'denied' ? t('gate.backToManager') : t('gate.signIn')}
        </Btn>
      </Card>
    </div>
  );
}

export default function AdminShell() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');
  const { isAuthenticated, loading, user } = useAuth();
  const { isDesktop, isTablet } = useDevice();
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

  const active = activeKey(pathname);
  const pages = (
    <Suspense fallback={<div style={{ padding: 20, color: T.textMute }} />}>
      <Routes>
        <Route path="/" element={<Navigate to="/stores" replace />} />
        <Route path="/stores" element={<AdminStores />} />
        <Route path="/stores/:sub" element={<AdminStoreDetail />} />
        <Route path="/billing" element={<AdminBilling />} />
        <Route path="/integrations" element={<AdminIntegrations />} />
        <Route path="/config" element={<AdminConfig />} />
        <Route path="/admins" element={<AdminAdmins />} />
        <Route path="*" element={<Navigate to="/stores" replace />} />
      </Routes>
    </Suspense>
  );

  const frame = { minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` };

  if (isDesktop || isTablet) {
    return (
      <div style={frame}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {isDesktop
            ? <Side T={T} t={t} active={active} email={user?.email} />
            : <Rail T={T} t={t} active={active} />}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <ScopeBand T={T} pad={isDesktop ? 30 : 20} />
            <div style={{ padding: isDesktop ? '24px 30px 34px' : '20px 20px 28px' }}>{pages}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...frame, display: 'flex', flexDirection: 'column' }}>
      <ScopeBand T={T} pad={16} />
      <div style={{ flex: 1, padding: '14px 16px 20px' }}>{pages}</div>
      <Dock T={T} t={t} active={active} />
    </div>
  );
}
