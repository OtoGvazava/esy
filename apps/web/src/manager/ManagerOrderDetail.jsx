// One order (the design's M3, with M6 when a refund is on its way).
//
// The board's layout: the two chips and what to do next on one row, then the
// lines with what the buyer paid and what the merchant is credited, the
// order's history, and who it goes to and where.
//
// The two axes stay apart, which is the whole point of D2. Fulfilment runs
// PLACED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED; payment is a separate fact
// beside it — a delivered order can be unpaid and a paid one cancelled — so
// they are two chips and never one status.
//
// Every figure here is the server's: esy's fee is the one frozen on the order
// (2% of the goods, never of the delivery, billed separately), and what is
// still refundable comes from the refund rules themselves.
//
// The history says only what the order knows. It has a placing time, its
// steps and its payment state, but no time for each step, no courier and no
// record of who pressed what — so those parts of the board's history are not
// drawn rather than made up.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { money, FEE_PERCENT } from '../core/money';
import { tenantApi, handleApiError } from '../utils/api';
import CancelOrderDialog from './CancelOrderDialog';
import StepOrderDialog from './StepOrderDialog';
import RefundOrderDialog from './RefundOrderDialog';
import {
  Alert, Avatar, Chip, G, Glyph, PAY_HUE, PageHead, STATUS_HUE,
  btn, card, formatPhone, initials, kv, li, list, shortName, type,
} from './officeKit';

const NEXT_STEP = {
  PLACED: 'SHIPPED',
  SHIPPED: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};
const CAN_CANCEL = new Set(['PLACED', 'SHIPPED']);
const CHAIN = ['PLACED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const PAID_ONCE = new Set(['PAID', 'REFUND_PENDING', 'REFUNDED']);

const enumName = (s, d = 'PLACED') => String(s || d).toUpperCase().replace(/ /g, '_');
const num = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));

/** "8f2c11c3-5a7e-…" → "8F2C-11C3": the bank's id, short enough to read out. */
const shortBog = (id) => {
  const hex = String(id || '').replace(/[^0-9a-z]/gi, '').slice(0, 8).toUpperCase();
  return hex.length === 8 ? `${hex.slice(0, 4)}-${hex.slice(4)}` : String(id || '');
};

/** "today 13:02", "yesterday 18:40" or "29 Oct, 18:40", in the merchant's zone. */
function whenLabel(t, lang, iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const loc = lang === 'ka' ? 'ka-GE' : 'en-GB';
  const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: false });
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(d)) / 86400000);
  if (diff === 0) return t('order.today', { time });
  if (diff === 1) return t('order.yesterday', { time });
  return t('order.onDay', { date: d.toLocaleDateString(loc, { day: 'numeric', month: 'short' }), time });
}

/** The route the shopper chose, as the boards name it. */
const routeKey = (o) => {
  const r = String(o.deliveryRoute || '').toLowerCase();
  if (r === 'pickup') return 'pickup';
  if (o.deliveryExpress) return 'express';
  if (r === 'tbilisi' || r === 'georgia' || o.delivery?.line) return 'courier';
  return null;
};

/** A line's photo, or the kit's placeholder tile when it has none. */
function Thumb({ src }) {
  const [broken, setBroken] = useState(false);
  const box = {
    width: 52, height: 52, flex: 'none', borderRadius: 10, overflow: 'hidden',
    display: 'grid', placeItems: 'center', background: 'var(--k-ph2)', color: 'var(--k-ph2f)',
  };
  if (src && !broken) {
    return (
      <span style={box}>
        <img src={src} alt="" onError={() => setBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
    );
  }
  return <span style={box} aria-hidden="true"><Glyph size={24}>{G.box}</Glyph></span>;
}

/** The kit's vertical timeline: newest first, a ring on what is happening now. */
function History({ T, t, events }) {
  return (
    <div style={{ ...card(T, 16), display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={type.h3(T)}>{t('order.history')}</h2>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
        {events.map((e, i) => {
          const last = i === events.length - 1;
          const filled = e.state === 'done' || e.state === 'bad';
          const tone = e.state === 'bad' ? T.danger : T.accent;
          return (
            <li key={e.key} style={{ display: 'flex', gap: 14, position: 'relative', paddingBottom: last ? 0 : 22 }}>
              {!last && (
                <span aria-hidden="true" style={{
                  position: 'absolute', left: 11, top: 26, bottom: 2, width: 2,
                  background: e.state === 'now' ? T.border : T.accent,
                }} />
              )}
              <span aria-hidden="true" style={{
                width: 24, height: 24, borderRadius: '50%', flex: 'none', boxSizing: 'border-box',
                display: 'grid', placeItems: 'center', color: T.onAccent,
                background: filled ? tone : T.surface,
                border: `2px solid ${filled ? tone : e.state === 'now' ? T.accent : T.border}`,
                boxShadow: e.state === 'now' ? `0 0 0 4px color-mix(in oklab, ${T.accent} 22%, transparent)` : 'none',
              }}>
                {e.state === 'done' && <Glyph size={13} style={{ strokeWidth: 3 }}>{G.check}</Glyph>}
                {e.state === 'bad' && <Glyph size={13} style={{ strokeWidth: 3 }}>{G.close}</Glyph>}
                {e.state === 'now' && <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.accent }} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <b style={{ display: 'block', font: `600 12.5px/1.45 ${T.font}`, color: T.text }}>{e.title}</b>
                {e.detail && <div style={{ font: `400 12px/1.45 ${T.font}`, color: T.textDim }}>{e.detail}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function ManagerOrderDetail() {
  const { T } = useTK();
  const { t, i18n } = useTranslation('manager');
  const lang = i18n.language;
  // Refunds are owner-only and the API enforces it; this just keeps a manager
  // from being shown a control that would refuse them.
  const { isStoreOwner } = useAuth();
  const { isMobile, isDesktop } = useDevice();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const sub = params.get('tenant') || undefined;
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Which dialog is open: 'step' (ship, out, delivered), 'cancel' or 'refund'.
  const [dialog, setDialog] = useState(null);

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError('');
    tenantApi.order(orderId, sub)
      .then((o) => { if (alive) setOrder(o); })
      .catch((e) => { if (alive) setError(handleApiError(e, t('orders.error'))); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [orderId, sub, t]);

  useEffect(load, [load]);

  // The status and refund calls answer with the order's list shape, without
  // its lines and detail figures, so they are merged over what is on screen.
  const merge = (updated) => setOrder((prev) => ({ ...prev, ...updated, lines: prev.lines }));

  const back = () => navigate(`/orders${q}`);
  const gap = isMobile ? 14 : isDesktop ? 20 : 18;

  if (loading && !order) {
    return <div role="status" style={{ font: `500 13px ${T.font}`, color: T.textDim }}>{t('orders.loading')}</div>;
  }
  if (!order) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        <PageHead T={T} title={t('orders.title')} onBack={back} backLabel={t('order.back')} />
        <Alert T={T} tone="bad" role="alert">{error}</Alert>
      </div>
    );
  }

  const status = enumName(order.status);
  const payment = enumName(order.paymentStatus, 'NONE');
  const total = num(order.total) || 0;
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const goods = lines.reduce((s, l) => s + (num(l.price) || 0) * (num(l.quantity) || 0), 0);
  const deliveryFee = num(order.deliveryFee);
  // The fee frozen on the order; an order from before the detail carried it
  // falls back to the platform rate on the goods, never on the delivery.
  const fee = num(order.serviceFee) ?? Math.round(goods * FEE_PERCENT) / 100;
  const rate = goods > 0 && num(order.serviceFee) != null
    ? Math.round((fee / goods) * 1000) / 10 : FEE_PERCENT;
  // Georgian writes the decimal with a comma, as the money does.
  const pct = String(rate).replace('.', lang === 'ka' ? ',' : '.');
  const refunded = num(order.refunded) || 0;
  const refundable = num(order.refundable) ?? 0;
  const route = routeKey(order);
  const ship = order.delivery;
  const buyer = order.buyer || {};
  const buyerName = ship?.recipient || [buyer.firstName, buyer.lastName].filter(Boolean).join(' ');
  const phone = ship?.phone || buyer.phone || '';
  const number = `#${order.orderNumber || order.id}`;
  const placed = whenLabel(t, lang, order.placedAt || order.placed);
  const next = NEXT_STEP[status];
  const pending = payment === 'REFUND_PENDING';

  // ---- the row under the head: two chips, the payment line, the actions
  const payLine = (() => {
    if (PAID_ONCE.has(payment)) {
      return order.bogOrderId ? (
        <>
          {t('order.payCard')}{' '}
          <span title={order.bogOrderId} style={{ font: `400 13px var(--k-font-m, ${T.mono})`, whiteSpace: 'nowrap' }}>
            {shortBog(order.bogOrderId)}
          </span>
        </>
      ) : t('order.payCardNoId');
    }
    return t(`order.pay.${payment.toLowerCase()}`, { defaultValue: '' });
  })();

  const actions = [];
  if (next) {
    actions.push(
      <button key="next" type="button" onClick={() => setDialog('step')} style={btn(T, 'p', { size: 'sm' })}>
        {next === 'SHIPPED' && <Glyph>{G.truck}</Glyph>}
        {t(`order.step.${next}`)}
      </button>,
    );
  }
  if (CAN_CANCEL.has(status)) {
    actions.push(
      <button key="cancel" type="button" onClick={() => setDialog('cancel')} style={btn(T, 'd', { size: 'sm' })}>
        {t('order.cancel')}
      </button>,
    );
  }
  // A placed or shipped order is cancelled (M7, which can send the refund
  // too); a delivered one, or a cancelled one whose money is still out, is
  // refunded (M5). Owner-only: a manager moves orders, the owner sends money.
  if (isStoreOwner && refundable > 0 && (status === 'DELIVERED' || status === 'CANCELLED')) {
    actions.push(
      <button key="refund" type="button" onClick={() => setDialog('refund')} style={btn(T, 'd', { size: 'sm' })}>
        <Glyph>{G.refund}</Glyph>
        {t('order.refund')}
      </button>,
    );
  }

  // ---- what the merchant is credited, said the way the money really moves
  const net = (() => {
    const struck = { color: T.textDim, textDecoration: 'line-through', fontWeight: 400 };
    if (payment === 'REFUND_PENDING' || payment === 'REFUNDED') {
      return {
        text: t(payment === 'REFUNDED' ? 'order.net.refunded' : 'order.net.refunding', {
          amount: money(Math.max(total - refunded, 0)), back: money(refunded),
        }),
        // A refund writes off the whole order's fee, as billing does.
        fee: <span style={{ ...type.price, ...struck }}>{money(fee)}</span>,
      };
    }
    if (status === 'CANCELLED') {
      // A cancelled order is never billed; money still out is owed back.
      return {
        text: payment === 'PAID' ? t('order.net.cancelledPaid', { amount: money(refundable || total) }) : t('order.net.cancelled'),
        fee: <span style={{ ...type.price, ...struck }}>{money(fee)}</span>,
      };
    }
    if (payment === 'PENDING' || payment === 'FAILED') {
      return { text: t(`order.net.${payment.toLowerCase()}`), fee: null };
    }
    return {
      text: payment === 'PAID'
        ? t('order.net.paid', { amount: money(total), pct })
        : t('order.net.none', { pct }),
      fee: <span style={{ ...type.price, color: T.textDim }}>{money(fee)}</span>,
    };
  })();

  // ---- the history: what the order knows, newest first
  const events = [];
  if (payment === 'REFUND_PENDING') {
    events.push({ key: 'rfp', state: 'now', title: t('order.ev.refundAsked', { amount: money(refunded) }), detail: t('order.ev.refundAskedBy') });
  } else if (payment === 'REFUNDED') {
    events.push({ key: 'rf', state: 'done', title: t('order.ev.refunded', { amount: money(refunded) }), detail: t('order.ev.refundedBy') });
  }
  if (status === 'CANCELLED') {
    events.push({ key: 'cx', state: 'bad', title: t('order.ev.cancelled') });
  } else {
    const reached = CHAIN.indexOf(status);
    ['DELIVERED', 'OUT_FOR_DELIVERY', 'SHIPPED'].forEach((s) => {
      if (CHAIN.indexOf(s) <= reached) events.push({ key: s, state: 'done', title: t(`order.ev.${s}`) });
    });
  }
  if (PAID_ONCE.has(payment)) events.push({ key: 'paid', state: 'done', title: t('order.ev.paid'), detail: t('order.ev.paidBy') });
  else if (payment === 'PENDING') events.push({ key: 'pp', state: 'now', title: t('order.ev.payPending') });
  else if (payment === 'FAILED') events.push({ key: 'pf', state: 'bad', title: t('order.ev.payFailed') });
  events.push({ key: 'new', state: 'done', title: t('order.ev.created'), detail: placed });

  // ---- the delivery card
  const address = ship?.line ? [ship.city, ship.line, ship.postalCode].filter(Boolean).join(', ') : '';
  const deliveryNote = route === 'pickup' ? t('order.pickupNote')
    : status === 'DELIVERED' ? t('order.deliveredNote') : '';

  const sheetProps = {
    T, order, isMobile, sub, buyerName, phone,
    routeLabel: route ? t(`order.route.${route}`) : '',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      <PageHead
        T={T} mobile={isMobile} onBack={back} backLabel={t('order.back')}
        title={t('order.title', { number })}
        sub={[shortName(buyerName), placed, route ? t(`order.route.${route}`) : ''].filter(Boolean).join(' · ')}
      />

      {pending && (
        <Alert T={T} tone="warn" icon={G.refund} role="status">
          <b>{t('order.pendingLead', { amount: money(refunded) })}</b> {t('order.pendingBody')}
        </Alert>
      )}
      {error && <Alert T={T} tone="bad" role="alert">{error}</Alert>}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <Chip T={T} name={STATUS_HUE[status]}>{t(`orders.status.${status.toLowerCase()}`, { defaultValue: status })}</Chip>
        <Chip T={T} outline name={PAY_HUE[payment]}>{t(`orders.payment.${payment.toLowerCase()}`, { defaultValue: payment })}</Chip>
        {payLine && (
          <span style={{ flex: 1, minWidth: 200, font: `400 12.5px/1.45 ${T.font}`, color: T.textDim }}>{payLine}</span>
        )}
        {actions}
      </div>

      <div style={{
        display: 'grid', gap: 20, alignItems: 'start',
        gridTemplateColumns: isDesktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={list(T)}>
            {lines.map((l) => (
              <div key={l.id} style={li(T)}>
                <Thumb src={l.image} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block', font: `600 12.5px/1.4 ${T.font}`, overflowWrap: 'anywhere' }}>{l.title}</b>
                  {l.variantLabel && <div style={{ font: `400 12px/1.4 ${T.font}`, color: T.textDim }}>{l.variantLabel}</div>}
                </div>
                <span style={{ font: `400 12.5px ${T.font}`, color: T.textDim, whiteSpace: 'nowrap' }}>×{l.quantity}</span>
                <b style={{ ...type.price, font: `600 14px ${T.font}`, whiteSpace: 'nowrap' }}>{money((num(l.price) || 0) * (num(l.quantity) || 0))}</b>
              </div>
            ))}
            <div style={{ ...li(T, true), flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
              <div style={{ ...kv, font: `400 12.5px ${T.font}` }}>
                <span style={{ color: T.textDim }}>{t('order.items')}</span>
                <span style={type.price}>{money(goods)}</span>
              </div>
              {route && deliveryFee != null && (
                <div style={{ ...kv, font: `400 12.5px ${T.font}` }}>
                  <span style={{ color: T.textDim }}>{t(`order.delivery.${route}`)}</span>
                  <span style={type.price}>{deliveryFee > 0 ? money(deliveryFee) : t('order.free')}</span>
                </div>
              )}
              <div style={{ ...kv, font: `400 14px ${T.font}` }}>
                <b>{PAID_ONCE.has(payment) ? t('order.buyerPaid') : t('order.total')}</b>
                <b style={type.price}>{money(total)}</b>
              </div>
              <div style={{ ...kv, font: `400 12px/1.45 ${T.font}` }}>
                <span style={{ color: T.textDim }}>{net.text}</span>
                {net.fee && <span style={{ whiteSpace: 'nowrap' }}>{net.fee}</span>}
              </div>
            </div>
          </div>

          <History T={T} t={t} events={events} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ ...card(T, 16), display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar T={T} text={initials(buyerName, buyer.email)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', font: `600 12.5px/1.4 ${T.font}` }}>{buyerName || t('orders.noBuyer')}</b>
                <div style={{ font: `400 12px/1.45 ${T.font}`, color: T.textDim, overflowWrap: 'anywhere' }}>
                  {[formatPhone(phone), buyer.email].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
            {phone && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={`tel:${phone.replace(/\s/g, '')}`} style={btn(T, 's', { size: 'sm' })}>
                  <Glyph>{G.phone}</Glyph>{t('order.call')}
                </a>
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                  style={{ ...btn(T, 'p', { size: 'sm' }), background: '#0e7a40', color: '#fff' }}
                >
                  <Glyph>{G.chat}</Glyph>{t('order.whatsapp')}
                </a>
              </div>
            )}
          </div>

          <div style={{ ...card(T, 16), display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={type.lbl(T)}>
              {route === 'pickup' ? t('order.route.pickup')
                : route ? t('order.deliveryLbl', { route: t(`order.route.${route}`) }) : t('order.deliveryNone')}
            </span>
            {route !== 'pickup' && (
              <b style={{ font: `600 12.5px/1.45 ${T.font}`, color: address ? T.text : T.textDim }}>
                {address || t('order.noAddress')}
              </b>
            )}
            {deliveryNote && <span style={{ font: `400 12px/1.45 ${T.font}`, color: T.textDim }}>{deliveryNote}</span>}
          </div>
        </div>
      </div>

      {dialog === 'step' && next && (
        <StepOrderDialog
          {...sheetProps} next={next}
          onDone={(updated) => { merge(updated); setDialog(null); }}
          onClose={() => setDialog(null)}
        />
      )}
      {/* M7: the dialog says what cancelling does — stock back, an email,
          and whether paid money still needs a refund — before it does it. */}
      {dialog === 'cancel' && (
        <CancelOrderDialog
          T={T} order={order} refundable={refundable} isOwner={isStoreOwner}
          isMobile={isMobile} sub={sub}
          onDone={(updated, problem) => { merge(updated); setError(problem || ''); }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'refund' && (
        <RefundOrderDialog
          {...sheetProps} refundable={refundable} refunded={refunded} deliveryFee={deliveryFee}
          statusLabel={t(`orders.status.${status.toLowerCase()}`, { defaultValue: status })}
          onDone={(updated) => { merge(updated); setDialog(null); }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
