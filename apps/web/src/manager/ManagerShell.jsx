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
// The shell is the layout route of the host's table (router/manager.jsx): it
// decides whether a store's screens may be drawn at all, and the screen the
// address names arrives through its <Outlet />.
//
// The chrome is the design's Shell board, and changes shape with the width:
// a 256px sidebar on desktop (the store at the top, the account at the
// bottom), an 84px icon rail on tablet, and a four-slot tab bar on a phone.
// Each has a header bar across the content; a page's MTop draws its title
// there (a portal into the bar), so every page gets the same header without
// knowing which shape it is in. The board's bell is not drawn: the back
// office has no notifications to show behind it.
//
// Each of the three marks the current place with one marker that slides from
// entry to entry, as Instagram's tabs do, the moment an entry is tapped
// (core/useIndicator.js): the router may still be fetching the next screen,
// but the tap is answered.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigate, Outlet, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { newOrderCountQuery } from '../core/query/managerQueries';
import { useIndicator, usePendingLocation } from '../core/useIndicator';
import { usePresence } from '../core/usePresence';
import { useTK } from '../core/useTK';
import { Icons } from '../core/icons';
import { MNAV, MDOCK, MMORE, OWNER_ONLY } from './nav';
import { BxIcon, initialsOf, useBx } from './officeBx';
import AccountMenu from '../components/account/AccountMenu';
import ManagerHome from './ManagerHome';
import { markIfComplete, markLoaded } from '../core/imgFade';

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
      {store.logoUrl ? <img src={store.logoUrl} alt="" className="esy-img" ref={markIfComplete} onLoad={markLoaded} /> : initialsOf(store.name, store.sub)}
    </span>
  );
}

/** A nav entry's icon. It gives a small pop when its entry is the one just chosen. */
function NavIcon({ name, pop, style }) {
  return (
    <span className={pop ? 'esy-pop' : undefined} style={{ display: 'inline-flex', flex: 'none' }}>
      <BxIcon name={name} style={style} />
    </span>
  );
}

/**
 * The account, where this size of the back office carries it: the row at the
 * sidebar's foot (desktop), the avatar at the rail's foot (tablet) or in the
 * header (phone). It opens the account menu every app shares (U1b): switching
 * store and the store itself, then the esy account and signing out.
 */
function Account({ user, roleLabel, variant, sub }) {
  const name = user?.name || user?.email || '';
  const initials = initialsOf(name, user?.email);
  const store = sub ? { subdomain: sub } : null;
  if (variant === 'side') {
    return (
      <AccountMenu app="manager" store={store} anchor="above">
        {({ triggerProps }) => (
          <button type="button" className="bx-user esy-press-soft" {...triggerProps}>
            <span className="bx-av sm u" aria-hidden="true">{initials}</span>
            <span className="bx-st-name"><b>{name}</b><span>{roleLabel}</span></span>
            <BxIcon name="chevDs" size="s" className="bx-dim" />
          </button>
        )}
      </AccountMenu>
    );
  }
  // Below a desktop it is a sheet: floating on a tablet, edge to edge on a phone.
  return (
    <AccountMenu app="manager" store={store} sheet wide={variant === 'rail'} wrapStyle={variant === 'rail' ? { marginTop: 'auto' } : { flex: 'none' }}>
      {({ triggerProps }) => (
        <button
          type="button" className="bx-av sm u esy-press" {...triggerProps}
          aria-label={name} title={name} style={{ border: 0, cursor: 'pointer', padding: 0 }}
        >{initials}</button>
      )}
    </AccountMenu>
  );
}

function Side({ t, store, user, roleLabel, active, q, isOwner, newOrders }) {
  const box = useRef(null);
  const ind = useIndicator(box, active);
  return (
    // Chrome: it stays where it is while the page beside it cross-fades.
    <nav ref={box} className="bx-side" aria-label={t('shell.nav')} style={{ viewTransitionName: 'esy-side' }}>
      {/* The current entry's ground, behind the entries (office.css .bx-ind). */}
      <span aria-hidden="true" className="esy-ind bx-ind" data-still={ind.still || undefined} style={ind.style} />
      {/* A full load on purpose: back to the store picker, which clears ?tenant
          and refreshes the permission snapshot the app is rendered against. */}
      <a href="/" className="bx-store" title={t('nav.switchStore')} data-no-prefetch="">
        <StoreAv store={store} />
        <span className="bx-st-name"><b>{store.name}</b><span>{`${store.sub}.esy.ge`}</span></span>
        <BxIcon name="chevD" size="s" className="bx-dim" />
      </a>
      {MNAV.map(([k, , route]) => {
        const locked = OWNER_ONLY.includes(k) && !isOwner;
        const label = t(`nav.${k}`);
        const body = (
          <>
            <NavIcon name={k} pop={!locked && ind.popped === k} />
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
          : (
            <Link
              key={k} to={`${route}${q}`} data-ind={k} className={`bx-nav esy-press-soft${k === active ? ' on' : ''}`}
              aria-current={k === active ? 'page' : undefined}
            >{body}</Link>
          );
      })}
      <span style={{ flex: 1 }} />
      <Account user={user} roleLabel={roleLabel} variant="side" sub={store.sub} />
    </nav>
  );
}

function Rail({ t, store, user, active, q, isOwner, newOrders }) {
  const box = useRef(null);
  const ind = useIndicator(box, active);
  return (
    <nav ref={box} className="bx-rail" aria-label={t('shell.nav')} style={{ viewTransitionName: 'esy-side' }}>
      <span aria-hidden="true" className="esy-ind bx-ind" data-still={ind.still || undefined} style={ind.style} />
      <a
        href="/" title={t('nav.switchStore')} aria-label={`${store.name} · ${t('nav.switchStore')}`} data-no-prefetch=""
        style={{ marginBottom: 10, display: 'inline-flex', textDecoration: 'none' }}
      >
        <StoreAv store={store} />
      </a>
      {/* Icons only, named for assistive tech and on hover. */}
      {MNAV.map(([k, , route]) => {
        const locked = OWNER_ONLY.includes(k) && !isOwner;
        const on = k === active;
        const label = t(`nav.${k}`);
        const inner = (
          <>
            <NavIcon name={k} pop={!locked && ind.popped === k} />
            {k === 'orders' && newOrders > 0 && <span className="bx-badge">{newOrders}</span>}
          </>
        );
        return locked
          ? <div key={k} className="bx-nav lock" aria-disabled="true" aria-label={label} title={label}>{inner}</div>
          : (
            <Link
              key={k} to={`${route}${q}`} data-ind={k} className={`bx-nav esy-press${on ? ' on' : ''}`}
              aria-label={label} title={label} aria-current={on ? 'page' : undefined}
            >{inner}</Link>
          );
      })}
      <Account user={user} variant="rail" sub={store.sub} />
    </nav>
  );
}

/**
 * Behind the tab bar's "More" slot: the destinations a phone has no room for.
 * It rises over a fading scrim and sinks back (styles/motion.css), staying on
 * screen, inert, while it goes.
 */
function MoreSheet({ T, t, open, active, q, isOwner, onClose }) {
  const { mounted, state } = usePresence(open);
  if (!mounted) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={t('nav.more')} inert={!open} style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div className="esy-scrim" data-state={state} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)' }} />
      <div className="esy-sheet" data-state={state} style={{
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
            : <Link key={k} to={`${route}${q}`} className="esy-press-soft" style={css} onClick={onClose} aria-current={on ? 'page' : undefined}>{inner}</Link>;
        })}
      </div>
    </div>
  );
}

// The phone's marker is a pill behind the icon, a little wider than it. The
// negative margin gives the pill its room without moving the icon or label.
const DOCK_MARK = { display: 'inline-flex', padding: '3px 14px', margin: '-3px -14px', borderRadius: 14 };

function Dock({ T, t, active, q, isOwner, newOrders }) {
  const [more, setMore] = useState(false);
  const box = useRef(null);
  // The slot the current place belongs to: its own, or "More" for the ones
  // behind it.
  const current = MDOCK.includes(active) ? active : MMORE.includes(active) ? 'more' : null;
  const ind = useIndicator(box, current);
  // Four equal slots with a label under every icon; the active one is told
  // apart by its tint, as the design draws it, over the sliding marker.
  const slot = (on) => ({
    position: 'relative', zIndex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 3, padding: 0,
    textDecoration: 'none', background: 'none', border: 0, cursor: 'pointer',
    color: on ? T.accentFg : T.textDim, font: `${on ? 600 : 500} 11px/13px ${T.font}`,
    whiteSpace: 'nowrap', transition: 'color var(--m-base) ease, transform var(--m-quick) var(--m-ease)',
  });
  const icon = (k) => (
    <span data-ind={k} style={DOCK_MARK}>
      <NavIcon name={k} pop={ind.popped === k} style={{ width: 22, height: 22 }} />
    </span>
  );
  return (
    <>
      <MoreSheet T={T} t={t} open={more} active={active} q={q} isOwner={isOwner} onClose={() => setMore(false)} />
      <nav ref={box} aria-label={t('shell.nav')} style={{
        position: 'sticky', bottom: 0, zIndex: 40, margin: '0 12px 12px',
        height: 66, borderRadius: 22, display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', padding: '0 4px',
        background: T.dark ? 'rgba(18,18,28,0.88)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)', border: `1px solid ${T.border}`,
        boxShadow: T.shadow, viewTransitionName: 'esy-mdock',
      }}>
        <span
          aria-hidden="true" className="esy-ind" data-still={ind.still || undefined}
          style={{ ...ind.style, borderRadius: 14, background: T.accentBg }}
        />
        {MDOCK.map((k) => {
          const entry = MNAV.find((n) => n[0] === k);
          if (!entry) return null;
          const [, , route] = entry;
          const on = k === active;
          return (
            <Link key={k} to={`${route}${q}`} className="esy-press" style={slot(on)} aria-current={on ? 'page' : undefined}>
              {icon(k)}
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
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="esy-press" style={slot(more || MMORE.includes(active))}>
          {icon('more')}
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
 * `back`, a page's own back button, sits before the title in the bar.
 *
 * Outside the shell it draws itself in place, as it always did.
 */
export function MTop({ T, title, sub, right, mode, back }) {
  const slots = useContext(TopSlots);
  if (slots) {
    const phone = slots.bx === 'ph';
    const heading = back ? (
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {back}<b className="bx-h2" style={{ minWidth: 0 }}>{title}</b>
      </span>
    ) : <b className="bx-h2">{title}</b>;
    return (
      <>
        {slots.title && createPortal(heading, slots.title)}
        {!phone && sub && slots.sub && createPortal(
          // Under the title, not under the back button (44 px and a 10 px gap).
          <span className="bx-sm bx-dim" style={back ? { paddingLeft: 54 } : undefined}>{sub}</span>,
          slots.sub,
        )}
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

/** Whether a page is drawn inside the shell, whose header bar carries its heading. */
// eslint-disable-next-line react-refresh/only-export-components
export function useInShell() {
  return Boolean(useContext(TopSlots));
}

/** To the store's first screen, keeping the store chosen (?tenant=). */
export function ToStoreStart() {
  const [params] = useSearchParams();
  const sub = params.get('tenant');
  return <Navigate to={`/${sub ? `?tenant=${encodeURIComponent(sub)}` : ''}`} replace />;
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
    // It stays put across a page change; only what is written in it cross-fades.
    <header className="bx-top" style={{ viewTransitionName: 'esy-topbar' }}>
      <div className="bx-top-title">
        <div ref={titleRef} className="bx-top-t" />
        <b className="bx-h2 bx-top-fallback">{t(`nav.${active}`)}</b>
        {bx === 'ph' ? (
          // The store this is, and the way to another: the picker (a full load).
          <a href="/" className="bx-switch bx-sm" aria-label={`${store.name} · ${t('nav.switchStore')}`} data-no-prefetch="">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{store.name}</span>
            <BxIcon name="chevD" style={{ width: 14, height: 14 }} />
          </a>
        ) : (
          <div ref={subRef} className="bx-top-s" />
        )}
      </div>
      {bx !== 'ph' && <div ref={rightRef} className="bx-row" style={{ flex: 'none', gap: 10 }} />}
      {bx === 'ph' ? (
        // No room for the label on a phone: the icon alone, named for readers.
        <a href={storeUrlFor(sub)} target="_blank" rel="noreferrer" className="bx-ibtn esy-press"
          aria-label={t('nav.viewStore')} title={t('nav.viewStore')}>
          <BxIcon name="external" />
        </a>
      ) : (
        <a href={storeUrlFor(sub)} target="_blank" rel="noreferrer" className="bx-btn bx-btn-g bx-btn-sm esy-press-soft">
          <BxIcon name="external" />{t('nav.viewStore')}
        </a>
      )}
      {bx === 'ph' && <Account user={user} variant="top" sub={sub} />}
    </header>
  );
}

export default function ManagerShell() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const { user, isStoreOwner, canManageStore, isAuthenticated, loading: authLoading } = useAuth();
  const { tenant } = useTenant();
  const [slots, setSlots] = useState({ bx: null, title: null, sub: null, right: null });
  const bx = useBx();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  // Where the app is going while the router fetches the next screen: the nav
  // marks the entry tapped at once, the header keeps naming the page shown.
  const going = usePendingLocation().pathname;

  const sub = params.get('tenant');
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';
  // Unread orders, for the nav badge. Failure is silent: a missing count
  // should cost the merchant a badge, never the whole back office.
  const { data: newOrders = 0 } = useQuery({ ...newOrderCountQuery(), enabled: !!sub && canManageStore });

  const active = activeKey(going);
  const roleLabel = t(`role.${isStoreOwner ? 'OWNER' : 'MANAGER'}`);
  // The store's own name, as its shoppers see it; the address until it loads.
  const mine = tenant && tenant.subdomain === sub ? tenant : null;
  const store = {
    sub,
    name: mine?.displayName || mine?.name || sub || t('title'),
    logoUrl: mine?.logoUrl || null,
  };

  // Restoring the session: draw nothing rather than flash the sign-in.
  if (authLoading) return <div style={{ minHeight: '100vh', background: T.bg }} />;

  // M0, the front door: signed out, no store chosen yet, or a store this
  // account does not run. It signs in or picks a store; the chrome that exists
  // to move around inside a store would have nothing to point at, and its
  // pages would only collect 403s from the API.
  if (!isAuthenticated || !sub || !canManageStore) return <ManagerHome />;

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
          <TopBar t={t} bx={bx} store={store} user={user} sub={sub} active={activeKey(pathname)} setSlots={setSlots} />
          <main className="bx-main" style={bx === 'ph' ? { flex: 1, paddingBottom: 20 } : undefined}><Outlet /></main>
          {bx === 'ph' && <Dock T={T} t={t} active={active} q={q} isOwner={isStoreOwner} newOrders={newOrders} />}
        </div>
      </div>
    </TopSlots.Provider>
  );
}
