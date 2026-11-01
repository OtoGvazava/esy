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
// The chrome is the design's Shell board, and changes shape with the width:
// a 256px sidebar on desktop (the store at the top, the account at the
// bottom), an 84px icon rail on tablet, and a four-slot tab bar on a phone.
// Each has a header bar across the content; a page's MTop draws its title
// there (a portal into the bar), so every page gets the same header without
// knowing which shape it is in. The board's bell is not drawn: the back
// office has no notifications to show behind it.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, Navigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { tenantApi } from '../utils/api';
import { useTK } from '../core/useTK';
import { Icons } from '../core/icons';
import { MNAV, MDOCK, MMORE, OWNER_ONLY } from './nav';
import { BxIcon, initialsOf, useBx } from './officeBx';
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

// The header bar's slots, filled by the page's MTop. `el` is null for the one
// render before the bar mounts; inside the shell MTop then draws nothing
// rather than flash a title in the page.
const TopSlots = createContext(null);

/** The store's avatar: its logo, or its initials on the store colour. */
function StoreAv({ store, size = 'sm', style }) {
  return (
    <span className={`bx-av ${size}`} style={style} aria-hidden="true">
      {store.logoUrl ? <img src={store.logoUrl} alt="" /> : initialsOf(store.name, store.sub)}
    </span>
  );
}

/** The account under the sidebar (desktop) or in the header (phone), with sign-out. */
function Account({ t, user, roleLabel, variant }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const name = user?.name || user?.email || '';
  const initials = initialsOf(name, user?.email);
  const menu = open && (
    <div className="bx-menu" role="menu" style={variant === 'side'
      ? { left: 0, right: 0, bottom: 'calc(100% + 8px)' }
      : { right: 0, top: 'calc(100% + 8px)' }}
    >
      <a role="menuitem" href="/"><BxIcon name="swap" />{t('nav.switchStore')}</a>
      <button role="menuitem" type="button" onClick={() => { setOpen(false); logout(); }}>
        <BxIcon name="signOut" />{t('nav.signOut')}
      </button>
    </div>
  );
  if (variant === 'side') {
    return (
      <div ref={box} style={{ position: 'relative' }}>
        <button type="button" className="bx-user" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="bx-av sm u" aria-hidden="true">{initials}</span>
          <span className="bx-st-name"><b>{name}</b><span>{roleLabel}</span></span>
          <BxIcon name="chevDs" size="s" className="bx-dim" />
        </button>
        {menu}
      </div>
    );
  }
  return (
    <div ref={box} style={{ position: 'relative', flex: 'none' }}>
      <button
        type="button" className="bx-av sm u" aria-haspopup="menu" aria-expanded={open}
        aria-label={name} onClick={() => setOpen((v) => !v)} style={{ border: 0, cursor: 'pointer', padding: 0 }}
      >{initials}</button>
      {menu}
    </div>
  );
}

function Side({ t, store, user, roleLabel, active, q, isOwner, newOrders }) {
  return (
    <nav className="bx-side" aria-label={t('shell.nav')}>
      {/* A full load on purpose: back to the store picker, which clears ?tenant
          and refreshes the permission snapshot the app is rendered against. */}
      <a href="/" className="bx-store" title={t('nav.switchStore')}>
        <StoreAv store={store} />
        <span className="bx-st-name"><b>{store.name}</b><span>{`${store.sub}.esy.ge`}</span></span>
        <BxIcon name="chevD" size="s" className="bx-dim" />
      </a>
      {MNAV.map(([k, , route]) => {
        const locked = OWNER_ONLY.includes(k) && !isOwner;
        const label = t(`nav.${k}`);
        const body = (
          <>
            <BxIcon name={k} />
            <span className="bx-grow">{label}</span>
            {/* New orders are the one thing a merchant opens the back office
                for, so the count rides the nav rather than waiting on the page. */}
            {k === 'orders' && newOrders > 0 && <span className="bx-badge-n">{newOrders}</span>}
            {locked && <BxIcon name="lock" size="s" label={t('shell.ownerOnly')} />}
          </>
        );
        // A locked entry is shown but inert: it tells a manager the capability
        // exists without offering a screen the API would refuse.
        return locked
          ? <div key={k} className="bx-nav lock" aria-disabled="true">{body}</div>
          : <Link key={k} to={`${route}${q}`} className={`bx-nav${k === active ? ' on' : ''}`} aria-current={k === active ? 'page' : undefined}>{body}</Link>;
      })}
      <span style={{ flex: 1 }} />
      <Account t={t} user={user} roleLabel={roleLabel} variant="side" />
    </nav>
  );
}

function Rail({ t, store, user, active, q, isOwner, newOrders }) {
  const name = user?.name || user?.email || '';
  return (
    <nav className="bx-rail" aria-label={t('shell.nav')}>
      <a href="/" title={t('nav.switchStore')} aria-label={`${store.name} · ${t('nav.switchStore')}`} style={{ marginBottom: 10, display: 'inline-flex', textDecoration: 'none' }}>
        <StoreAv store={store} />
      </a>
      {/* Icons only, named for assistive tech and on hover. */}
      {MNAV.map(([k, , route]) => {
        const locked = OWNER_ONLY.includes(k) && !isOwner;
        const on = k === active;
        const label = t(`nav.${k}`);
        const inner = (
          <>
            <BxIcon name={k} />
            {k === 'orders' && newOrders > 0 && <span className="bx-badge">{newOrders}</span>}
          </>
        );
        return locked
          ? <div key={k} className="bx-nav lock" aria-disabled="true" aria-label={label} title={label}>{inner}</div>
          : <Link key={k} to={`${route}${q}`} className={`bx-nav${on ? ' on' : ''}`} aria-label={label} title={label} aria-current={on ? 'page' : undefined}>{inner}</Link>;
      })}
      <span className="bx-av sm u" style={{ marginTop: 'auto' }} title={name} aria-label={name}>{initialsOf(name, user?.email)}</span>
    </nav>
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
          const [, , route] = entry;
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
              <BxIcon name={k} />
              <span style={{ flex: 1 }}>{t(`nav.${k}`)}</span>
              {locked
                ? <BxIcon name="lock" size="s" label={t('shell.ownerOnly')} />
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
      <nav aria-label={t('shell.nav')} style={{
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
          const [, , route] = entry;
          const on = k === active;
          return (
            <Link key={k} to={`${route}${q}`} style={slot(on)} aria-current={on ? 'page' : undefined}>
              <BxIcon name={k} style={{ width: 22, height: 22 }} />
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
          <BxIcon name="more" style={{ width: 22, height: 22 }} />
          {t('nav.more')}
        </button>
      </nav>
    </>
  );
}

/**
 * Page heading (the design's MTop), drawn in the shell's header bar: the
 * title, the page's sub-line beside it on tablet and desktop, and `right` (a
 * page's own chips or actions) at the bar's end. A phone's bar has room for
 * the title alone, so `right` stays in the page there, and the bar's second
 * line names the store instead (the Shell board's "Studio Form ▾").
 *
 * Outside the shell it draws itself in place, as it always did.
 */
export function MTop({ T, title, sub, right, mode }) {
  const slots = useContext(TopSlots);
  if (slots) {
    const phone = slots.bx === 'ph';
    return (
      <>
        {slots.title && createPortal(<b className="bx-h2">{title}</b>, slots.title)}
        {!phone && sub && slots.sub && createPortal(<span className="bx-sm bx-dim">{sub}</span>, slots.sub)}
        {!phone && right && slots.right && createPortal(right, slots.right)}
        {phone && right && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>{right}</div>}
      </>
    );
  }
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

/** The header bar across the content; MTop fills its slots. */
function TopBar({ t, bx, store, user, sub, active, setSlots }) {
  const titleRef = useRef(null);
  const subRef = useRef(null);
  const rightRef = useRef(null);
  useEffect(() => {
    setSlots({ bx, title: titleRef.current, sub: subRef.current, right: rightRef.current });
  }, [bx, setSlots]);
  return (
    <header className="bx-top">
      <div className="bx-top-title">
        <div ref={titleRef} className="bx-top-t" />
        <b className="bx-h2 bx-top-fallback">{t(`nav.${active}`)}</b>
        {bx === 'ph' ? (
          // The store this is, and the way to another: the picker (a full load).
          <a href="/" className="bx-switch bx-sm" aria-label={`${store.name} · ${t('nav.switchStore')}`}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{store.name}</span>
            <BxIcon name="chevD" style={{ width: 14, height: 14 }} />
          </a>
        ) : (
          <div ref={subRef} className="bx-top-s" />
        )}
      </div>
      {bx !== 'ph' && <div ref={rightRef} className="bx-row" style={{ flex: 'none', gap: 10 }} />}
      {bx === 'desk' && (
        <a href={storeUrlFor(sub)} target="_blank" rel="noreferrer" className="bx-btn bx-btn-g bx-btn-sm">
          <BxIcon name="external" />{t('nav.viewStore')}
        </a>
      )}
      {bx === 'ph' && <Account t={t} user={user} variant="top" />}
    </header>
  );
}

export default function ManagerShell() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const { user, isStoreOwner, canManageStore, isAuthenticated, loading: authLoading } = useAuth();
  const { tenant } = useTenant();
  // Unread orders, for the nav badge. Failure is silent: a missing count
  // should cost the merchant a badge, never the whole back office.
  const [newOrders, setNewOrders] = useState(0);
  const [slots, setSlots] = useState({ bx: null, title: null, sub: null, right: null });
  const bx = useBx();
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
  const roleLabel = t(`role.${isStoreOwner ? 'OWNER' : 'MANAGER'}`);
  // The store's own name, as its shoppers see it; the address until it loads.
  const mine = tenant && tenant.subdomain === sub ? tenant : null;
  const store = {
    sub,
    name: mine?.displayName || mine?.name || sub || t('title'),
    logoUrl: mine?.logoUrl || null,
  };

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

  // The slots are only handed out once the bar that owns them is the one on
  // screen, so a resize never portals into a bar that has gone.
  const ctx = slots.bx === bx ? slots : { bx, title: null, sub: null, right: null };

  return (
    <TopSlots.Provider value={ctx}>
      <div className="bx bx-shell" data-bx={bx} style={{ font: `400 14px ${T.font}`, color: T.text }}>
        {bx === 'desk' && (
          <Side t={t} store={store} user={user} roleLabel={roleLabel} active={active} q={q} isOwner={isStoreOwner} newOrders={newOrders} />
        )}
        {bx === 'tab' && (
          <Rail t={t} store={store} user={user} active={active} q={q} isOwner={isStoreOwner} newOrders={newOrders} />
        )}
        <div className="bx-body" style={bx === 'ph' ? { minHeight: '100vh', display: 'flex', flexDirection: 'column' } : undefined}>
          <TopBar t={t} bx={bx} store={store} user={user} sub={sub} active={active} setSlots={setSlots} />
          <main className="bx-main" style={bx === 'ph' ? { flex: 1, paddingBottom: 20 } : undefined}>{pages}</main>
          {bx === 'ph' && <Dock T={T} t={t} active={active} q={q} isOwner={isStoreOwner} newOrders={newOrders} />}
        </div>
      </div>
    </TopSlots.Provider>
  );
}
