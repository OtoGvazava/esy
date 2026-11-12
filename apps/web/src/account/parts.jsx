// What the account's sections share (the design's U2–U7): an order's row, a
// store's row, the list row that opens a section, the dialog, and how an
// order's status, items and day are written. No copy lives here; every label
// arrives from the caller's t().
//
// The sections are drawn inside whichever app the person is in (esy.ge, a
// store, the back office, admin), so nothing here assumes a host: a link to
// another section goes through `link`, a page that only esy.ge has through
// `away`, and anything that leaves the app opens in a new tab.
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useId, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePresence } from '../core/usePresence';
import { money } from '../core/money';
import { safeAccent } from '../core/tokens';
import { managerUrl } from '../utils/hosts';
import { storeUrl } from '../platform/platformData';
import { Av, Btn, Card, Chip, Glyph, LiIc, cardStyle, initialsOf, liStyle, type } from '../platform/PlatformKit';

/**
 * What AccountBody hands every section: tokens and device; the app it is
 * drawn in (`app`, and `here`, the store on a store); `link(path)` for
 * another section of this app; `away(path)` for one of esy.ge's own pages;
 * `out`, whether leaving the app opens a new tab; `showTitle`, whether the
 * page draws its own heading or the app's bar does; and the account itself.
 */
export const useAccount = () => useOutletContext();

/** A link's props for leaving the app: a new tab anywhere but esy.ge. */
export const outProps = (out) => (out ? { target: '_blank', rel: 'noopener noreferrer' } : {});

/** A router link (`to`) for this app, or a plain one (`href`) for another. */
export function Go({ to, href, children, ...rest }) {
  if (to) return <Link to={to} {...rest}>{children}</Link>;
  return <a href={href} {...rest}>{children}</a>;
}

// A shopper's order status: one hue per status, as the design review settled
// (placed amber, shipped indigo, out for delivery blue, delivered green,
// cancelled grey). The API sends the enum lower-cased with spaces.
const STATUS = {
  placed: ['placed', 'pend'],
  shipped: ['shipped', 'ship'],
  'out for delivery': ['out_for_delivery', 'conf'],
  delivered: ['delivered', 'done'],
  cancelled: ['cancelled', 'canc'],
};

export const isCancelled = (order) => order?.status === 'cancelled';

export const storeName = (s) => s?.displayName || s?.name || s?.subdomain || '';

/** A Georgian mobile as the design writes it, "+995 555 12 34 56"; anything else as stored. */
export function phoneText(p) {
  const m = String(p || '').replace(/\D/g, '').match(/^(?:995)?(5\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+995 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : String(p || '').trim();
}

/** "Linen shirt", "Linen shirt and 1 more", or "2 items" when the first line is unknown. */
export function orderWhat(t, order) {
  const n = Number(order.items) || 0;
  if (!order.firstItem) return t('me.items', { count: n, n });
  return n > 1 ? t('me.itemMore', { title: order.firstItem, count: n - 1, n: n - 1 }) : order.firstItem;
}

/** An order opens on the store it was placed at (on that store itself, its own page). */
export const orderHref = (order) => (order.store?.subdomain
  ? `${storeUrl(order.store)}/orders/${encodeURIComponent(order.orderNumber)}`
  : undefined);

/** "31 Oct" in the page's language; nothing for a missing date. */
export function dayText(iso, lang) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-GB', { day: 'numeric', month: 'short' });
}

export function StatusChip({ T, t, order }) {
  const [key, tone] = STATUS[order.status] || [order.status, 'canc'];
  return <Chip T={T} tone={tone}>{t(`orders.status.${key}`, { ns: 'storefront', defaultValue: order.status })}</Chip>;
}

const clip = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

/**
 * One order in a list: the store it came from, what was bought and for how
 * much, its status. `day` adds the date column and the "opens elsewhere" mark
 * (the orders screen, off a phone); `bare` drops the store, for a block that
 * is already about one store.
 */
export function OrderRow({ T, t, order, last, day, bare }) {
  const { app, here, out } = useAccount();
  const s = order.store || {};
  const name = storeName(s);
  // On the store it was placed at, an order is that store's own page; any
  // other store's order is another app.
  const local = app === 'store' && !!s.subdomain && s.subdomain === here;
  const go = local
    ? { to: `/orders/${encodeURIComponent(order.orderNumber)}` }
    : { href: orderHref(order), ...outProps(out) };
  const leaves = !local && (out || day != null);
  return (
    <Go {...go} className="esy-press-soft" style={liStyle(T, last)}>
      {bare
        ? <LiIc T={T} name="bag" />
        : <Av T={T} size="sm" color={safeAccent(s.primaryColor)}>{initialsOf(name)}</Av>}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* A long store name gives way first: the number is what tells two orders apart. */}
        <b
          title={bare ? undefined : t('me.orderTitle', { store: name, number: order.orderNumber })}
          style={{ display: 'flex', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', minWidth: 0 }}
        >
          {!bare && <span style={{ ...clip, flex: '0 1 auto', minWidth: '3ch' }}>{name}</span>}
          <span style={{ ...clip, flex: '0 0 auto', maxWidth: bare ? '100%' : '70%', whiteSpace: 'pre' }}>
            {`${bare ? '' : ' · '}#${order.orderNumber}`}
          </span>
        </b>
        <div style={{ fontSize: 12, color: T.textDim, ...clip }}>
          {t('me.orderSub', { what: orderWhat(t, order), total: money(order.total) })}
        </div>
      </div>
      {day != null && <span style={{ width: 72, flex: 'none', fontSize: 12.5, color: T.textDim }}>{day}</span>}
      <StatusChip T={T} t={t} order={order} />
      {leaves && <Glyph name="ext" size={16} style={{ color: T.textDim }} />}
    </Go>
  );
}

/** A list's last row: how many are shown of how many, and "show more" while there are more. */
export function ShownRow({ T, t, ph, shown, total, onMore }) {
  return (
    <div style={{ ...liStyle(T, true), justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12.5, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
        {t('hub.shown', { shown, total })}
      </span>
      {total > shown && (
        <button
          type="button"
          onClick={onMore}
          className="esy-press-soft"
          style={{
            height: ph ? 40 : 38, padding: '0 15px', borderRadius: 'var(--k-r-btn)', border: 0, cursor: 'pointer',
            background: 'transparent', color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}`, font: `600 13.5px/1 ${T.font}`,
          }}
        >
          {t('hub.more')}
        </button>
      )}
    </div>
  );
}

/**
 * A list row that goes somewhere: an icon, a label with an optional second
 * line, then a count or a chip, and a chevron. `to` stays in the app, `href`
 * leaves it; with `target` it opens in a new tab and says so with its mark
 * in place of the chevron.
 */
export function Row({ T, icon, label, sub, meta, chip, to, href, target, rel, last, onClick }) {
  const { t } = useTranslation('navbar');
  const named = target === '_blank'
    ? <>{label}<span style={srOnly}>{` (${t('acct.newTab')})`}</span></>
    : label;
  const body = (
    <>
      <LiIc T={T} name={icon} />
      {sub
        ? <div style={{ flex: 1, minWidth: 0 }}><span>{named}</span><div style={{ fontSize: 12, color: T.textDim }}>{sub}</div></div>
        : <span style={{ flex: 1, minWidth: 0 }}>{named}</span>}
      {meta != null && <span style={{ fontSize: 12.5, color: T.textDim, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{meta}</span>}
      {chip}
      <Glyph name={target ? 'ext' : 'chevR'} size={16} style={{ color: T.textDim }} />
    </>
  );
  const style = liStyle(T, last);
  if (to) return <Link to={to} className="esy-press-soft" style={style}>{body}</Link>;
  return <a href={href} target={target} rel={rel} onClick={onClick} className="esy-press-soft" style={style}>{body}</a>;
}

/** "3 new" beside a store: its placed orders nobody has acted on yet. */
export function NewChip({ T, t, n }) {
  if (!(n > 0)) return null;
  return (
    <Chip T={T} tone="brand" nd aria-label={t('me.newAria', { count: n, n })} style={{ height: 20, padding: '0 8px', fontSize: 11.5 }}>
      {t('me.newChip', { count: n, n })}
    </Chip>
  );
}

export const roleText = (t, store) => (store.myRole === 'MANAGER' ? t('me.manager') : t('me.owner'));

export const officeUrl = (store) => managerUrl(`/?tenant=${encodeURIComponent(store.subdomain)}`);

/** A store you run, as one line: its name, new orders, address and role, and the way into its back office. */
export function StoreRow({ T, t, ph, store }) {
  const { out } = useAccount();
  const name = storeName(store);
  const owner = store.myRole !== 'MANAGER';
  return (
    <Card T={T} pad={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: ph ? 'wrap' : 'nowrap' }}>
      <Av T={T} color={safeAccent(store.primaryColor)}>{initialsOf(name)}</Av>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 12.5 }}>{name}</b>
          <NewChip T={T} t={t} n={Number(store.newOrders) || 0} />
        </div>
        <div style={{ fontSize: 12, color: T.textDim }}>
          <a href={storeUrl(store)} {...outProps(out)} style={{ color: 'inherit', textDecoration: 'none' }}>{t('me.host', { sub: store.subdomain })}</a>
          {' · '}{roleText(t, store)}
        </div>
      </div>
      <Btn T={T} kind={owner ? 'p' : 's'} size="sm" ph={ph} href={officeUrl(store)} {...outProps(out)} style={ph ? { flex: '1 0 100%' } : undefined}>
        {t('me.panel')}
      </Btn>
    </Card>
  );
}

/** The dashed card that opens another store: esy.ge's own page, so a new tab anywhere else. */
export function NewStoreLink({ T, t, style }) {
  const { away } = useAccount();
  return (
    <Go
      {...away('/sell')}
      className="esy-press-soft"
      style={{
        ...cardStyle(T), border: `1.5px dashed ${T.dark ? '#66666e' : '#b8b8be'}`, boxShadow: 'none',
        display: 'flex', alignItems: 'center', gap: 12, padding: 16, textDecoration: 'none', color: 'inherit', ...style,
      }}
    >
      <LiIc T={T} name="plus" />
      <b style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{t('me.openStore')}</b>
    </Go>
  );
}

/** Kept for screen readers where the app's bar already shows the title. */
export const srOnly = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden',
  clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
};

/**
 * A section's heading: the title, one line under it, and an action at the end
 * of the line. Where the app's own bar shows the title (a store's phone header,
 * the back office's and admin's bar) the page keeps it for screen readers only.
 */
export function Head({ T, desk, title, sub, action }) {
  const { showTitle = true } = useAccount() || {};
  const ty = type(T, desk);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={showTitle ? ty.h1 : srOnly}>{title}</h1>
        {sub && <p style={{ ...ty.body, color: T.textDim, margin: '6px 0 0' }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * The kit's dialog: a centred 520px card, or a sheet from the bottom edge on a
 * phone. Escape and the scrim close it unless `busy`. Kept mounted with `open`
 * it also goes out (styles/motion.css), inert and still showing what it showed,
 * since whatever closed it may already have changed what the caller would draw.
 */
export function Dialog({ T, phone, title, closeLabel, onClose, busy, open = true, children }) {
  const titleId = useId();
  const { mounted, state } = usePresence(open);
  const shown = useRef(null);
  const box = useRef(null);
  if (open || !shown.current) shown.current = { title, children };
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, busy]);
  // The keyboard starts inside it, and goes back to what opened it. With a
  // pointer that is the first field; on a phone it is the close button, since
  // focusing a field there brings the on-screen keyboard up over the sheet.
  useEffect(() => {
    if (!open) return undefined;
    const before = document.activeElement;
    const field = phone ? null : box.current?.querySelector('input, select, textarea');
    (field || box.current?.querySelector('button'))?.focus();
    return () => { if (before instanceof HTMLElement) before.focus(); };
  }, [open, phone]);
  if (!mounted) return null;
  return (
    <div
      role="presentation"
      inert={!open}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: phone ? 'flex-end' : 'center', justifyContent: 'center',
        padding: phone ? 0 : 24,
      }}
    >
      <div
        aria-hidden="true"
        className="esy-scrim"
        data-state={state}
        onMouseDown={() => { if (!busy) onClose(); }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(8,8,12,0.44)' }}
      />
      <section
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={phone ? 'esy-sheet' : 'esy-pop-in'}
        data-state={state}
        style={{
          position: 'relative',
          width: '100%', maxWidth: phone ? 'none' : 520, background: T.surface, color: T.text,
          borderRadius: phone ? '24px 24px 0 0' : 24, boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)',
          padding: phone ? '12px 16px 22px' : 26, display: 'flex', flexDirection: 'column', gap: 16,
          maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box', font: `400 14px/1.45 ${T.font}`,
        }}
      >
        {phone && (
          <span aria-hidden="true" style={{ width: 42, height: 5, borderRadius: 3, background: T.border, alignSelf: 'center' }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <b id={titleId} style={{ font: `700 20px/1.22 ${T.font}`, letterSpacing: '-0.015em' }}>{shown.current.title}</b>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={closeLabel}
            style={{
              width: 44, height: 44, borderRadius: 'var(--k-r-ibtn)', border: 'none', background: T.surface2,
              color: T.text, display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none',
            }}
          >
            <Glyph name="close" />
          </button>
        </div>
        {shown.current.children}
      </section>
    </div>
  );
}
