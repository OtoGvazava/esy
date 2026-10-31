// The back office (manager.esy.ge). One host serves every store the account
// may manage; the selected store rides the URL as ?tenant=<sub> and the API
// client appends it to every /api call (see utils/api.js withManagerTenant).
//
// Store switching does a full page load on purpose: /api/auth/user's
// canManageStore is computed against the ?tenant= selection, and AuthContext
// fetches it once per load — a soft route change would keep the previous
// store's permission snapshot.
//
// This host is store scope ONLY: products, orders and settings, gated per
// store by OWNER/MANAGER membership. Platform administration moved out to
// admin.esy.ge (D6) and the back office deliberately has no entry point into
// it — no tab, no route, no link.
//
// The chrome changes shape with the width, not the content, exactly as the
// design specifies: a 252px sidebar on desktop, a 76px icon rail on tablet,
// and a store header plus a five-item dock on a phone. Unlike the design's
// three fixed artboards, the shape here is chosen at runtime from the actual
// viewport.
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { tenantApi } from '../utils/api';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { Btn, Chip } from '../core/primitives';
import { EsyMark, Mark, RoleChip } from '../core/domain';
import { Icons } from '../core/icons';
import { MNAV, MDOCK, MMORE, OWNER_ONLY } from './nav';
import ManagerHome, { ManagerCallback } from './ManagerHome';
import ManagerOverview from './ManagerOverview';
import ManagerProducts from './ManagerProducts';
import ManagerSettings from './ManagerSettings';
import ManagerTeam from './ManagerTeam';
import ManagerStats from './ManagerStats';
import ManagerMoney from './ManagerMoney';
import ManagerOrders from './ManagerOrders';
import ManagerOrderDetail from './ManagerOrderDetail';

function storeUrlFor(sub) {
  const { hostname, port, protocol } = window.location;
  const p = port ? `:${port}` : '';
  const base = hostname.endsWith('lvh.me') ? 'lvh.me'
    : hostname.endsWith('localhost') ? 'localhost' : 'esy.ge';
  return `${protocol}//${sub}.${base}${p}/`;
}

/** Which nav entry the current path belongs to. */
function activeKey(pathname) {
  const hit = MNAV.filter(([, , route]) => route !== '/')
    .find(([, , route]) => pathname.startsWith(route));
  return hit ? hit[0] : 'overview';
}

function NavItem({ T, to, label, icon, on, locked, badge, style = {} }) {
  const { t } = useTranslation('manager');
  const Ic = Icons[icon];
  const body = (
    <>
      {Ic && <Ic width="16" height="16" />}
      <span style={{ flex: 1 }}>{label}</span>
      {badge ? <Chip T={T} tone="accent" style={{ padding: '2px 8px', font: `700 11px ${T.font}` }}>{badge}</Chip> : null}
      {locked && <span style={{ font: `600 11px ${T.font}` }}>{t('role.OWNER')}</span>}
    </>
  );
  const css = {
    display: 'flex', alignItems: 'center', gap: 11, height: 44, padding: '0 12px',
    borderRadius: 12, textDecoration: 'none',
    background: on ? T.accentBg : 'transparent',
    color: locked ? T.textMute : on ? T.accentFg : T.textDim,
    font: `${on ? 700 : 500} 13.5px ${T.font}`,
    opacity: locked ? 0.55 : 1,
    cursor: locked ? 'not-allowed' : 'pointer',
    ...style,
  };
  // A locked entry is shown but inert: it tells a manager the capability
  // exists without offering a screen the API would refuse.
  if (locked) return <div style={css} aria-disabled="true">{body}</div>;
  return <Link to={to} style={css}>{body}</Link>;
}

function Side({ T, t, store, sub, active, role, q, isOwner, newOrders }) {
  return (
    <div style={{
      width: 252, flexShrink: 0, borderRight: `1px solid ${T.border}`,
      background: T.surface, display: 'flex', flexDirection: 'column',
      padding: '20px 14px 16px', minHeight: '100vh',
    }}>
      <div style={{ padding: '0 8px' }}><EsyMark T={T} size={17} /></div>
      <div style={{
        padding: '0 8px', marginTop: 2, font: `500 12px ${T.font}`,
        color: T.textMute, letterSpacing: '0.06em',
      }}>manager.esy.ge</div>

      {/* Full load on purpose — clears ?tenant AND refreshes the permission
          snapshot the whole app is rendered against. */}
      <a href="/" style={{
        margin: '14px 0 6px', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 13, textDecoration: 'none',
        border: `1px solid ${T.border}`, background: T.bg,
      }}>
        <Mark T={T} store={store} size={32} radius={10} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', font: `700 12.5px ${T.font}`, color: T.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{store.name}</span>
          <span style={{ display: 'block', font: `500 12px ${T.font}`, color: T.textMute }}>
            {sub}.esy.ge
          </span>
        </span>
        <span style={{ color: T.textMute, flexShrink: 0, display: 'inline-flex' }}><Icons.swap /></span>
      </a>

      <div style={{ margin: '6px 4px 14px' }}>
        <RoleChip T={T} role={role} label={t(`role.${role}`, { defaultValue: role })} />
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {MNAV.map(([k, icon, route]) => (
          <NavItem
            key={k} T={T} to={`${route}${q}`} icon={icon}
            label={t(`nav.${k}`)} on={k === active}
            locked={OWNER_ONLY.includes(k) && !isOwner}
            // New orders are the one thing a merchant opens the back office
            // for, so the count rides the nav rather than waiting on the page.
            badge={k === 'orders' && newOrders ? newOrders : null}
          />
        ))}
      </nav>

      <span style={{ flex: 1 }} />
      <a href={storeUrlFor(sub)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
        <Btn T={T} kind="ghost" size="sm" full><Icons.eye width="14" height="14" /> {t('nav.viewStore')}</Btn>
      </a>
    </div>
  );
}

function Rail({ T, t, store, sub, active, q, isOwner }) {
  return (
    <div style={{
      width: 76, flexShrink: 0, borderRight: `1px solid ${T.border}`,
      background: T.surface, display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '18px 0 16px', gap: 5, minHeight: '100vh',
    }}>
      <span title={sub} style={{ marginBottom: 10, display: 'inline-flex' }}>
        <Mark T={T} store={store} size={40} radius={13} />
      </span>
      {/* Icons only, named for assistive tech and on hover: the labels that
          used to sit under them were 7.5px, unreadable in Georgian. */}
      {MNAV.map(([k, icon, route]) => {
        const Ic = Icons[icon];
        const locked = OWNER_ONLY.includes(k) && !isOwner;
        const on = k === active;
        const label = t(`nav.${k}`);
        const css = {
          width: 56, height: 52, borderRadius: 14, textDecoration: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: on ? T.accentBg : 'transparent',
          color: on ? T.accentFg : T.textDim,
          opacity: locked ? 0.45 : 1,
        };
        const inner = Ic && <Ic width="20" height="20" />;
        return locked
          ? <div key={k} style={css} aria-disabled="true" aria-label={label} title={label}>{inner}</div>
          : <Link key={k} to={`${route}${q}`} style={css} aria-label={label} title={label} aria-current={on ? 'page' : undefined}>{inner}</Link>;
      })}
      <span style={{ flex: 1 }} />
    </div>
  );
}

/** Behind the tab bar's "More" slot: the destinations a phone has no room for. */
function MoreSheet({ T, t, active, q, isOwner, onClose }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={t('nav.more')} style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, background: T.surface,
        borderRadius: '24px 24px 0 0', padding: '10px 16px 24px', boxShadow: T.shadow,
      }}>
        <div style={{ width: 36, height: 5, borderRadius: 3, background: T.border, margin: '0 auto 8px' }} />
        {MMORE.map((k) => {
          const entry = MNAV.find((n) => n[0] === k);
          if (!entry) return null;
          const [, icon, route] = entry;
          const Ic = Icons[icon];
          const locked = OWNER_ONLY.includes(k) && !isOwner;
          const on = k === active;
          const css = {
            display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '0 6px',
            textDecoration: 'none', color: on ? T.accentFg : T.text,
            borderBottom: `1px solid ${T.border}`, opacity: locked ? 0.5 : 1,
            font: `${on ? 600 : 500} 15px ${T.font}`,
          };
          const inner = (
            <>
              {Ic && <Ic width="20" height="20" />}
              <span style={{ flex: 1 }}>{t(`nav.${k}`)}</span>
              {locked
                ? <span style={{ font: `500 12px ${T.font}`, color: T.textMute }}>{t('role.OWNER')}</span>
                : <Icons.arrowR width="16" height="16" />}
            </>
          );
          return locked
            ? <div key={k} style={css} aria-disabled="true">{inner}</div>
            : <Link key={k} to={`${route}${q}`} style={css} onClick={onClose} aria-current={on ? 'page' : undefined}>{inner}</Link>;
        })}
      </div>
    </div>
  );
}

function Dock({ T, t, active, q, isOwner, newOrders }) {
  const [more, setMore] = useState(false);
  // Four equal slots with a label under every icon; the active one is told
  // apart by its tint alone, as the design draws it.
  const slot = (on) => ({
    position: 'relative', minWidth: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 3, padding: 0,
    textDecoration: 'none', background: 'none', border: 0, cursor: 'pointer',
    color: on ? T.accentFg : T.textDim, font: `${on ? 600 : 500} 11px/13px ${T.font}`,
    whiteSpace: 'nowrap',
  });
  return (
    <>
      {more && <MoreSheet T={T} t={t} active={active} q={q} isOwner={isOwner} onClose={() => setMore(false)} />}
      <nav aria-label={t('title')} style={{
        position: 'sticky', bottom: 0, zIndex: 40, margin: '0 12px 12px',
        height: 66, borderRadius: 22, display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', padding: '0 4px',
        background: T.dark ? 'rgba(18,18,28,0.88)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)', border: `1px solid ${T.border}`,
        boxShadow: T.shadow,
      }}>
        {MDOCK.map((k) => {
          const entry = MNAV.find((n) => n[0] === k);
          if (!entry) return null;
          const [, icon, route] = entry;
          const Ic = Icons[icon];
          const on = k === active;
          return (
            <Link key={k} to={`${route}${q}`} style={slot(on)} aria-current={on ? 'page' : undefined}>
              {Ic && <Ic width="22" height="22" />}
              {t(`nav.${k}`)}
              {k === 'orders' && newOrders > 0 && (
                <span style={{
                  position: 'absolute', top: 6, left: 'calc(50% + 6px)', minWidth: 18, height: 18,
                  padding: '0 5px', borderRadius: 9, background: T.accent, color: T.onAccent,
                  font: `700 11px/18px ${T.font}`, textAlign: 'center',
                }}>{newOrders}</span>
              )}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} style={slot(more || MMORE.includes(active))}>
          <Icons.more width="22" height="22" />
          {t('nav.more')}
        </button>
      </nav>
    </>
  );
}

/** Page heading. Ported from the design's MTop. */
export function MTop({ T, title, sub, right, mode }) {
  const mob = mode === 'mobile';
  return (
    <div style={{
      display: 'flex', alignItems: mob ? 'flex-start' : 'flex-end',
      flexDirection: mob ? 'column' : 'row', gap: mob ? 12 : 16,
      marginBottom: mob ? 14 : 20, flexWrap: 'wrap',
    }}>
      <div>
        <div style={{
          font: `700 ${mode === 'desktop' ? 27 : mode === 'tablet' ? 23 : 21}px ${T.font}`,
          color: T.text, letterSpacing: '-0.03em',
        }}>{title}</div>
        {sub && (
          <div style={{ marginTop: 5, font: `400 ${mob ? 12.5 : 13}px/1.5 ${T.font}`, color: T.textDim }}>
            {sub}
          </div>
        )}
      </div>
      {!mob && <span style={{ flex: 1 }} />}
      {right}
    </div>
  );
}

export default function ManagerShell() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const { user, isStoreOwner, canManageStore, isAuthenticated, loading: authLoading } = useAuth();
  // Unread orders, for the sidebar badge. Failure is silent: a missing count
  // should cost the merchant a badge, never the whole back office.
  const [newOrders, setNewOrders] = useState(0);
  const { isDesktop, isTablet } = useDevice();
  const [params] = useSearchParams();
  const { pathname } = useLocation();

  const sub = params.get('tenant');
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';
  useEffect(() => {
    if (!sub || !canManageStore) return undefined;
    const ac = new AbortController();
    tenantApi.newOrderCount(sub, { signal: ac.signal })
      .then((n) => { if (!ac.signal.aborted) setNewOrders(Number(n?.count ?? n ?? 0) || 0); })
      .catch(() => {});
    return () => ac.abort();
  }, [sub, canManageStore]);

  const active = activeKey(pathname);
  const role = isStoreOwner ? 'OWNER' : 'MANAGER';
  const store = { name: sub || t('title'), accent: T.accent };

  // The OAuth round-trip lands here before any chrome renders, and goes back
  // to the page the sign-in started from.
  if (pathname.startsWith('/auth/callback')) return <ManagerCallback />;

  // Restoring the session: draw nothing rather than flash the sign-in.
  if (authLoading) return <div style={{ minHeight: '100vh', background: T.bg }} />;

  // M0, the front door: signed out, no store chosen yet, or a store this
  // account does not run. It signs in or picks a store; the chrome that exists
  // to move around inside a store would have nothing to point at, and its
  // pages would only collect 403s from the API.
  if (!isAuthenticated || !sub || !canManageStore) return <ManagerHome />;

  // Signed in already: the old sign-in path leads to the store's first screen.
  if (pathname.startsWith('/signin')) return <Navigate to={`/${q}`} replace />;

  const pages = (
    <Routes>
      <Route path="/" element={<ManagerOverview />} />
      <Route path="/products" element={<ManagerProducts />} />
      <Route path="/orders" element={<ManagerOrders />} />
      <Route path="/orders/:orderId" element={<ManagerOrderDetail />} />
      <Route path="/stats" element={<ManagerStats />} />
      <Route path="/money" element={<ManagerMoney />} />
      <Route path="/team" element={<ManagerTeam />} />
      <Route path="/settings/*" element={<ManagerSettings />} />
      <Route path="*" element={<Navigate to={`/${q}`} replace />} />
    </Routes>
  );

  if (isDesktop || isTablet) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {isDesktop
            ? <Side T={T} t={t} store={store} sub={sub} active={active} role={role} q={q} isOwner={isStoreOwner} newOrders={newOrders} />
            : <Rail T={T} t={t} store={store} sub={sub} active={active} q={q} isOwner={isStoreOwner} />}
          <div style={{ flex: 1, minWidth: 0, padding: isDesktop ? '26px 30px 34px' : '20px 20px 28px' }}>
            {pages}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.text,
      font: `400 14px ${T.font}`, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Mark T={T} store={store} size={34} radius={11} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'block', font: `700 14px ${T.font}`, color: T.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{store.name}</span>
          <span style={{ display: 'block', font: `500 12px ${T.font}`, color: T.textMute }}>
            {sub}.esy.ge
          </span>
        </span>
        {user?.email && (
          <a href="/" style={{ color: T.textMute, display: 'inline-flex' }} aria-label={t('nav.switchStore')}>
            <Icons.swap />
          </a>
        )}
      </div>
      <div style={{ flex: 1, padding: '0 16px 20px' }}>{pages}</div>
      <Dock T={T} t={t} active={active} q={q} isOwner={isStoreOwner} newOrders={newOrders} />
    </div>
  );
}
