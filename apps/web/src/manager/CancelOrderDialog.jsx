// Cancelling an order (the design's M7): what will happen, said before it does.
//
//   · the goods go back on the shelf — the server restocks a cancelled order,
//     variants included, if it had taken any (OrderService.releaseStock)
//   · the buyer is told by email; a cancellation is never texted
//   · money already paid does NOT come back by itself. Refunding is the
//     owner's own act (D2), so the owner may tick it here and both are sent —
//     the cancellation first, then the refund as a second request. A manager
//     is told the money waits for the owner.
//
// Offered only where the fulfilment chain allows it: placed or shipped.
// Copy comes from the `manager` namespace, under `cancel`.
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantApi, handleApiError } from '../utils/api';
import { money } from '../core/money';
import { track } from '../core/tokens';
import { Note } from '../core/primitives';
import { Icons } from '../core/icons';
// The sheet, the deep red and the short buyer name are shared with the ship
// and refund dialogs beside this one (M4, M5).
import { DEEP_RED, Sheet, shortName } from './officeKit';

const enumName = (s) => String(s || 'NONE').toUpperCase().replace(/ /g, '_');

const RefundGlyph = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9a8 8 0 1 1-1 6" />
    <path d="M4 4v5h5" />
  </svg>
);

/**
 * `order` is the detail screen's order; `refundable` what is still the
 * shopper's to get back (0 when nothing was paid by card). `onDone(order,
 * problem)` hands back the updated order — and, when the cancellation went
 * through but the refund did not, what to tell the owner.
 */
export default function CancelOrderDialog({ T, order, refundable, isOwner, isMobile, sub, onDone, onClose }) {
  const { t, i18n } = useTranslation('manager');
  const titleId = useId();
  const [refund, setRefund] = useState(true);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const status = enumName(order.status);
  const payment = enumName(order.paymentStatus);
  const owed = Number(refundable) || 0;
  const amount = money(owed);
  const canRefund = owed > 0 && isOwner;
  const sendRefund = canRefund && refund;

  const number = `#${order.orderNumber || order.id}`;
  const rest = [
    shortName(order.delivery?.recipient),
    t(`orders.status.${status.toLowerCase()}`, { defaultValue: status }),
    payment === 'PAID'
      ? t('cancel.paidBy', { amount: money(order.total) })
      : t(`orders.payment.${payment.toLowerCase()}`, { defaultValue: payment }),
  ].filter(Boolean).join(' · ');

  const rows = [
    { key: 'stock', icon: <Icons.box size={18} />, text: t('cancel.stock') },
    { key: 'email', icon: <Icons.mail size={18} />, text: t('cancel.email') },
    owed > 0 && {
      key: 'money', warn: true, icon: <RefundGlyph />,
      text: isOwner ? t('cancel.money', { amount }) : t('cancel.moneyManager', { amount }),
    },
  ].filter(Boolean);

  const shut = () => { if (!busy) onClose(); };

  const confirm = async () => {
    setBusy(true);
    setError('');
    let cancelled;
    try {
      cancelled = await tenantApi.updateOrderStatus(order.id, 'CANCELLED', sub);
    } catch (e) {
      setError(handleApiError(e, t('cancel.failed')));
      setBusy(false);
      return;
    }
    if (!sendRefund) {
      onDone(cancelled);
      onClose();
      return;
    }
    try {
      // Everything still refundable: the body carries no amount.
      const refunded = await tenantApi.refundOrder(order.id, '', sub);
      onDone({ ...cancelled, ...refunded });
    } catch (e) {
      // The cancellation stands. The refund can be sent again from the
      // order's payment card, so the page says what happened.
      const why = handleApiError(e, '');
      onDone(cancelled, why ? `${t('cancel.refundFailed')} ${why}` : t('cancel.refundFailed'));
    }
    onClose();
  };

  const ghostBtn = {
    height: 48, padding: '0 22px', borderRadius: 12, flex: 'none', cursor: busy ? 'default' : 'pointer',
    border: 'none', background: 'transparent', color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}`,
    font: `600 15px ${T.font}`, whiteSpace: 'nowrap', opacity: busy ? 0.55 : 1,
  };

  return (
    <Sheet T={T} isMobile={isMobile} titleId={titleId} onClose={shut}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 id={titleId} style={{
          margin: 0, font: `700 20px/1.22 ${T.font}`, color: T.text,
          letterSpacing: track(i18n.language, '-0.015em'),
        }}>{t('cancel.title')}</h2>
        <button
          type="button" onClick={shut} aria-label={t('cancel.close')}
          data-autofocus={isMobile ? '' : undefined}
          style={{
            width: 44, height: 44, flex: 'none', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: T.surface2, color: T.text, display: 'inline-grid', placeItems: 'center',
          }}
        ><Icons.x size={18} /></button>
      </div>

      <p style={{ margin: 0, font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>
        <span style={{ whiteSpace: 'nowrap' }}>{number}</span>
        {rest ? ` · ${rest}` : ''}
      </p>

      <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, background: T.surface, overflow: 'hidden', flex: 'none' }}>
        {rows.map((r, i) => (
          <div key={r.key} style={{
            display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, boxSizing: 'border-box',
            padding: '11px 16px', borderTop: i ? `1px solid ${T.border}` : 'none',
          }}>
            <span aria-hidden="true" style={{
              width: 34, height: 34, borderRadius: 12, flex: 'none', background: T.surface2,
              color: r.warn ? T.warn : T.text, display: 'grid', placeItems: 'center',
            }}>{r.icon}</span>
            <span style={{ flex: 1, minWidth: 0, font: `400 12.5px/1.45 ${T.font}`, color: T.text }}>{r.text}</span>
          </div>
        ))}
      </div>

      {canRefund && (
        <label style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 10, minHeight: 44,
          cursor: busy ? 'default' : 'pointer', font: `500 12.5px/1.45 ${T.font}`, color: T.text,
        }}>
          <input
            type="checkbox" checked={refund} disabled={busy}
            onChange={(e) => setRefund(e.target.checked)}
            // A ring for the keyboard only, as :focus-visible draws one.
            onFocus={(e) => setFocused(e.target.matches(':focus-visible'))} onBlur={() => setFocused(false)}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, margin: 0, pointerEvents: 'none' }}
          />
          <span aria-hidden="true" style={{
            width: 22, height: 22, borderRadius: 6, flex: 'none', boxSizing: 'border-box',
            display: 'grid', placeItems: 'center', color: T.onAccent,
            border: `2px solid ${refund ? T.accent : T.borderStr}`,
            background: refund ? T.accent : 'transparent',
            outline: focused ? `2px solid ${T.accent}` : 'none', outlineOffset: 2,
          }}>{refund && <Icons.check size={14} strokeWidth="3" />}</span>
          {t('cancel.refundToo', { amount })}
        </label>
      )}

      <p style={{ margin: 0, font: `400 12px/1.5 ${T.font}`, color: T.textDim }}>{t('cancel.rules')}</p>

      {error && <Note T={T} tone="danger">{error}</Note>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {/* A phone closes the sheet with its × or a tap outside it, so the
            design keeps the one button there. */}
        {!isMobile && (
          <button type="button" onClick={shut} disabled={busy} data-autofocus="" style={ghostBtn}>
            {t('cancel.keep')}
          </button>
        )}
        <button type="button" onClick={confirm} disabled={busy} style={{
          flex: 1, minWidth: 0, height: 48, padding: '0 22px', borderRadius: 12, border: 'none',
          background: DEEP_RED, color: '#fff', font: `600 15px ${T.font}`, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.55 : 1,
        }}>
          {sendRefund ? t('cancel.confirmRefund') : t('cancel.confirm')}
        </button>
      </div>
    </Sheet>
  );
}
