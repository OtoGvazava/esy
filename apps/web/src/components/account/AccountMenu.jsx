// The account menu (the design's AcctMenu, drawn in every app on U1 and U1b).
//
// One account, so one menu: a store, esy.ge, the back office and admin all
// open this from the control that carries the account. Its first group
// belongs to the place it was opened in; its second is the same everywhere and
// leads to the account itself, whose sections every app draws in its own frame
// (account/), so nobody leaves the app to reach them. What does leave the app
// (esy.ge's help, another app) opens in a new tab and carries the mark for it.
//
// The host supplies the control and keeps its own look for it:
//
//   <AccountMenu app="manager" sheet={bx !== 'desk'} store={{ subdomain }} anchor="above">
//     {({ triggerProps }) => <button {...triggerProps}>…</button>}
//   </AccountMenu>
//
// `sheet` is the host's own call (it knows its breakpoints): a sheet from the
// bottom edge on a phone and a tablet, a popover out of the control on a
// desktop. The popover is drawn over the page (a portal, fixed to the
// control's place) rather than inside the control's own box, because that box
// is often a bar or a sidebar that clips what leaves it. `anchor` says which
// way it opens: "below" a control in a top bar, their right edges aligned;
// "above" one at a sidebar's foot, their left edges aligned.
//
// A host with many controls for the one menu (a store: the bar's button and
// the account item of each menu style) mounts it once without a control and
// drives it: `open`, `onOpenChange`, and `anchorEl`, the control that opened
// it, when it should open out of one (StoreAccount.jsx).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeMode } from '../../contexts/ThemeModeContext';
import { accountQuery } from '../../core/query/queries';
import { usePresence } from '../../core/usePresence';
import { managerUrl, platformUrl } from '../../utils/hosts';
import { storeUrl } from '../../platform/platformData';
import '../../styles/account-menu.css';

// The boards' own paths (AcctMenu), 24×24, stroked by account-menu.css.
const PATHS = {
  bag: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  store: <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  swap: <path d="M4 8h14M15 5l3 3-3 3M20 16H6M9 13l-3 3 3 3" />,
  ext: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  user: <><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c1.5-4 4.3-5.5 7.5-5.5s6 1.5 7.5 5.5" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  screen: <><rect x="3.5" y="5" width="17" height="11.5" rx="2" /><path d="M9 20h6M12 16.5V20" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.5" /></>,
  out: <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" /></>,
  chev: <path d="m9 5 7 7-7 7" />,
};

function Ic({ name, className }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>{PATHS[name]}</svg>;
}

// A language is named in itself, whatever the page's language is.
const NATIVE = { ka: 'ქართული', en: 'English' };

// Latin letters only: toUpperCase() would turn Georgian into Mtavruli capitals.
const latinUpper = (s) => String(s).replace(/[a-z]/g, (c) => c.toUpperCase());

function initialsOf(name, email) {
  const parts = String(name || '').trim().split(/\s+/)
    .map((w) => Array.from(w).find((c) => /\p{L}/u.test(c))).filter(Boolean);
  if (parts.length) return latinUpper(parts.slice(0, 2).join(''));
  return latinUpper(Array.from(String(email || '?'))[0] || '?');
}

/** One row. `to` stays in this app, `href` leaves it, `onClick` alone is an action. */
/**
 * One row. `to` stays in this app, `href` leaves it, `onClick` alone is an
 * action. `out` opens `href` in a new tab: its mark takes the chevron's
 * place and the row says so to a screen reader (`outLabel`).
 */
function Item({ icon, label, sub, meta, chip, chev, to, href, onClick, bad, noPrefetch, out, outLabel }) {
  const cls = `am-mi${sub ? ' two' : ''}${bad ? ' bad' : ''}`;
  const body = (
    <>
      <span className="am-ic"><Ic name={icon} /></span>
      <span className="am-txt">{label}{sub && <small>{sub}</small>}{out && <span className="am-sr">{` (${outLabel})`}</span>}</span>
      {meta != null && <span className="am-meta">{meta}</span>}
      {chip}
      {out ? <Ic name="ext" className="am-chev" /> : chev && <Ic name="chev" className="am-chev" />}
    </>
  );
  const common = { className: cls, role: 'menuitem', 'data-am-item': '', onClick };
  if (to) return <Link to={to} {...common}>{body}</Link>;
  if (href) {
    return (
      <a
        href={href} {...common} data-no-prefetch={noPrefetch ? '' : undefined}
        target={out ? '_blank' : undefined} rel={out ? 'noopener noreferrer' : undefined}
      >{body}</a>
    );
  }
  return <button type="button" {...common}>{body}</button>;
}

/** The popover's width (account-menu.css) and how far it keeps from the window's edge. */
const POP_W = 340;
const EDGE = 12;

/** Where the popover goes for a control at `rect`: fixed, kept inside the window. */
function placeBy(rect, anchor) {
  const w = Math.min(POP_W, window.innerWidth - EDGE * 2);
  const max = window.innerWidth - EDGE - w;
  if (anchor === 'above') {
    return { left: Math.max(EDGE, Math.min(rect.left, max)), bottom: window.innerHeight - rect.top + 8, '--esy-origin': 'bottom left' };
  }
  return { left: Math.max(EDGE, Math.min(rect.right - w, max)), top: rect.bottom + 8 };
}

export default function AccountMenu({
  app, sheet, wide, anchor = 'below', store, storeRole, wrapStyle, onSignedOut, children,
  open: openProp, onOpenChange, anchorEl,
}) {
  const { t } = useTranslation('navbar');
  const { user, logout } = useAuth();
  const { language, appearance } = useThemeMode();
  // Its own state with a control of its own; the host's when the host drives it.
  const [own, setOwn] = useState(false);
  const driven = openProp !== undefined;
  const open = driven ? !!openProp : own;
  const setOpen = useCallback((next) => {
    if (driven) onOpenChange?.(next);
    else setOwn(next);
  }, [driven, onOpenChange]);
  const menu = usePresence(open, sheet ? 240 : 140);
  const box = useRef(null);
  const panel = useRef(null);
  const trigger = useRef(null);
  const [place, setPlace] = useState(null);

  // The account's stores and orders, for the counts: read when the menu first
  // opens, cached after that. A count that has not arrived is simply not drawn.
  const { data } = useQuery({ ...accountQuery(), enabled: open });

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); (anchorEl || trigger.current)?.focus(); return; }
      const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (!step && e.key !== 'Home' && e.key !== 'End') return;
      const items = [...(panel.current?.querySelectorAll('[data-am-item]') || [])];
      if (!items.length) return;
      e.preventDefault();
      const at = items.indexOf(document.activeElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
        : (at + step + items.length) % items.length;
      items[next].focus();
    };
    // A press anywhere else closes the popover; the sheet has its scrim for that.
    const away = (e) => {
      if (sheet) return;
      if (box.current?.contains(e.target) || panel.current?.contains(e.target)) return;
      // A press on the control that opened it is that control's to answer.
      if (anchorEl?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', away);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', away);
    };
  }, [open, sheet, anchorEl, setOpen]);

  // The keyboard starts on the first row, once the menu is on the page: the
  // popover is only drawn after its place is known.
  const drawn = open && (sheet || !!place);
  useEffect(() => {
    if (drawn) panel.current?.querySelector('[data-am-item]')?.focus({ preventScroll: true });
  }, [drawn]);

  // The popover follows its control while it is open: the page may scroll
  // under a bar that is not pinned, and the window may be resized.
  useLayoutEffect(() => {
    if (!open || sheet) return undefined;
    const put = () => {
      const from = anchorEl || trigger.current;
      if (from) setPlace(placeBy(from.getBoundingClientRect(), anchor));
    };
    put();
    window.addEventListener('resize', put);
    window.addEventListener('scroll', put, true);
    return () => {
      window.removeEventListener('resize', put);
      window.removeEventListener('scroll', put, true);
    };
  }, [open, sheet, anchor, anchorEl]);

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.name || '';
  const shown = name && name !== user?.email ? name : (user?.email || '');
  const sub = store?.subdomain || null;

  const owned = data?.ownedStores || [];
  const managed = (data?.managedStores || []).filter((m) => !owned.some((o) => o.subdomain === m.subdomain));
  const stores = [...owned, ...managed];
  const orders = data?.orders || null;
  const fresh = stores.reduce((n, s) => n + (Number(s.newOrders) || 0), 0);
  const here = sub && orders ? orders.filter((o) => o.store?.subdomain === sub).length : null;

  // The account's sections are this app's own pages: the back office keeps
  // the store chosen (?tenant=) on every link.
  const onPlatform = app === 'platform';
  const inApp = (path) => ({ to: app === 'manager' && sub ? `${path}?tenant=${encodeURIComponent(sub)}` : path });
  // Leaving the app: a new tab, with the mark for it.
  const away = (href) => ({ href, out: true, outLabel: t('acct.newTab') });
  // Help is esy.ge's own page: in place on esy.ge, a new tab from anywhere else.
  const help = onPlatform ? { to: '/help' } : away(platformUrl('/help'));

  const signOut = () => {
    setOpen(false);
    logout();
    onSignedOut?.();
  };


  const body = (
    <div className="am-list" role="menu" aria-label={t('acct.label')}>
      <div className="am-head" role="presentation">
        <span className="am-av" aria-hidden="true">{initialsOf(name, user?.email)}</span>
        <div className="am-who">
          <b>{shown}</b>
          {shown !== user?.email && <span>{user?.email}</span>}
        </div>
      </div>
      <div className="am-sep" role="separator" />

      <p className="am-lbl" role="presentation">{t(`acct.here.${app}`)}</p>
      {app === 'store' && (
        <>
          <Item icon="bag" label={t('acct.ordersHere')} meta={here} to="/orders" onClick={close} />
          {/* The store's own team only. The host says so (it knows from the
              session), so the row is there from the first frame. */}
          {storeRole && sub && (
            <Item
              icon="store" label={t('acct.office')} {...away(managerUrl(`/?tenant=${encodeURIComponent(sub)}`))} onClick={close}
              chip={<span className="am-chip role">{storeRole === 'MANAGER' ? t('acct.manager') : t('acct.owner')}</span>}
            />
          )}
        </>
      )}
      {onPlatform && (
        <>
          {/* Always there, so the menu does not grow a row when the account's
              stores arrive; with no store it leads to the offer to open one. */}
          <Item
            icon="store" label={t('acct.myStores')} to="/account/stores" onClick={close}
            chip={fresh > 0 ? <span className="am-chip">{t('acct.newCount', { count: fresh, n: fresh })}</span> : null}
          />
          <Item icon="plus" label={t('acct.openStore')} to="/sell" onClick={close} />
        </>
      )}
      {app === 'manager' && (
        <>
          {/* A full load on purpose: the store picker clears ?tenant and re-reads what this account may do. */}
          <Item icon="swap" label={t('acct.switchStore')} meta={stores.length > 1 ? stores.length : null} href="/" noPrefetch onClick={close} />
          {sub && <Item icon="store" label={t('acct.viewStore')} {...away(storeUrl({ subdomain: sub }))} onClick={close} />}
        </>
      )}
      {app === 'admin' && (
        <>
          <Item icon="store" label={t('acct.myOffice')} {...away(managerUrl('/'))} onClick={close} />
          <Item icon="globe" label={t('acct.toPlatform')} {...away(platformUrl('/'))} onClick={close} />
        </>
      )}

      <div className="am-sep gap" role="separator" />
      <p className="am-lbl" role="presentation">{t('acct.account')}</p>
      <Item icon="user" label={t('acct.manage')} sub={t('acct.manageSub')} chev {...inApp('/account')} onClick={close} />
      {/* Orders from every store are esy.ge's: a new tab from the back office
          and admin. A store's menu keeps to the store: its own orders are above,
          and all of them are in the account (its side list and orders page). */}
      {app !== 'store' && (
        <Item
          icon="receipt" label={t('acct.allOrders')} meta={orders ? orders.length : null} onClick={close}
          {...(onPlatform ? inApp('/account/orders') : away(platformUrl('/account/orders')))}
        />
      )}
      <Item
        icon="screen" label={t('acct.display')} {...inApp('/account/display')} onClick={close}
        meta={t('acct.displayMeta', {
          language: NATIVE[language] || NATIVE.ka,
          appearance: t(`appearance.${appearance || 'auto'}`, { ns: 'display' }),
        })}
      />
      <Item icon="info" label={t('acct.help')} {...help} onClick={close} />

      <div className="am-sep gap" role="separator" />
      <Item icon="out" label={t('acct.signOut')} bad onClick={signOut} />
    </div>
  );

  const triggerProps = {
    ref: trigger,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    onClick: () => setOpen(!open),
  };

  const layers = (
    <>
      {menu.mounted && !sheet && place && createPortal(
        // While it fades out it is inert: a press meant for what is under it
        // must not land on a menu that is already going.
        <div
          ref={panel}
          inert={!open}
          data-state={menu.state}
          className={`am am-pop ${open ? (anchor === 'above' ? 'esy-menu-up' : 'esy-menu-in') : 'esy-pop-in'}`}
          style={place}
        >
          {body}
        </div>,
        document.body,
      )}
      {menu.mounted && sheet && createPortal(
        <div className="am am-layer" data-wide={wide ? '' : undefined} inert={!open}>
          <div aria-hidden="true" className="am-scrim esy-scrim" data-state={menu.state} onClick={close} />
          <div ref={panel} className="am-sheet esy-sheet" data-state={menu.state}>
            <span aria-hidden="true" className="am-grab" />
            {body}
          </div>
        </div>,
        document.body,
      )}
    </>
  );

  // Driven by the host, it has no control of its own to wrap.
  if (!children) return layers;
  return (
    <div ref={box} style={{ position: 'relative', ...wrapStyle }}>
      {children({ open, triggerProps, name: shown })}
      {layers}
    </div>
  );
}
