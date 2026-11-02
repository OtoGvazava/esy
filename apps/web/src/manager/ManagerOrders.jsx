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
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { Card, Note } from '../core/primitives';
import { Icons } from '../core/icons';
import { money, feeOf } from '../core/money';
import { StatusPair } from '../core/domain';
import { storeOrdersQuery } from '../core/query/managerQueries';
import { handleApiError } from '../utils/api';
import { Skeleton } from '../components/skeleton/Skeleton';
import { MTop } from './ManagerShell';
import { NoOrders } from './FirstVisit';
import { SkIn } from './officeSk';

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

/**
 * The two status chips' stand-in: pills drawn with StatusPair's own chip box
 * (its padding and its 11 px line), so a row keeps the height it will have.
 */
function StatusPairSk({ T }) {
  const pill = (w) => (
    <span aria-hidden="true" className="esy-sk" style={{
      display: 'inline-flex', width: w, padding: '5px 11px', boxSizing: 'border-box',
      borderRadius: 999, font: `700 11px ${T.font}`,
    }}>{'\u00a0'}</span>
  );
  return <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>{pill(74)}{pill(62)}</span>;
}

/** A phone's order card while the orders load: OrderCard, line for line. */
function OrderCardSk({ T }) {
  return (
    <Card T={T} pad={14}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ font: `700 12px ${T.mono}` }}><SkIn w={84} /></span>
        <span style={{ flex: 1 }} />
        <span style={{ font: `500 11px ${T.font}` }}><SkIn w={64} /></span>
      </div>
      <StatusPairSk T={T} />
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ font: `500 12.5px ${T.font}`, flex: 1 }}><SkIn w="45%" /></span>
        <span style={{ flexShrink: 0, textAlign: 'right' }}>
          <span style={{ display: 'block', font: `500 11px ${T.font}` }}><SkIn w={60} /></span>
          <span style={{ display: 'block', font: `700 13px ${T.font}` }}><SkIn w={52} /></span>
        </span>
      </div>
    </Card>
  );
}

// The whole card opens the order, as a row of the desktop table does: by tap,
// or by Enter or Space once it has the focus. Pressing it starts fetching the
// order (router/prime.js), so the detail is usually ready by the time it opens.
function OrderCard({ T, t, lang, order, href, onOpen }) {
  const status = enumName(order.status);
  const payment = enumName(order.paymentStatus);
  const dead = isDead(status, payment);
  const onKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onOpen();
  };
  return (
    <Card
      T={T} pad={14} style={{ cursor: 'pointer' }}
      role="button" tabIndex={0} onClick={onOpen} onKeyDown={onKeyDown}
      data-prefetch={href} className="esy-press-soft"
    >
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
            display: 'block', font: `500 11px ${T.font}`, color: T.textMute,
            letterSpacing: '0.05em',
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

  const list = useQuery(storeOrdersQuery());
  const orders = useMemo(() => list.data ?? [], [list.data]);
  const loading = list.isPending;
  const error = list.isError ? handleApiError(list.error, t('orders.error')) : '';
  const [filter, setFilter] = useState('all');
  const hrefOf = (o) => `/orders/${o.id}${q}`;
  const open = (o) => navigate(hrefOf(o));

  const shown = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => enumName(o.status) === filter)),
    [orders, filter],
  );

  const th = {
    font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.07em', textAlign: 'left', padding: '12px 14px',
  };
  const td = {
    padding: '13px 14px', font: `500 13px ${T.font}`, color: T.text,
    borderTop: `1px solid ${T.border}`,
  };
  // An amount must never wrap between the number and the ₾ — "129.99" on one
  // line and the symbol on the next reads as two different figures.
  const tdMoney = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };

  // M2's empty state: no order at all yet, so no filters to offer — just where
  // orders will appear and the store's link to share.
  const none = !loading && !error && orders.length === 0;

  // The table's head, shared with its loading stand-in so the columns are the
  // same ones from the first frame.
  const head = (
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
  );

  return (
    <div>
      <MTop
        T={T} mode={mode} title={t('orders.title')}
        sub={none ? t('firstVisit.noOrdersSub') : sub ? `${sub}.esy.ge` : undefined}
      />

      {none && <NoOrders T={T} sub={sub} />}

      {!none && <div style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const on = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="esy-press"
              style={{
                padding: '8px 13px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                font: `600 12.5px ${T.font}`,
                background: on ? T.text : T.surface,
                color: on ? T.bg : T.textDim,
                border: `1px solid ${on ? T.text : T.border}`,
                // The chosen filter darkens in rather than snapping.
                transition: 'background-color var(--m-base) ease, color var(--m-base) ease, border-color var(--m-base) ease, transform var(--m-quick) var(--m-ease)',
              }}
            >
              {f === 'all' ? t('orders.filterAll') : t(`orders.status.${f.toLowerCase()}`, { defaultValue: f })}
            </button>
          );
        })}
      </div>}

      {/* The list's own shape until it is in: the phone's cards, or the
          table with its real head and rows of the height its rows will have. */}
      {loading && (
        <Skeleton label={t('orders.loading')}>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2, 3].map((i) => <OrderCardSk key={i} T={T} />)}
            </div>
          ) : (
            <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  {head}
                  <tbody>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <tr key={i}>
                        <td style={{ ...td, font: `700 12px ${T.mono}` }}><SkIn w={84} /></td>
                        {isDesktop && <td style={td}><SkIn w={110} /></td>}
                        <td style={tdMoney}><SkIn w={56} /></td>
                        <td style={tdMoney}><SkIn w={56} /></td>
                        <td style={td}><StatusPairSk T={T} /></td>
                        {isDesktop && <td style={td}><SkIn w={80} /></td>}
                        <td style={{ ...td, textAlign: 'right' }}><SkIn w={14} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </Skeleton>
      )}

      {error && (
        <div style={{ marginBottom: 14 }}>
          <Note T={T} tone="danger">{error}</Note>
        </div>
      )}

      {!loading && !none && shown.length === 0 && (
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
              key={o.id} T={T} t={t} lang={lang} order={o} href={hrefOf(o)} onOpen={() => open(o)}
            />
          ))}
        </div>
      ) : (
        <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {head}
              <tbody>
                {shown.map((o) => {
                  const status = enumName(o.status);
                  const payment = enumName(o.paymentStatus);
                  const dead = isDead(status, payment);
                  return (
                    // The order's screen is fetched as its row is pointed at
                    // or pressed (router/prime.js), so the click finds it in.
                    <tr key={o.id} onClick={() => open(o)} data-prefetch={hrefOf(o)} style={{ cursor: 'pointer' }}>
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
