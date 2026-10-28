import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { useOrders } from '../contexts/OrdersContext';
import { orderApi } from '../utils/api';
import { PoweredBy } from '../components/glow/GlowPrimitives';
import { GlowScreen, GlowTopNav, money } from '../components/glow/GlowChrome';

// One order, for the shopper (the design's SOrderDetail).
//
// The list could only say "3 items · 84 ₾" — never WHAT was ordered, which is
// the one question a person opens their orders to answer. It fetches by order
// number rather than reading the list out of context, so a link to an order
// survives a cold page load.
//
// This is also the only place shopper self-cancel (D1) is reachable. The
// endpoint has always existed; nothing in the UI called it, so an order placed
// by mistake could not be undone without contacting the store.
export default function OrderDetail() {
  const { T } = useGlow();
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const { refresh } = useOrders();

  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrder(await orderApi.get(orderNumber));
    } catch (e) {
      setError(e?.message || t('orderDetail.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [orderNumber, t]);

  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    setCancelling(true);
    setError('');
    try {
      const updated = await orderApi.cancel(orderNumber);
      setOrder((prev) => ({ ...prev, ...updated, cancellable: false }));
      setConfirming(false);
      // The list is cached in context and would still show this as placed.
      refresh();
    } catch (e) {
      setError(e?.message || t('orderDetail.cancelFailed'));
      setConfirming(false);
    } finally {
      setCancelling(false);
    }
  };

  const card = {
    borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`,
    padding: 16, marginBottom: 10,
  };
  const rowLabel = { font: `500 11.5px ${T.font}`, color: T.textMute };
  const sectionTitle = { font: `700 13px ${T.font}`, color: T.text, marginBottom: 10 };

  if (loading) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('orderDetail.title')} onBack={() => navigate('/orders')} />
        <div style={{ padding: '48px 24px', textAlign: 'center', font: `500 13px ${T.font}`, color: T.textDim }}>
          {t('orderDetail.loading')}
        </div>
      </GlowScreen>
    );
  }

  if (!order) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('orderDetail.title')} onBack={() => navigate('/orders')} />
        <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ font: `700 17px ${T.font}`, color: T.text }}>{t('orderDetail.notFoundTitle')}</div>
          <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim, maxWidth: 280 }}>
            {error || t('orderDetail.notFoundBody')}
          </div>
          <button
            onClick={() => navigate('/orders')}
            style={{ marginTop: 6, height: 44, padding: '0 20px', borderRadius: 12, border: 'none', background: T.grad, color: '#fff', font: `700 13px ${T.font}`, cursor: 'pointer' }}
          >
            {t('orderDetail.backToOrders')}
          </button>
        </div>
      </GlowScreen>
    );
  }

  const id = (order.orderNumber || order.id || '').toString().toUpperCase();
  const status = String(order.status || 'placed').toLowerCase();
  const statusKey = status.replace(/ /g, '_');
  const tone = status === 'delivered' ? T.success : status === 'cancelled' ? T.danger : T.accentFg;
  const placed = order.placed
    ? new Date(order.placed).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';
  const lines = Array.isArray(order.lines) ? order.lines : [];
  // The sum of the lines is what the shopper can check against the total. They
  // should agree; showing both is how a discrepancy becomes visible instead of
  // being quietly absorbed.
  const linesTotal = lines.reduce((s, l) => s + (Number(l.lineTotal) || 0), 0);
  const paid = String(order.paymentStatus || 'none').toLowerCase();

  return (
    <GlowScreen T={T}>
      <GlowTopNav T={T} title={t('orderDetail.title')} onBack={() => navigate('/orders')} />
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '6px 16px 6px' }}>

        <div style={{ padding: '0 6px 14px' }}>
          <div style={{ font: `700 22px ${T.mono}`, color: T.text, letterSpacing: '-0.02em' }}>#{id}</div>
          <div style={{ font: `400 12.5px ${T.font}`, color: T.textDim, marginTop: 4 }}>
            {t('orderDetail.placedOn', { date: placed })}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ padding: '5px 11px', borderRadius: 999, background: T.surface2, color: tone, font: `700 10px ${T.font}`, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {t(`orders.status.${statusKey}`, { defaultValue: status })}
            </span>
            {paid !== 'none' && (
              <span style={{ padding: '5px 11px', borderRadius: 999, background: T.surface2, color: T.textDim, font: `600 10px ${T.font}`, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                {t(`orderDetail.payment.${paid}`, { defaultValue: paid })}
              </span>
            )}
          </div>
        </div>

        <div style={card}>
          <div style={sectionTitle}>{t('orderDetail.items')}</div>
          {lines.length === 0 ? (
            <div style={{ font: `400 12.5px ${T.font}`, color: T.textMute }}>{t('orderDetail.noLines')}</div>
          ) : lines.map((l, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 13px ${T.font}`, color: T.text }}>{l.title}</div>
                {l.variant && (
                  <div style={{ ...rowLabel, marginTop: 3 }}>{l.variant}</div>
                )}
                <div style={{ ...rowLabel, marginTop: 3 }}>
                  {t('orderDetail.qtyAt', { count: l.quantity, price: money(l.price) })}
                </div>
              </div>
              <div style={{ font: `700 13px ${T.font}`, color: T.text, whiteSpace: 'nowrap' }}>
                {money(l.lineTotal)}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: `700 13px ${T.font}`, color: T.text }}>{t('orderDetail.total')}</span>
            <span style={{ font: `800 18px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{money(order.total)}</span>
          </div>
          {lines.length > 0 && Math.abs(linesTotal - (Number(order.total) || 0)) > 0.005 && (
            <div style={{ ...rowLabel, marginTop: 6 }}>
              {t('orderDetail.itemsSubtotal', { amount: money(linesTotal) })}
            </div>
          )}
        </div>

        {order.delivery && (
          <div style={card}>
            <div style={sectionTitle}>{t('orderDetail.deliverTo')}</div>
            <div style={{ font: `500 13px/1.6 ${T.font}`, color: T.textDim }}>
              {order.delivery.recipient && <div style={{ color: T.text, font: `600 13px ${T.font}` }}>{order.delivery.recipient}</div>}
              {order.delivery.phone && <div>{order.delivery.phone}</div>}
              {order.delivery.line && <div>{order.delivery.line}</div>}
              <div>
                {[order.delivery.city, order.delivery.postalCode, order.delivery.country]
                  .filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
        )}

        {order.store && (
          <div style={card}>
            <div style={sectionTitle}>{t('orderDetail.soldBy')}</div>
            <div style={{ font: `600 13px ${T.font}`, color: T.text }}>
              {order.store.displayName || order.store.name}
            </div>
            {order.store.tagline && (
              <div style={{ ...rowLabel, marginTop: 3 }}>{order.store.tagline}</div>
            )}
          </div>
        )}

        {error && (
          <div style={{ ...card, borderColor: T.danger }}>
            <div style={{ font: `500 12.5px/1.5 ${T.font}`, color: T.danger }}>{error}</div>
          </div>
        )}

        {/* Cancel is offered only while the server says it is still possible.
            Once a store has shipped or any payment has been taken, undoing the
            order is a conversation with the shop, not a button. */}
        {order.cancellable && (
          <div style={card}>
            <div style={sectionTitle}>{t('orderDetail.cancelTitle')}</div>
            <div style={{ font: `400 12.5px/1.6 ${T.font}`, color: T.textDim, marginBottom: 12 }}>
              {t('orderDetail.cancelBody')}
            </div>
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                style={{ height: 42, padding: '0 18px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${T.border}`, background: 'transparent', color: T.danger, font: `700 12.5px ${T.font}` }}
              >
                {t('orderDetail.cancelCta')}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={cancel}
                  disabled={cancelling}
                  style={{ height: 42, padding: '0 18px', borderRadius: 12, cursor: cancelling ? 'not-allowed' : 'pointer', border: 'none', background: cancelling ? T.surface2 : T.danger, color: cancelling ? T.textMute : '#fff', font: `700 12.5px ${T.font}` }}
                >
                  {cancelling ? t('orderDetail.cancelling') : t('orderDetail.cancelConfirm')}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={cancelling}
                  style={{ height: 42, padding: '0 18px', borderRadius: 12, cursor: 'pointer', border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, font: `600 12.5px ${T.font}` }}
                >
                  {t('orderDetail.cancelKeep')}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ padding: '14px 6px 8px' }}><PoweredBy T={T} /></div>
      </div>
    </GlowScreen>
  );
}
