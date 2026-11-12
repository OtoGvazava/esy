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
//
// This is the layout route for the screens (router/admin.jsx): they arrive in
// the <Outlet>, each once its route loader has its data. The menus mark the
// place being opened the moment it is tapped, with one marker that slides
// from entry to entry (core/useIndicator.js), while the router is still
// fetching the next screen.
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { usePendingLocation, useIndicator } from '../core/useIndicator';
import { platformUrl } from '../utils/hosts';
import { useAdminTokens } from './adminTokens';
import { AdminHeadContext } from './adminHead';
import AdminGate from './AdminGate';
import AccountMenu from '../components/account/AccountMenu';
import { LazyScreenSkeleton } from './AdminSkeletons';
import { Dialog, EsyLogo, Glyph, KitChip, List } from './AdminKit';

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
  if (pathname.startsWith('/account')) return null;
  const hit = ANAV.find(([, , route]) => pathname.startsWith(route));
  return hit ? hit[0] : 'stores';
}

// A menu entry's colour eases over as the marker slides under it; the press
// keeps its own quick sink (.esy-press), which an inline transition replaces.
const ENTRY_MOTION = 'color var(--m-base) ease, transform var(--m-quick) var(--m-ease)';

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

/** The icon of a menu entry: it gives a small pop when its entry has just been chosen. */
function EntryIcon({ name, popped, size }) {
  return (
    <span className={popped ? 'esy-pop' : undefined} style={{ display: 'inline-flex' }}>
      <Glyph name={name} size={size} />
    </span>
  );
}

/**
 * Who is signed in. `row` is the sidebar's full row; otherwise the avatar
 * alone. It opens the account menu every app shares (U1b): the way to the
 * back office and esy.ge, then the esy account and signing out. A popover
 * above the sidebar's row on a desktop, a sheet below one (`wide` on a tablet).
 */
function UserMenu({ T, t, user, row, sheet, wide }) {
  const name = nameOf(user) || user?.email;
  return (
    <AccountMenu
      app="admin" sheet={sheet} wide={wide} anchor="above"
      wrapStyle={row ? { borderTop: `1px solid ${T.border}`, padding: '12px 0 0' } : undefined}
    >
      {({ triggerProps }) => (
        <button
          type="button"
          {...triggerProps}
          aria-label={row ? undefined : t('shell.account', { name })}
          className={row ? 'esy-press-soft' : 'esy-press'}
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
      )}
    </AccountMenu>
  );
}

function Side({ T, t, active, user }) {
  const box = useRef(null);
  const ind = useIndicator(box, active);
  return (
    <nav ref={box} aria-label={t('shell.navLabel')} style={{
      width: 256, flex: 'none', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box',
      background: T.surface, borderRight: `1px solid ${T.border}`, padding: '18px 14px',
      display: 'flex', flexDirection: 'column', gap: 3, zIndex: 3,
      viewTransitionName: 'esy-side',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 16px', marginBottom: 6,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <EsyLogo T={T} size={28} font={19} />
        <KitChip T={T} tone="brand" style={{ marginLeft: 'auto' }}>{t('gate.badge')}</KitChip>
      </div>
      {/* The current entry's tint, under the entries, sliding to the one chosen. */}
      <span aria-hidden="true" className="esy-ind" data-still={ind.still || undefined} style={{
        ...ind.style, borderRadius: 10, background: `color-mix(in oklab, ${T.accent} 12%, transparent)`,
      }} />
      {ANAV.map(([k, icon, route]) => {
        const on = k === active;
        return (
          <Link
            key={k}
            to={route}
            data-ind={k}
            aria-current={on ? 'page' : undefined}
            className="esy-press-soft"
            style={{
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', gap: 12, minHeight: 42, padding: '0 12px', borderRadius: 10,
              textDecoration: 'none', font: `${on ? 600 : 500} 14px ${T.font}`,
              color: on ? 'var(--k-acc)' : T.textDim, transition: ENTRY_MOTION,
            }}
          >
            <EntryIcon name={icon} popped={ind.popped === k} />
            {t(`nav.${k}`)}
          </Link>
        );
      })}
      <span style={{ flex: 1 }} />
      <UserMenu T={T} t={t} user={user} row />
    </nav>
  );
}

function Rail({ T, t, active, user }) {
  const box = useRef(null);
  const ind = useIndicator(box, active);
  return (
    <nav ref={box} aria-label={t('shell.navLabel')} style={{
      width: 84, flex: 'none', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box',
      background: T.surface, borderRight: `1px solid ${T.border}`, padding: '20px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 3,
      viewTransitionName: 'esy-side',
    }}>
      <Link to="/stores" aria-label={t('shell.home')} style={{ marginBottom: 10, display: 'inline-flex' }}>
        <EsyLogo T={T} size={34} font={0} />
      </Link>
      <span aria-hidden="true" className="esy-ind" data-still={ind.still || undefined} style={{
        ...ind.style, borderRadius: 14, background: T.surface2,
      }} />
      {ANAV.map(([k, icon, route]) => {
        const on = k === active;
        return (
          <Link
            key={k}
            to={route}
            data-ind={k}
            aria-label={t(`nav.${k}`)}
            aria-current={on ? 'page' : undefined}
            title={t(`nav.${k}`)}
            className="esy-press"
            style={{
              position: 'relative', zIndex: 1,
              width: 56, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', textDecoration: 'none',
              color: on ? T.text : T.textDim, transition: ENTRY_MOTION,
            }}
          >
            <EntryIcon name={icon} popped={ind.popped === k} />
          </Link>
        );
      })}
      <span style={{ flex: 1 }} />
      <UserMenu T={T} t={t} user={user} sheet wide />
    </nav>
  );
}

/** The phone tab bar: four equal slots, the label under every icon. */
function Dock({ T, t, active, onMore, moreOn }) {
  const box = useRef(null);
  // "More" stands for the two screens it holds.
  const ind = useIndicator(box, moreOn ? 'more' : active);
  const slot = (on) => ({
    position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0,
    padding: '7px 2px 6px', borderRadius: 14, font: `${on ? 600 : 400} 11px/13px ${T.font}`, whiteSpace: 'nowrap',
    color: on ? 'var(--k-acc)' : T.textDim, textDecoration: 'none', border: 0, background: 'transparent', cursor: 'pointer',
    transition: ENTRY_MOTION,
  });
  return (
    <nav ref={box} aria-label={t('shell.navLabel')} style={{
      position: 'fixed', zIndex: 40, left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      borderRadius: 'var(--k-r-dock)', display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', padding: '6px 4px',
      background: 'var(--k-fl-bg)', border: 'var(--k-fl-bd)', boxShadow: 'var(--k-fl-sh)',
      viewTransitionName: 'esy-mdock',
    }}>
      <span aria-hidden="true" className="esy-ind" data-still={ind.still || undefined} style={{
        ...ind.style, borderRadius: 14, background: `color-mix(in oklab, ${T.accent} 12%, transparent)`,
      }} />
      {DOCK.map((k) => {
        const on = k === active;
        return (
          <Link key={k} to={NAV[k].route} data-ind={k} aria-current={on ? 'page' : undefined} className="esy-press" style={slot(on)}>
            <EntryIcon name={NAV[k].icon} popped={ind.popped === k} />
            <span>{t(`nav.${k}`)}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        data-ind="more"
        aria-haspopup="dialog"
        aria-current={moreOn ? 'page' : undefined}
        className="esy-press"
        style={slot(moreOn)}
      >
        <EntryIcon name="more" popped={ind.popped === 'more'} />
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
      // The bar stays put across a page change; only what it says cross-fades.
      viewTransitionName: 'esy-topbar',
    }}>
      {head.back && (
        <Link
          to={head.back}
          aria-label={t('shell.back')}
          className="esy-press"
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
      {ph && <UserMenu T={T} t={t} user={user} sheet />}
    </header>
  );
}

export default function AdminShell() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');
  const { isAuthenticated, loading, user } = useAuth();
  const { isDesktop, isTablet } = useDevice();
  const { pathname } = useLocation();
  // Where the app is going: the menus answer a tap before the next screen is in.
  const going = usePendingLocation().pathname;
  const [head, setHeadState] = useState({});
  const [more, setMore] = useState(false);
  const setHead = useCallback((h) => setHeadState(h || {}), []);

  useEffect(() => { setMore(false); }, [pathname]);

  // Sign-in and its callback are routes of their own beside this one
  // (router/admin.jsx), so the OAuth round-trip completes before any gate.
  if (loading) {
    return <div style={{ minHeight: '100vh', background: T.bg }} />;
  }
  // The design's AD0: sign in, or "this account is not an administrator".
  if (!isAuthenticated) return <AdminGate T={T} kind="signin" />;
  if (user?.role !== 'admin') return <AdminGate T={T} kind="denied" />;

  const active = activeKey(going);
  const desk = !!isDesktop;
  const tab = !desk && !!isTablet;
  const ph = !desk && !tab;

  return (
    <AdminHeadContext.Provider value={setHead}>
      <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}`, display: 'flex', alignItems: 'stretch' }}>
        {desk && <Side T={T} t={t} active={active} user={user} />}
        {tab && <Rail T={T} t={t} active={active} user={user} />}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <TopBar T={T} t={t} head={head} desk={desk} tab={tab} ph={ph} user={user} />
          <main style={{ flex: 1, padding: desk ? '28px 32px 32px' : tab ? 24 : '16px 16px 104px', minWidth: 0 }}>
            {/* Configuration and the messages screen are fetched apart from
                the rest (router/admin.jsx). Moving to one keeps the screen on
                display until it is here; only a first load of the page waits
                on this fallback, drawn in the screen's own shape. */}
            <Suspense fallback={<LazyScreenSkeleton pathname={pathname} />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      {ph && <Dock T={T} t={t} active={active} moreOn={MORE.includes(active)} onMore={() => setMore(true)} />}
      <Dialog T={T} phone open={ph && more} title={t('nav.more')} onClose={() => setMore(false)}>
        <List T={T}>
          {MORE.map((k, i) => (
            <Link
              key={k}
              to={NAV[k].route}
              onClick={() => setMore(false)}
              aria-current={k === active ? 'page' : undefined}
              className="esy-press-soft"
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
    </AdminHeadContext.Provider>
  );
}
