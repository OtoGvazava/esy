// One order (the design's MOrderDetail).
//
// The list screen had to carry the fulfilment buttons because this screen did
// not exist. It does now, so the list goes back to being a list and the
// decisions happen here, next to the things they affect: who the buyer is,
// where it goes, what is in it, and what the merchant actually takes home.
//
// The two axes stay apart, which is the whole point of D2. Fulfilment runs
// along the chain PLACED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED and is drawn
// as a timeline. Payment is a separate fact shown beside it: a DELIVERED order
// can be unpaid and a PAID order can be cancelled, so they are never merged
// into one "status".
//
// Refunds live in the payment card, owner-only (D2): a refund is not a
// cancellation, so it never touches the fulfilment timeline beside it.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { Btn, Card, Chip, Note } from '../core/primitives';
import { Icons } from '../core/icons';
import { money, feeOf } from '../core/money';
import { StatusPair } from '../core/domain';
import { tenantApi, handleApiError } from '../utils/api';
import { MTop } from './ManagerShell';

// The fulfilment chain, in order. CANCELLED is not on it: it leaves the chain
// rather than advancing along it, so the timeline is replaced when it happens.
const CHAIN = ['PLACED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const NEXT_STEP = {
  PLACED: 'SHIPPED',
  SHIPPED: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};
const CAN_CANCEL = new Set(['PLACED', 'SHIPPED']);

const enumName = (s) => String(s || 'PLACED').toUpperCase().replace(/ /g, '_');

function Timeline({ T, t, status, isMobile }) {
  const idx = CHAIN.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 2 : 4 }}>
      {CHAIN.map((s, i) => (
        <div key={s} style={{ display: 'contents' }}>
          <span style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            width: isMobile ? 66 : 88, flexShrink: 0,
          }}>
            <span style={{
              width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: '50%',
              boxSizing: 'border-box', color: '#fff',
              background: i < idx ? T.success : i === idx ? T.accent : 'transparent',
              border: i > idx ? `2px solid ${T.borderStr}` : 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {i < idx ? <Icons.check size={12} />
                : i === idx ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
                  : null}
            </span>
            <span style={{
              font: `${i === idx ? 700 : 500} ${isMobile ? 9.5 : 11}px ${T.font}`,
              color: i <= idx ? T.text : T.textMute, textAlign: 'center', lineHeight: 1.3,
            }}>{t(`orders.status.${s.toLowerCase()}`, { defaultValue: s })}</span>
          </span>
          {i < CHAIN.length - 1 && (
            <span style={{ flex: 1, height: 2, background: i < idx ? T.success : T.border, marginTop: isMobile ? 11 : 13 }} />
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ T, k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', font: `500 13px ${T.font}`, color: T.textDim }}>
      <span>{k}</span><span style={{ color: T.text }}>{v}</span>
    </div>
  );
}

export default function ManagerOrderDetail() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  // Refunds are owner-only and the API enforces it; this just keeps a manager
  // from being shown a control that would refuse them.
  const { isStoreOwner } = useAuth();
  const { isMobile, isDesktop } = useDevice();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const sub = params.get('tenant') || undefined;
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';
  const mode = isMobile ? 'mobile' : isDesktop ? 'desktop' : 'tablet';
  const pad = isMobile ? 16 : 20;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');

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

  const advance = async (next) => {
    setBusy(true);
    setError('');
    try {
      const updated = await tenantApi.updateOrderStatus(order.id, next, sub);
      // The PATCH returns the order without its lines; keep the ones we have.
      setOrder((prev) => ({ ...prev, ...updated, lines: prev.lines }));
      setConfirmCancel(false);
    } catch (e) {
      setError(handleApiError(e, t('orders.error')));
    } finally {
      setBusy(false);
    }
  };

  const refund = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await tenantApi.refundOrder(order.id, refundAmount, sub);
      setOrder((prev) => ({ ...prev, ...updated, lines: prev.lines }));
      setRefunding(false);
    } catch (e) {
      setError(handleApiError(e, t('detail.refundFailed')));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div style={{ font: `500 13px ${T.font}`, color: T.textMute }}>{t('orders.loading')}</div>;
  }
  if (error && !order) {
    return (
      <div>
        <Note T={T} tone="danger">{error}</Note>
        <div style={{ marginTop: 12 }}>
          <Btn T={T} kind="ghost" size="sm" onClick={() => navigate(`/orders${q}`)}>
            <Icons.arrowL size={14} /> {t('detail.backToOrders')}
          </Btn>
        </div>
      </div>
    );
  }

  const status = enumName(order.status);
  const payment = enumName(order.paymentStatus);
  const total = Number(order.total) || 0;
  const fee = feeOf(total);
  // Server-supplied, not inferred from the status: partial refunds mean the
  // remaining figure is the only thing that says what is still refundable.
  const refunded = Number(order.refunded) || 0;
  const refundable = order.refundable != null
    ? Number(order.refundable) || 0
    : (payment === 'PAID' ? total - refunded : 0);
  const dead = status === 'CANCELLED' || payment === 'REFUNDED';
  const next = NEXT_STEP[status];
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const ship = order.delivery;
  const idLabel = (order.orderNumber || `ESY-${order.id}`).toString().toUpperCase();

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Btn T={T} kind="quiet" size="sm" onClick={() => navigate(`/orders${q}`)}>
          <Icons.arrowL size={14} /> {t('detail.backToOrders')}
        </Btn>
      </div>

      <MTop
        T={T}
        mode={mode}
        title={<span style={{ fontFamily: T.mono, fontSize: isMobile ? 17 : 22 }}>{idLabel}</span>}
        right={(
          <StatusPair
            T={T}
            status={status}
            payment={payment}
            statusLabel={t(`orders.status.${status.toLowerCase()}`, { defaultValue: status })}
            paymentLabel={t(`orders.payment.${payment.toLowerCase()}`, { defaultValue: payment })}
          />
        )}
      />

      {error && <div style={{ marginBottom: 14 }}><Note T={T} tone="danger">{error}</Note></div>}

      <div style={{
        display: 'grid', gridTemplateColumns: isDesktop ? '1.35fr 1fr' : '1fr',
        gap: 14, alignItems: 'start',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card T={T} pad={pad}>
            <div style={{ font: `700 14.5px ${T.font}`, color: T.text, marginBottom: 14 }}>
              {t('detail.whereIsIt')}
            </div>
            {status === 'CANCELLED'
              ? <Chip T={T} tone="danger">{t('orders.status.cancelled')}</Chip>
              : <Timeline T={T} t={t} status={status} isMobile={isMobile} />}

            {next && (
              <div style={{ marginTop: 18 }}>
                <Btn T={T} size="lg" full disabled={busy} onClick={() => advance(next)}>
                  {busy ? t('ui.working') : t(`orders.advance.${next.toLowerCase()}`)}
                </Btn>
              </div>
            )}

            <div style={{ marginTop: 13 }}><Note T={T}>{t('orders.buyerNotified')}</Note></div>

            {CAN_CANCEL.has(status) && (
              <div style={{ marginTop: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {confirmCancel ? (
                  <>
                    <div style={{ font: `600 13px ${T.font}`, color: T.text }}>{t('detail.cancelConfirm')}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Btn T={T} kind="danger" size="sm" disabled={busy} onClick={() => advance('CANCELLED')}>
                        {t('detail.cancelYes')}
                      </Btn>
                      <Btn T={T} kind="ghost" size="sm" disabled={busy} onClick={() => setConfirmCancel(false)}>
                        {t('detail.cancelNo')}
                      </Btn>
                    </div>
                  </>
                ) : (
                  <Btn T={T} kind="danger" full={isMobile} onClick={() => setConfirmCancel(true)}>
                    {t('detail.cancelOrder')}
                  </Btn>
                )}
                <span style={{ font: `400 11.5px/1.5 ${T.font}`, color: T.textMute }}>
                  {t('detail.cancelNote')}
                </span>
              </div>
            )}
          </Card>

          <Card T={T} pad={pad}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
              <span style={{ font: `700 14.5px ${T.font}`, color: T.text }}>{t('detail.payment')}</span>
              <Chip T={T} tone={payment === 'PAID' ? 'success' : payment === 'REFUNDED' ? 'danger' : 'neutral'}>
                {t(`orders.payment.${payment.toLowerCase()}`, { defaultValue: payment })}
              </Chip>
            </div>
            <div style={{ font: `400 12.5px/1.6 ${T.font}`, color: T.textDim }}>{t('detail.twoStatusNote')}</div>

            {/* The refund control, owner-only — the API refuses a manager.
                Fulfilment is a manager's job; sending money back out of the
                business is the owner's, and they are different permissions.

                Amount defaults to everything still refundable and can be
                lowered for a partial refund. What it never claims is that the
                money has arrived: BOG's refund API is asynchronous, so a
                successful request shows as "refund pending" until the bank
                confirms it. */}
            {refundable > 0 && isStoreOwner && (
              <div style={{ marginTop: 13, paddingTop: 13, borderTop: `1px solid ${T.border}` }}>
                {refunded > 0 && (
                  <div style={{ font: `500 11.5px ${T.font}`, color: T.textMute, marginBottom: 8 }}>
                    {t('detail.refundedSoFar', { amount: money(refunded) })}
                  </div>
                )}
                {!refunding ? (
                  <Btn T={T} kind="ghost" size="sm" onClick={() => { setRefunding(true); setRefundAmount(String(refundable)); }}>
                    {t('detail.refundCta')}
                  </Btn>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <label style={{ font: `600 11.5px ${T.font}`, color: T.textDim }}>
                      {t('detail.refundAmount', { max: money(refundable) })}
                    </label>
                    <input
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      inputMode="decimal"
                      style={{
                        height: 40, padding: '0 12px', borderRadius: 10,
                        border: `1px solid ${T.border}`, background: T.dark ? T.surface2 : '#fff',
                        color: T.text, font: `600 13px ${T.font}`, outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Btn T={T} kind="danger" size="sm" disabled={busy} onClick={refund}>
                        {busy ? t('detail.refunding') : t('detail.refundConfirm')}
                      </Btn>
                      <Btn T={T} kind="ghost" size="sm" disabled={busy} onClick={() => setRefunding(false)}>
                        {t('detail.refundCancel')}
                      </Btn>
                    </div>
                    <span style={{ font: `400 11.5px/1.5 ${T.font}`, color: T.textMute }}>
                      {t('detail.refundNote')}
                    </span>
                  </div>
                )}
              </div>
            )}
            {refundable <= 0 && refunded > 0 && (
              <div style={{ marginTop: 13 }}>
                <Note T={T}>{t('detail.refundedInFull', { amount: money(refunded) })}</Note>
              </div>
            )}
            {refundable > 0 && !isStoreOwner && (
              <div style={{ marginTop: 13 }}>
                <Note T={T}>{t('detail.refundOwnerOnly')}</Note>
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card T={T} pad={pad}>
            <div style={{ font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 11 }}>
              {t('orders.colBuyer')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 11 }}>
              <span style={{
                width: 42, height: 42, borderRadius: '50%', background: T.accentBg, color: T.accentFg,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                font: `800 15px ${T.font}`, flexShrink: 0,
              }}>{(ship?.recipient || '?').charAt(0)}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', font: `700 13.5px ${T.font}`, color: T.text }}>
                  {ship?.recipient || t('orders.noBuyer')}
                </span>
                {ship?.phone && (
                  <span style={{ display: 'block', font: `500 12.5px ${T.mono}`, color: T.textDim, marginTop: 2 }}>
                    {ship.phone}
                  </span>
                )}
              </span>
            </div>
            {ship?.phone && (
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`tel:${ship.phone}`} style={{ flex: 1, textDecoration: 'none' }}>
                  <Btn T={T} kind="quiet" size="sm" full><Icons.phone size={14} /> {t('detail.call')}</Btn>
                </a>
                <a href={`sms:${ship.phone}`} style={{ flex: 1, textDecoration: 'none' }}>
                  <Btn T={T} kind="ghost" size="sm" full>SMS</Btn>
                </a>
              </div>
            )}
            <div style={{ marginTop: 13, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
              <div style={{ font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                {t('detail.deliveryAddress')}
              </div>
              <div style={{ font: `500 12.5px/1.55 ${T.font}`, color: T.text }}>
                {/* No address means collection in store (D9), not missing data. */}
                {ship?.line
                  ? [ship.line, ship.city, ship.postalCode].filter(Boolean).join(', ')
                  : t('detail.pickupInStore')}
              </div>
            </div>
          </Card>

          <Card T={T} pad={pad} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {lines.map((l) => (
              <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', font: `500 12.5px ${T.font}`, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.title} × {l.quantity}
                  </span>
                  {l.variantLabel && (
                    <span style={{ display: 'block', font: `500 11px ${T.font}`, color: T.textMute, marginTop: 2 }}>
                      {l.variantLabel}
                    </span>
                  )}
                </span>
                <span style={{ font: `700 13px ${T.font}`, whiteSpace: 'nowrap' }}>
                  {money(Number(l.price) * Number(l.quantity))}
                </span>
              </div>
            ))}
            {lines.length > 0 && <div style={{ height: 1, background: T.border }} />}
            <Row T={T} k={t('orders.colTotal')} v={money(total)} />
            <Row T={T} k={t('detail.esyFee')} v={`−${money(fee)}`} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ font: `700 13.5px ${T.font}`, color: T.text }}>{t('orders.youReceive')}</span>
              <span style={{
                font: `800 19px ${T.font}`, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
                color: dead ? T.textMute : T.successFg,
              }}>{dead ? '—' : money(total - fee)}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
