import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import { useGlow } from '../styles/glow';
import { paymentApi } from '../utils/api';
import { GlowScreen } from '../components/glow/GlowChrome';

// Landing page for the BOG hosted-checkout return (redirect_urls.success/fail).
// The ?status hint is advisory; the server status is authoritative — it also
// reconciles via BOG's receipt API when the async callback hasn't arrived yet
// (e.g. local dev, where BOG can't reach the host). We poll a few times to
// bridge the gap between the browser redirect and the callback landing.
const MAX_TRIES = 12;
const INTERVAL_MS = 1600;

export default function PayReturn() {
  const { T } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const { clearCart } = useCart();
  const [params] = useSearchParams();
  const orderNumber = params.get('order');
  const hint = params.get('status'); // 'success' | 'fail'

  const [phase, setPhase] = useState('checking'); // checking | failed
  const cleared = useRef(false);

  useEffect(() => {
    if (!orderNumber) {
      setPhase('failed');
      return;
    }
    let alive = true;
    let tries = 0;

    const finishPaid = (total) => {
      if (cleared.current) return;
      cleared.current = true;
      clearCart();
      navigate('/success', {
        replace: true,
        state: { orderId: orderNumber, total },
      });
    };

    const poll = async () => {
      tries += 1;
      try {
        const res = await paymentApi.status(orderNumber);
        if (!alive) return;
        const ps = res?.paymentStatus;
        if (ps === 'PAID') return finishPaid(res?.total);
        if (ps === 'FAILED' || ps === 'REFUNDED') {
          setPhase('failed');
          return;
        }
      } catch {
        /* transient — keep polling within the budget */
      }
      if (!alive) return;
      if (tries >= MAX_TRIES) {
        // Still PENDING after the budget. If the bank told us it failed,
        // trust that; otherwise let the shopper recheck from their orders.
        setPhase('failed');
        return;
      }
      setTimeout(poll, INTERVAL_MS);
    };

    poll();
    return () => { alive = false; };
  }, [orderNumber, hint, clearCart, navigate]);

  const Spinner = () => (
    <div
      style={{
        width: 46, height: 46, borderRadius: '50%',
        border: `3px solid ${T.border}`, borderTopColor: T.accent,
        animation: 'esy-spin 0.8s linear infinite', margin: '0 auto',
      }}
    />
  );

  return (
    <GlowScreen T={T}>
      <style>{'@keyframes esy-spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '90px 24px', textAlign: 'center' }}>
        {phase === 'checking' ? (
          <>
            <Spinner />
            <div style={{ marginTop: 24, font: `700 18px ${T.font}`, color: T.text }}>
              {t('payReturn.checkingTitle')}
            </div>
            <div style={{ marginTop: 8, font: `500 13px/1.5 ${T.font}`, color: T.textDim }}>
              {t('payReturn.checkingBody')}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto',
                background: `${T.danger}1a`, color: T.danger,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: `700 32px ${T.font}`,
              }}
            >
              !
            </div>
            <div style={{ marginTop: 22, font: `700 19px ${T.font}`, color: T.text }}>
              {t('payReturn.failedTitle')}
            </div>
            <div style={{ marginTop: 8, font: `500 13px/1.5 ${T.font}`, color: T.textDim }}>
              {t('payReturn.failedBody')}
            </div>
            <div style={{ marginTop: 26, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/cart')}
                style={{ height: 46, padding: '0 20px', borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface, color: T.text, font: `600 13px ${T.font}`, cursor: 'pointer' }}
              >
                {t('payReturn.backToCart')}
              </button>
              <button
                onClick={() => navigate('/orders')}
                style={{ height: 46, padding: '0 20px', borderRadius: 12, border: 'none', background: T.grad, color: '#fff', font: `700 13px ${T.font}`, cursor: 'pointer' }}
              >
                {t('payReturn.viewOrders')}
              </button>
            </div>
          </>
        )}
      </div>
    </GlowScreen>
  );
}
