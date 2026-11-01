import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import { useGlow } from '../styles/glow';
import { orderApi, paymentApi } from '../utils/api';
import { money } from '../core/money';
import { channelHref } from '../core/channels';
import { G, Sk, initials, useStoreChannels } from '../components/shop/kit';

// The Bank of Georgia's hosted checkout sends the shopper back here
// (redirect_urls.success / fail) — the design's A8.
//
// The ?status hint is the bank's redirect, advisory only: the server's payment
// status decides, and it also reconciles through BOG's receipt API when the
// asynchronous callback has not landed yet (local dev, where BOG cannot reach
// the host). So this polls a few times to bridge the redirect and the callback.
//
// Four outcomes. PAID clears the bag and moves on to the placed order (A9).
// FAILED is the bank's refusal: nothing was charged, and the bag — which the
// round trip through the bank's page lost, it lives in memory — is put back
// from the order's lines, so "try again" and "back to the bag" have something
// to return to. Still PENDING when the polling runs out is NOT a failure: the
// money may yet arrive, so the shopper is told to check the order rather than
// to pay a second time. No order in the address is the plain failure.
//
// Like the rest of checkout's last steps the page is drawn without the store's
// menus (App.jsx): the shopper is asked to wait here, not to wander off.
const MAX_TRIES = 12;
const INTERVAL_MS = 1600;

const tick = (
  <span className="tl-d" style={{ background: 'var(--k-pri)', borderColor: 'var(--k-pri)' }}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
  </span>
);

export default function PayReturn() {
  const { tenant } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const { items, addToCart, clearCart } = useCart();
  const [params] = useSearchParams();
  const orderNumber = params.get('order');
  const bankSaidYes = params.get('status') === 'success';

  const [phase, setPhase] = useState(orderNumber ? 'checking' : 'failed'); // checking | failed | slow
  const [total, setTotal] = useState(null);
  const [restored, setRestored] = useState(false);
  const done = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const { whatsapp, phone } = useStoreChannels(phase !== 'checking');

  useEffect(() => {
    if (!orderNumber) return undefined;
    let alive = true;
    let tries = 0;

    const paid = (amount) => {
      if (done.current) return;
      done.current = true;
      clearCart();
      navigate('/success', { replace: true, state: { orderId: orderNumber, total: amount } });
    };

    // The bag went with the page to the bank; put the order's lines back into
    // it, once, unless the shopper has already started a new one.
    const restore = async () => {
      if (itemsRef.current.length > 0) { setRestored(true); return; }
      try {
        const order = await orderApi.get(orderNumber);
        const lines = (order?.lines || []).filter((l) => l.productId);
        if (!alive || lines.length === 0) return;
        lines.forEach((l) => addToCart({
          id: l.productId,
          variantId: l.variantId ?? undefined,
          variantLabel: l.variant || undefined,
          title: l.title,
          price: Number(l.price) || 0,
          image: l.imageUrl || undefined,
          thumbnail: l.imageUrl || undefined,
          quantity: l.quantity || 1,
        }));
        setRestored(true);
      } catch { /* the bag stays empty; the page says so */ }
    };

    const poll = async () => {
      tries += 1;
      try {
        const res = await paymentApi.status(orderNumber);
        if (!alive) return;
        if (res?.total != null) setTotal(res.total);
        const ps = res?.paymentStatus;
        if (ps === 'PAID') { paid(res?.total); return; }
        if (ps === 'FAILED' || ps === 'REFUNDED') {
          setPhase('failed');
          restore();
          return;
        }
      } catch {
        /* transient — keep polling within the budget */
      }
      if (!alive) return;
      if (tries >= MAX_TRIES) { setPhase('slow'); return; }
      setTimeout(poll, INTERVAL_MS);
    };

    poll();
    return () => { alive = false; };
    // addToCart and clearCart are new functions every render; the poll must
    // start once per order, not again on every bag change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, navigate]);

  const bagSaved = restored || items.length > 0;
  const contact = whatsapp ? (
    <a className="btn btn-s btn-sm" href={channelHref('whatsapp', whatsapp.value)} target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4A8 8 0 1 1 8 18.9z" /></svg>
      <span><Trans t={t} i18nKey="payReturn.whatsapp" components={{ nc: <span className="nc" /> }} /></span>
    </a>
  ) : phone ? (
    <a className="btn btn-s btn-sm" href={channelHref('phone', phone.value)}>
      <G name="phone" cls="" />
      {t('payReturn.call')}
    </a>
  ) : null;
  const help = (
    <div className="stk" style={{ gap: 10, alignItems: 'center' }}>
      <span className="xs dim">{orderNumber ? t('payReturn.help', { number: orderNumber }) : t('payReturn.helpPlain')}</span>
      {contact}
    </div>
  );

  return (
    <Sk style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="stk" style={{ gap: 22, width: '100%', maxWidth: 440, alignItems: 'center', textAlign: 'center' }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="av sm">{initials(tenant.name)}</span>
          <span className="dim" aria-hidden="true">{'→'}</span>
          <span className="av sm u" style={{ background: '#ff6a13', color: '#1a1a1a' }} role="img" aria-label={t('payReturn.bank')}>{'BoG'}</span>
        </div>

        {phase === 'checking' && (
          <>
            <span className="spin" role="img" aria-label={t('payReturn.inProgress')} />
            <div className="stk" style={{ gap: 8, alignItems: 'center' }} role="status">
              <h1 className="h1">{t('payReturn.checkingTitle')}</h1>
              <p className="dim">{t('payReturn.checkingBody')}</p>
            </div>
            {/* The steps only when the bank's redirect said it took the
                money: without that, "the bank took the payment" would be a
                guess. */}
            {bankSaidYes && (
              <div className="list" style={{ width: '100%', textAlign: 'left' }}>
                <div className="li">{tick}<span className="grow sm">{t('payReturn.stepBank')}</span></div>
                <div className="li">{tick}<span className="grow sm">{total != null ? t('payReturn.stepPaid', { amount: money(total) }) : t('payReturn.stepPaidPlain')}</span></div>
                <div className="li">
                  <span className="tl-d" style={{ borderColor: 'var(--k-pri)', boxShadow: '0 0 0 4px color-mix(in oklab, var(--k-pri) 22%, transparent)' }} />
                  <span className="grow sm"><b>{t('payReturn.stepStore')}</b></span>
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'failed' && (
          <>
            <span className="empty-ic" style={{ background: 'var(--k-bad-bg)', color: 'var(--k-bad)' }}><G name="x" /></span>
            <div className="stk" style={{ gap: 8, alignItems: 'center' }} role="alert">
              <h1 className="h1">{t('payReturn.failedTitle')}</h1>
              <p className="dim">{bagSaved ? t('payReturn.failedBody') : t('payReturn.failedBodyNoBag')}</p>
            </div>
            <div className="stk" style={{ gap: 10, width: '100%' }}>
              {bagSaved ? (
                <>
                  <button type="button" className="btn btn-p btn-lg btn-b" onClick={() => navigate('/checkout')}>{t('payReturn.retry')}</button>
                  <button type="button" className="btn btn-g btn-b" onClick={() => navigate('/cart')}>{t('payReturn.backToCart')}</button>
                </>
              ) : (
                <button type="button" className="btn btn-p btn-lg btn-b" onClick={() => navigate('/')}>{t('payReturn.keepShopping')}</button>
              )}
            </div>
            {help}
          </>
        )}

        {phase === 'slow' && (
          <>
            <span className="empty-ic" style={{ background: 'var(--k-warn-bg)', color: 'var(--k-warn)' }}><G name="clock" /></span>
            <div className="stk" style={{ gap: 8, alignItems: 'center' }} role="status">
              <h1 className="h1">{t('payReturn.slowTitle')}</h1>
              <p className="dim">{t('payReturn.slowBody')}</p>
            </div>
            <button type="button" className="btn btn-p btn-lg btn-b" onClick={() => navigate(`/orders/${encodeURIComponent(orderNumber)}`)}>{t('payReturn.viewOrder')}</button>
            {help}
          </>
        )}
      </div>
    </Sk>
  );
}
