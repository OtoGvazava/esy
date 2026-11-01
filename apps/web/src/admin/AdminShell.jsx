// admin.esy.ge — platform administration (D6).
//
// Its own host, deliberately not a scope inside the back office: a support
// account can be given this address without being handed the merchant back
// office, and the teal chrome with its "admin" badge makes it impossible to
// mistake an admin action for a merchant one.
//
// Every screen here reads ONLY the /api/admin/** namespace, and the backend
// ignores ?tenant on this host — administration is cross-store and names its
// target explicitly.
//
// The chrome is the design's Shell in its admin form, in the same three shapes
// as the back office: a 256px sidebar on a desktop, an 84px icon rail on a
// tablet, and on a phone a top bar with a four-slot tab bar whose last slot,
// "more", holds the admins and the messages screens (Georgian labels are too
// wide for five). The page's title sits in the top bar; each screen supplies
// it through useAdminHead().
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import SignIn from '../pages/SignIn';
import AuthCallback from '../pages/AuthCallback';
import { managerUrl, platformUrl } from '../utils/hosts';
import { useAdminTokens } from './adminTokens';
import { AdminHeadContext } from './adminHead';
import AdminGate from './AdminGate';
import AdminStores from './AdminStores';
import AdminStoreDetail from './AdminStoreDetail';
import AdminBilling from './AdminBilling';
import AdminAdmins from './AdminAdmins';
import { Dialog, EsyLogo, Glyph, KitChip, List } from './AdminKit';

const AdminConfig = lazy(() => import('./AdminConfig'));
const AdminIntegrations = lazy(() => import('./AdminIntegrations'));

/** [key, icon, route] — the order the sidebar shows them in. */
const ANAV = [
  ['stores', 'store', '/stores'],
  ['billing', 'receipt', '/billing'],
  ['admins', 'shieldCheck', '/admins'],
  ['config', 'gear', '/config'],
  ['messages', 'mail', '/integrations'],
];
/** The phone's tab bar: three screens, then "more" for the rest. */
const DOCK = ['stores', 'billing', 'config'];
const MORE = ['admins', 'messages'];
const NAV = Object.fromEntries(ANAV.map(([k, icon, route]) => [k, { icon, route }]));

function activeKey(pathname) {
  const hit = ANAV.find(([, , route]) => pathname.startsWith(route));
  return hit ? hit[0] : 'stores';
}

// Latin letters only: toUpperCase() would turn Georgian into Mtavruli capitals.
const latinUpper = (s) => String(s).replace(/[a-z]/g, (c) => c.toUpperCase());
const nameOf = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
function initialsOf(user) {
  const parts = nameOf(user).split(/\s+/).filter(Boolean);
  if (parts.length) return latinUpper(parts.slice(0, 2).map((w) => Array.from(w)[0]).join(''));
  return latinUpper(Array.from(String(user?.email || '?'))[0] || '?');
}

function Avatar({ T, user }) {
  return (
    <span aria-hidden="true" style={{
      width: 34, height: 34, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
      background: 'var(--k-ink)', color: 'var(--k-on-ink)', font: `700 12px ${T.font}`, letterSpacing: '0.02em',
      boxShadow: T.dark ? '0 0 0 1px rgba(255,255,255,.16)' : 'none',
    }}>
      {initialsOf(user)}
    </span>
  );
}

/**
 * Who is signed in, and the two ways out: the back office, and signing out.
 * `row` is the sidebar's full row; otherwise the avatar alone opens it.
 */
function UserMenu({ T, t, user, row, place }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const name = nameOf(user) || user?.email;
  const item = {
    display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, padding: '0 12px', borderRadius: 10,
    color: T.text, textDecoration: 'none', font: `500 14px ${T.font}`, border: 0, background: 'transparent',
    width: '100%', textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box',
  };
  return (
    <div style={{ position: 'relative', ...(row ? { borderTop: `1px solid ${T.border}`, padding: '12px 0 0' } : null) }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={row ? undefined : t('shell.account', { name })}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent', cursor: 'pointer',
          color: T.text, padding: row ? '0 8px' : 0, width: row ? '100%' : undefined, textAlign: 'left', minHeight: 44,
        }}
      >
        <Avatar T={T} user={user} />
        {row && (
          <>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <b style={{ font: `700 13.5px/1.2 ${T.font}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</b>
              <span style={{ font: `400 12px/1.3 ${T.font}`, color: T.textDim }}>{t('shell.role')}</span>
            </span>
            <Glyph name="chevD" size={16} style={{ color: T.textDim }} />
          </>
        )}
      </button>
      {open && (
        <>
          <div aria-hidden="true" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 70 }} />
          <div role="menu" style={{
            position: 'absolute', zIndex: 71, minWidth: 230, padding: 6, boxSizing: 'border-box',
            background: T.surface, border: 'var(--k-fl-bd)', borderRadius: 14,
            boxShadow: '0 18px 40px -16px rgba(0,0,0,0.35)', ...place,
          }}>
            {!row && (
              <div style={{ padding: '8px 12px 10px', borderBottom: `1px solid ${T.border}`, marginBottom: 4 }}>
                <b style={{ display: 'block', font: `700 13px ${T.font}` }}>{name}</b>
                <span style={{ font: `400 12px ${T.font}`, color: T.textDim }}>{user?.email}</span>
              </div>
            )}
            <a role="menuitem" href={managerUrl('/')} style={item}>
              <Glyph name="manager" size={18} />{t('shell.toManager')}
            </a>
            <button role="menuitem" type="button" onClick={() => { setOpen(false); logout(); }} style={{ ...item, color: 'var(--k-bad)' }}>
              <Glyph name="logout" size={18} />{t('shell.signOut')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Side({ T, t, active, user }) {
  return (
    <nav aria-label={t('shell.navLabel')} style={{
      width: 256, flex: 'none', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box',
      background: T.surface, borderRight: `1px solid ${T.border}`, padding: '18px 14px',
      display: 'flex', flexDirection: 'column', gap: 3, zIndex: 3,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 16px', marginBottom: 6,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <EsyLogo T={T} size={28} font={19} />
        <KitChip T={T} tone="brand" style={{ marginLeft: 'auto' }}>{t('gate.badge')}</KitChip>
      </div>
      {ANAV.map(([k, icon, route]) => {
        const on = k === active;
        return (
          <Link
            key={k}
            to={route}
            aria-current={on ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, minHeight: 42, padding: '0 12px', borderRadius: 10,
              textDecoration: 'none', font: `${on ? 600 : 500} 14px ${T.font}`,
              color: on ? 'var(--k-acc)' : T.textDim,
              background: on ? `color-mix(in oklab, ${T.accent} 12%, transparent)` : 'transparent',
            }}
          >
            <Glyph name={icon} />
            {t(`nav.${k}`)}
          </Link>
        );
      })}
      <span style={{ flex: 1 }} />
      <UserMenu T={T} t={t} user={user} row place={{ left: 0, right: 0, bottom: 'calc(100% + 6px)' }} />
    </nav>
  );
}

function Rail({ T, t, active, user }) {
  return (
    <nav aria-label={t('shell.navLabel')} style={{
      width: 84, flex: 'none', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box',
      background: T.surface, borderRight: `1px solid ${T.border}`, padding: '20px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 3,
    }}>
      <Link to="/stores" aria-label={t('shell.home')} style={{ marginBottom: 10, display: 'inline-flex' }}>
        <EsyLogo T={T} size={34} font={0} />
      </Link>
      {ANAV.map(([k, icon, route]) => {
        const on = k === active;
        return (
          <Link
            key={k}
            to={route}
            aria-label={t(`nav.${k}`)}
            aria-current={on ? 'page' : undefined}
            title={t(`nav.${k}`)}
            style={{
              width: 56, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', textDecoration: 'none',
              color: on ? T.text : T.textDim, background: on ? T.surface2 : 'transparent',
            }}
          >
            <Glyph name={icon} />
          </Link>
        );
      })}
      <span style={{ flex: 1 }} />
      <UserMenu T={T} t={t} user={user} place={{ left: 'calc(100% + 8px)', bottom: 0 }} />
    </nav>
  );
}

/** The phone tab bar: four equal slots, the label under every icon. */
function Dock({ T, t, active, onMore, moreOn }) {
  const slot = (on) => ({
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0,
    padding: '7px 2px 6px', borderRadius: 14, font: `${on ? 600 : 400} 11px/13px ${T.font}`, whiteSpace: 'nowrap',
    color: on ? 'var(--k-acc)' : T.textDim, textDecoration: 'none', border: 0, background: 'transparent', cursor: 'pointer',
  });
  return (
    <nav aria-label={t('shell.navLabel')} style={{
      position: 'fixed', zIndex: 40, left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      borderRadius: 'var(--k-r-dock)', display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', padding: '6px 4px',
      background: 'var(--k-fl-bg)', border: 'var(--k-fl-bd)', boxShadow: 'var(--k-fl-sh)',
    }}>
      {DOCK.map((k) => {
        const on = k === active;
        return (
          <Link key={k} to={NAV[k].route} aria-current={on ? 'page' : undefined} style={slot(on)}>
            <Glyph name={NAV[k].icon} />
            <span>{t(`nav.${k}`)}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onMore} aria-haspopup="dialog" aria-current={moreOn ? 'page' : undefined} style={slot(moreOn)}>
        <Glyph name="more" />
        <span>{t('nav.more')}</span>
      </button>
    </nav>
  );
}

function TopBar({ T, t, head, desk, tab, ph, user }) {
  const pad = desk ? 32 : tab ? 24 : 16;
  const sub = ph ? (head.phoneSub ?? t('shell.host')) : head.sub;
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 20, height: ph ? 62 : 72, boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', gap: 12, padding: `0 ${pad}px`,
      borderBottom: `1px solid ${T.border}`, background: 'var(--k-hd-bg)',
    }}>
      {head.back && (
        <Link
          to={head.back}
          aria-label={t('shell.back')}
          style={{
            width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', flex: 'none',
            background: T.surface2, color: T.text,
          }}
        >
          <Glyph name="back" />
        </Link>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          margin: 0, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          font: `700 20px/1.22 ${T.font}`, letterSpacing: '-0.015em', color: T.text,
        }}>
          {head.title || ' '}
        </h1>
        {sub && (
          <span style={{
            display: 'block', font: `400 12.5px/1.45 ${T.font}`, color: T.textDim,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {sub}
          </span>
        )}
      </div>
      {desk && (
        <a
          href={platformUrl('/')}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 15px', borderRadius: 12,
            boxShadow: `inset 0 0 0 1.5px ${T.border}`, color: T.text, textDecoration: 'none', flex: 'none',
            font: `600 13.5px/1 ${T.font}`, whiteSpace: 'nowrap',
          }}
        >
          <Glyph name="external" />
          {t('shell.platform')}
        </a>
      )}
      {ph && <UserMenu T={T} t={t} user={user} place={{ right: 0, top: 'calc(100% + 6px)' }} />}
    </header>
  );
}

export default function AdminShell() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');
  const { isAuthenticated, loading, user } = useAuth();
  const { isDesktop, isTablet } = useDevice();
  const { pathname } = useLocation();
  const [head, setHeadState] = useState({});
  const [more, setMore] = useState(false);
  const setHead = useCallback((h) => setHeadState(h || {}), []);

  useEffect(() => { setMore(false); }, [pathname]);

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
  // The design's AD0: sign in, or "this account is not an administrator".
  if (!isAuthenticated) return <AdminGate T={T} kind="signin" />;
  if (user?.role !== 'admin') return <AdminGate T={T} kind="denied" />;

  const active = activeKey(pathname);
  const desk = !!isDesktop;
  const tab = !desk && !!isTablet;
  const ph = !desk && !tab;
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

  return (
    <AdminHeadContext.Provider value={setHead}>
      <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}`, display: 'flex', alignItems: 'stretch' }}>
        {desk && <Side T={T} t={t} active={active} user={user} />}
        {tab && <Rail T={T} t={t} active={active} user={user} />}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <TopBar T={T} t={t} head={head} desk={desk} tab={tab} ph={ph} user={user} />
          <main style={{ flex: 1, padding: desk ? '28px 32px 32px' : tab ? 24 : '16px 16px 104px', minWidth: 0 }}>
            {pages}
          </main>
        </div>
      </div>
      {ph && <Dock T={T} t={t} active={active} moreOn={MORE.includes(active)} onMore={() => setMore(true)} />}
      {ph && more && (
        <Dialog T={T} phone title={t('nav.more')} onClose={() => setMore(false)}>
          <List T={T}>
            {MORE.map((k, i) => (
              <Link
                key={k}
                to={NAV[k].route}
                onClick={() => setMore(false)}
                aria-current={k === active ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56, boxSizing: 'border-box',
                  borderTop: i ? `1px solid ${T.border}` : 'none', color: T.text, textDecoration: 'none',
                  background: k === active ? `color-mix(in oklab, ${T.accent} 7%, ${T.surface})` : 'transparent',
                }}
              >
                <span style={{ width: 34, height: 34, borderRadius: 12, background: T.surface2, display: 'grid', placeItems: 'center', flex: 'none' }}>
                  <Glyph name={NAV[k].icon} size={18} />
                </span>
                <span style={{ flex: 1, font: `600 14px ${T.font}` }}>{t(`nav.${k}`)}</span>
                <Glyph name="chevR" size={16} style={{ color: T.textDim }} />
              </Link>
            ))}
          </List>
        </Dialog>
      )}
    </AdminHeadContext.Provider>
  );
}
