// The back office's orders screen (the design's MOrders).
//
// `/orders` used to render pages/StoreOrders — a STOREFRONT page, complete with
// its own back button, hero glow, max-width container and "powered by esy"
// footer, all of it nested inside the manager shell that already provides the
// sidebar and the top band. The result was two headers and two footers on one
// screen. This is the design's screen instead: a filter row, a table on a wide
// viewport and cards on a phone.
//
// Two things the design shows that the old page did not:
//
//   You receive — the merchant's actual take, total minus the platform's 2%.
//     A merchant reads this column to answer "what lands in my account", and
//     showing only the gross total made them do that arithmetic themselves.
//   The payment axis — fulfilment and payment are separate facts (a DELIVERED
//     order can still be unpaid), so they get separate chips and are never
//     flattened. StatusPair enforces that.
//
// The fulfilment ACTIONS have moved to the detail screen, which is where the
// design puts them. They lived here only while that screen did not exist. A
// row is now a link into the order rather than a place to act on it, so the
// list reads as a list and a decision is made next to what it affects.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { Card, Note } from '../core/primitives';
import { Icons } from '../core/icons';
import { money, feeOf } from '../core/money';
import { StatusPair } from '../core/domain';
import { tenantApi, handleApiError } from '../utils/api';
import { MTop } from './ManagerShell';

// The API sends status lower-cased with spaces ("out for delivery"); the tone
// tables and the fulfilment machine both key off the enum name.
const enumName = (s) => String(s || 'PLACED').toUpperCase().replace(/ /g, '_');

// The design's filter row. 'all' first, then the fulfilment chain in order.
const FILTERS = ['all', 'PLACED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

// An order that will never pay out: the money is gone or was never coming.
const isDead = (status, payment) => status === 'CANCELLED' || payment === 'REFUNDED';

const orderId = (o) => (o.orderNumber || `ESY-${o.id}`).toString().toUpperCase();

const orderDate = (o, lang) => (o.placed
  ? new Date(o.placed).toLocaleDateString(lang === 'ka' ? 'ka-GE' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' })
  : '—');

/** Total minus the platform's cut — an em-dash when nothing will be paid out. */
function Payout({ T, order, dead }) {
  const total = Number(order.total) || 0;
  return (
    <span style={{ font: `700 13px ${T.font}`, color: dead ? T.textMute : T.successFg }}>
      {dead ? '—' : money(total - feeOf(total))}
    </span>
  );
}

function OrderCard({ T, t, lang, order, onOpen }) {
  const status = enumName(order.status);
  const payment = enumName(order.paymentStatus);
  const dead = isDead(status, payment);
  return (
    <Card T={T} pad={14} style={{ cursor: 'pointer' }} onClick={onOpen}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ font: `700 12px ${T.mono}`, color: T.text }}>{orderId(order)}</span>
        <span style={{ flex: 1 }} />
        <span style={{ font: `500 11px ${T.font}`, color: T.textMute }}>{orderDate(order, lang)}</span>
      </div>
      <StatusPair
        T={T}
        status={status}
        payment={payment}
        statusLabel={t(`orders.status.${status.toLowerCase()}`, { defaultValue: status })}
        paymentLabel={t(`orders.payment.${payment.toLowerCase()}`, { defaultValue: payment })}
      />
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <span style={{
          font: `500 12.5px ${T.font}`, color: T.textDim, minWidth: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {order.delivery?.recipient || t('orders.noBuyer')}
        </span>
        <span style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            display: 'block', font: `500 10px ${T.font}`, color: T.textMute,
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>{t('orders.youReceive')}</span>
          <Payout T={T} order={order} dead={dead} />
        </span>
      </div>
    </Card>
  );
}

export default function ManagerOrders() {
  const { T } = useTK();
  const { t, i18n } = useTranslation('manager');
  const { isDesktop, isMobile } = useDevice();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sub = params.get('tenant') || undefined;
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';
  const mode = isMobile ? 'mobile' : isDesktop ? 'desktop' : 'tablet';
  const lang = i18n.language;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const open = (o) => navigate(`/orders/${o.id}${q}`);

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError('');
    tenantApi.orders(sub)
      .then((o) => { if (alive) setOrders(Array.isArray(o) ? o : []); })
      .catch((e) => { if (alive) setError(handleApiError(e, t('orders.error'))); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [sub, t]);

  useEffect(load, [load]);

  const shown = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => enumName(o.status) === filter)),
    [orders, filter],
  );

  const th = {
    font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.07em',
    textTransform: 'uppercase', textAlign: 'left', padding: '12px 14px',
  };
  const td = {
    padding: '13px 14px', font: `500 13px ${T.font}`, color: T.text,
    borderTop: `1px solid ${T.border}`,
  };
  // An amount must never wrap between the number and the ₾ — "129.99" on one
  // line and the symbol on the next reads as two different figures.
  const tdMoney = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };

  return (
    <div>
      <MTop T={T} mode={mode} title={t('orders.title')} sub={sub ? `${sub}.esy.ge` : undefined} />

      <div style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const on = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 13px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                font: `600 12.5px ${T.font}`,
                background: on ? T.text : T.surface,
                color: on ? T.bg : T.textDim,
                border: `1px solid ${on ? T.text : T.border}`,
              }}
            >
              {f === 'all' ? t('orders.filterAll') : t(`orders.status.${f.toLowerCase()}`, { defaultValue: f })}
            </button>
          );
        })}
      </div>

      {loading && (
        <div style={{ font: `500 13px ${T.font}`, color: T.textMute }}>{t('orders.loading')}</div>
      )}

      {error && (
        <div style={{ marginBottom: 14 }}>
          <Note T={T} tone="danger">{error}</Note>
        </div>
      )}

      {!loading && shown.length === 0 && (
        <Card T={T} pad={40} style={{ textAlign: 'center' }}>
          <span style={{
            width: 56, height: 56, borderRadius: 16, background: T.accentBg, color: T.accentFg,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}><Icons.bag size={22} /></span>
          <div style={{ font: `700 15px ${T.font}`, color: T.text }}>
            {filter === 'all' ? t('orders.empty') : t('orders.emptyFilter')}
          </div>
          <div style={{ margin: '8px auto 0', maxWidth: 320, font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>
            {filter === 'all' ? t('orders.emptyBody') : t('orders.emptyFilterBody')}
          </div>
        </Card>
      )}

      {!loading && shown.length > 0 && (isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map((o) => (
            <OrderCard
              key={o.id} T={T} t={t} lang={lang} order={o} onOpen={() => open(o)}
            />
          ))}
        </div>
      ) : (
        <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>{t('orders.colOrder')}</th>
                  {isDesktop && <th style={th}>{t('orders.colBuyer')}</th>}
                  <th style={{ ...th, textAlign: 'right' }}>{t('orders.colTotal')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('orders.youReceive')}</th>
                  <th style={th}>{t('orders.colStatus')}</th>
                  {isDesktop && <th style={th}>{t('orders.colDate')}</th>}
                  <th style={{ ...th, textAlign: 'right' }} />
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => {
                  const status = enumName(o.status);
                  const payment = enumName(o.paymentStatus);
                  const dead = isDead(status, payment);
                  return (
                    <tr key={o.id} onClick={() => open(o)} style={{ cursor: 'pointer' }}>
                      <td style={{ ...td, font: `700 12px ${T.mono}` }}>{orderId(o)}</td>
                      {isDesktop && (
                        <td style={{ ...td, color: T.textDim }}>
                          {o.delivery?.recipient || t('orders.noBuyer')}
                        </td>
                      )}
                      <td style={{ ...tdMoney, fontWeight: 700 }}>{money(o.total)}</td>
                      <td style={tdMoney}>
                        <Payout T={T} order={o} dead={dead} />
                      </td>
                      <td style={td}>
                        <StatusPair
                          T={T}
                          status={status}
                          payment={payment}
                          statusLabel={t(`orders.status.${status.toLowerCase()}`, { defaultValue: status })}
                          paymentLabel={t(`orders.payment.${payment.toLowerCase()}`, { defaultValue: payment })}
                        />
                      </td>
                      {isDesktop && <td style={{ ...td, color: T.textDim }}>{orderDate(o, lang)}</td>}
                      <td style={{ ...td, textAlign: 'right', color: T.textMute }}>
                        <Icons.arrowR size={14} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {!loading && shown.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Note T={T}>{t('orders.buyerNotified')}</Note>
          {!isMobile && <Note T={T}>{t('orders.refundNotRevenue')}</Note>}
        </div>
      )}
    </div>
  );
}
