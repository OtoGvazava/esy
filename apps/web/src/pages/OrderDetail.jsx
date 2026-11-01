import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useOrders } from '../contexts/OrdersContext';
import { TenantContext } from '../contexts/TenantContext';
import { orderApi, deliveryApi } from '../utils/api';
import { money } from '../core/money';
import { channelHref } from '../core/channels';
import { BackTop, DeskTitle, G, Sk, Thumb, dayTime, phoneText, useDev, useStoreChannels } from '../components/shop/kit';

// One order, for the shopper (the design's C2, and C3 once it is cancelled
// and the money is going back). It fetches by order number rather than reading
// the list out of context, so a link to an order survives a cold page load.
//
// Everything on it is what the order records: the status and the payment
// status (separate, as in the back office), when it was placed, the lines, the
// route and what it cost, the address, and how much has been refunded. What it
// does not record is left out rather than made up — a time for each later
// step, a tracking code, the card's last digits, a delivery date, the reason a
// store cancelled. A paid order can only have been cancelled by the store (a
// shopper may cancel only before paying), so that much the page can say.
//
// This is also the only place shopper self-cancel (D1) is reachable, while the
// server says the order is still cancellable.
const COURIER = ['tbilisi', 'georgia'];
const FLOW = ['placed', 'shipped', 'out_for_delivery', 'delivered'];
const checkSvg = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const xSvg = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;

function Step({ state, title, sub, children }) {
  return (
    <div className={`tl-i${state === 'todo' ? '' : ` ${state}`}`}>
      <span className="tl-d">{state === 'done' ? checkSvg : state === 'bad' ? xSvg : null}</span>
      <div>
        <b className={state === 'todo' ? 'sm dim' : 'sm'}>{title}</b>
        {sub && <div className="xs dim">{sub}</div>}
        {children}
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const dev = useDev();
  const { t, i18n } = useTranslation('storefront');
  const { refresh } = useOrders();
  const { tenant } = useContext(TenantContext);

  const [order, setOrder] = useState(null);
  const [routes, setRoutes] = useState(null);
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
  useEffect(() => {
    const ac = new AbortController();
    deliveryApi.listPublic(undefined, { signal: ac.signal }).then((r) => { if (!ac.signal.aborted) setRoutes(r); }).catch(() => {});
    return () => ac.abort();
  }, []);

  // The store's own channels answer "a question about the order?" — only when
  // the order is from the store this page is on; another store's order is
  // reached from that store.
  const sameStore = !!order?.store?.subdomain && order.store.subdomain === tenant?.subdomain;
  const { whatsapp, phone } = useStoreChannels(sameStore);

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

  const id = String(order?.orderNumber || orderNumber || '');
  const title = t('orderDetail.title', { number: id });
  const toOrders = () => navigate('/orders');
  const top = dev === 'desk' ? null : <BackTop title={title} onBack={toOrders} backLabel={t('orderDetail.back')} />;
  const deskTitle = dev === 'desk' ? <DeskTitle title={title} back={t('orderDetail.backToOrders')} onBack={toOrders} /> : null;
  const wrap = dev === 'ph' ? { padding: '8px 16px 40px' }
    : dev === 'tab' ? { padding: '10px 28px 48px' }
      : { display: 'flex', flexDirection: 'column', gap: 18, padding: '28px 120px 56px', maxWidth: 1440, margin: '0 auto' };

  if (loading || !order) {
    return (
      <Sk style={{ minHeight: '100vh' }}>
        {top}
        <div style={wrap}>
          {deskTitle}
          {loading ? (
            <p className="dim" role="status" style={{ textAlign: 'center', padding: '48px 0' }}>{t('orderDetail.loading')}</p>
          ) : (
            <div className="empty" style={{ maxWidth: 460, margin: '0 auto', gap: 14 }}>
              <span className="empty-ic"><G name="bag" /></span>
              <h2 className="h1">{t('orderDetail.notFoundTitle')}</h2>
              <p className="dim">{error || t('orderDetail.notFoundBody')}</p>
              <button type="button" className="btn btn-p btn-lg" onClick={toOrders}>{t('orderDetail.backToOrders')}</button>
            </div>
          )}
        </div>
      </Sk>
    );
  }

  const ka = i18n.language === 'ka';
  const status = String(order.status || 'placed').toLowerCase().replace(/ /g, '_');
  const pay = String(order.paymentStatus || 'none').toLowerCase();
  const lines = Array.isArray(order.lines) ? order.lines : [];
  const itemsSum = lines.reduce((s, l) => s + (Number(l.lineTotal) || 0), 0);
  const total = Number(order.total) || 0;
  const refunded = Number(order.refunded) || 0;
  const refund = pay === 'refund_pending' || pay === 'refunded';
  const cancelled = status === 'cancelled';
  const paidOnce = pay === 'paid' || refund;
  const route = order.deliveryRoute || '';
  const courier = COURIER.includes(route) || !!order.deliveryExpress;
  const option = (routes?.routes || []).find((r) => r.route === (order.deliveryExpress ? 'express' : route));
  const eta = option ? ((ka ? option.etaKa : option.etaEn) || '') : '';
  const routeName = order.deliveryExpress ? t('checkout.flow.routeName.express')
    : route ? t(`checkout.flow.routeName.${route}`, { defaultValue: '' }) : '';
  const placedAt = dayTime(t, order.placed);

  // ── the status card ──
  const headTitle = refund ? t(`orderDetail.status.${pay}`) : t(`orderDetail.status.${status}`, { defaultValue: status });
  const headSub = pay === 'refund_pending' ? t('orderDetail.sub.refund_pending')
    : pay === 'refunded' ? t('orderDetail.sub.refunded', { amount: money(refunded || total) })
      : status === 'placed' ? t('orderDetail.sub.placed')
        : status === 'shipped' && courier && eta ? t('orderDetail.sub.shippedEta', { eta })
          : status === 'out_for_delivery' && courier ? t('orderDetail.sub.out_for_delivery')
            : '';
  // Payment beside the status where it is news: waiting, failed, or coming back.
  const payChip = refund
    ? <span className={`chip pay ${pay === 'refunded' ? 'c-done' : 'c-pend'}`}>{t(`orderDetail.payment.${pay}`)}</span>
    : pay === 'pending' || pay === 'failed'
      ? <span className={`chip pay ${pay === 'failed' ? 'c-ref' : 'c-pend'}`}>{t(`orderDetail.payment.${pay}`)}</span>
      : null;
  const chips = (cancelled || payChip) && (
    <div className="row wrap" style={{ gap: 6 }}>
      {cancelled && <span className="chip c-ref">{t('orderDetail.step.cancelled')}</span>}
      {payChip}
    </div>
  );

  let steps;
  if (cancelled && paidOnce) {
    const full = refunded > 0 && Math.abs(refunded - total) < 0.005;
    steps = [
      <Step key="paid" state="done" title={t('orderDetail.step.paidAmount', { amount: money(total) })} sub={placedAt} />,
      <Step key="cancelled" state="bad" title={t('orderDetail.step.cancelled')} sub={t('orderDetail.byStore')} />,
      ...(refund ? [
        <Step key="refund" state="done" title={t('orderDetail.step.refundStarted')} sub={refunded > 0 ? (full ? t('orderDetail.refundFull', { amount: money(refunded) }) : money(refunded)) : ''} />,
        pay === 'refunded'
          ? <Step key="back" state="done" title={t('orderDetail.step.refundDone')} />
          : <Step key="bank" state="now" title={t('orderDetail.step.refundPending')} sub={t('orderDetail.refundEmail')} />,
      ] : []),
    ];
  } else if (cancelled) {
    steps = [
      <Step key="placed" state="done" title={t('orderDetail.step.placed')} sub={placedAt} />,
      <Step key="cancelled" state="bad" title={t('orderDetail.step.cancelled')} />,
    ];
  } else {
    const at = Math.max(0, FLOW.indexOf(status));
    steps = FLOW.map((s, i) => {
      const state = i < at || status === 'delivered' ? 'done' : i === at ? 'now' : 'todo';
      const sub = s === 'placed' ? [placedAt, pay === 'paid' ? t('orderDetail.paidByCard') : ''].filter(Boolean).join(' · ')
        : s === 'out_for_delivery' && courier && i > at ? t('orderDetail.courierCalls') : '';
      return <Step key={s} state={state} title={t(`orderDetail.step.${s}`)} sub={sub} />;
    });
  }

  const statusCard = (
    <div className="card padl stk" style={{ gap: 16 }}>
      <div className="row wrap" style={{ gap: '10px 16px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h2 className="h2">{headTitle}</h2>
          {headSub && <div className="sm dim">{headSub}</div>}
        </div>
        {chips}
      </div>
      {cancelled && paidOnce && (
        <div className="alert warn">
          <G name="info" />
          <span className="sm"><Trans t={t} i18nKey="orderDetail.cancelledByStore" components={{ b: <b /> }} /></span>
        </div>
      )}
      <div className="tl">{steps}</div>
    </div>
  );

  const items = lines.length > 0 && (
    <div className="list">
      {lines.map((l, i) => (
        <div key={i} className="li">
          <Thumb i={i + 1} src={l.imageUrl} alt={l.title} />
          <div className="grow">
            <b className="sm">{l.title}</b>
            <div className="xs dim">{[l.variant, t('orderDetail.qty', { count: Number(l.quantity) || 1 })].filter(Boolean).join(' · ')}</div>
          </div>
          {refund ? (
            <span className="stk" style={{ gap: 0, alignItems: 'flex-end' }}>
              <span className="price">{money(l.lineTotal)}</span>
              <span className="xs dim">{pay === 'refunded' ? t('orderDetail.returned') : t('orderDetail.willReturn')}</span>
            </span>
          ) : <span className="price">{money(l.lineTotal)}</span>}
        </div>
      ))}
    </div>
  );

  const fee = order.deliveryFee == null ? null : Number(order.deliveryFee);
  const d = order.delivery;
  const summary = (
    <div className="card padl stk" style={{ gap: 10 }}>
      {refund ? (
        <>
          <div className="kv sm"><span className="dim">{t('orderDetail.paid')}</span><span className="price">{money(total)}</span></div>
          <div className="kv"><b>{pay === 'refunded' ? t('orderDetail.refundedTotal') : t('orderDetail.toRefund')}</b><b className="price lg">{money(refunded || total)}</b></div>
          <div className="sep" />
          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <span className="li-ic"><G name="card" cls="" /></span>
            <div><b className="sm">{t('success.paidCard')}</b><div className="xs dim">{pay === 'refunded' ? t('orderDetail.cardSubDone') : t('orderDetail.cardSubPending')}</div></div>
          </div>
        </>
      ) : (
        <>
          <div className="kv sm"><span className="dim">{t('orderDetail.items')}</span><span className="price">{money(itemsSum)}</span></div>
          {routeName && fee != null && (
            <div className="kv sm">
              <span className="dim">{t('orderDetail.delivery', { route: routeName })}</span>
              {fee > 0 ? <span className="price">{money(fee)}</span> : <span className="okt">{t('orderDetail.free')}</span>}
            </div>
          )}
          <div className="kv"><b>{pay === 'paid' ? t('orderDetail.paid') : t('orderDetail.total')}</b><b className="price lg">{money(total)}</b></div>
          {d && (
            <>
              <div className="sep" />
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <span className="li-ic"><G name="pin" cls="" /></span>
                <div className="grow">
                  {d.recipient && <b className="sm">{d.recipient}</b>}
                  <div className="xs dim">{[d.city, d.line].filter(Boolean).join(', ')}</div>
                  {d.phone && <div className="xs dim num" style={{ whiteSpace: 'nowrap' }}>{phoneText(d.phone)}</div>}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

  const storeName = order.store?.displayName || order.store?.name || '';
  const contact = sameStore && (whatsapp || phone) && (
    <div className="card padl stk" style={{ gap: 12 }}>
      <h3 className="h3">{t('orderDetail.questionTitle')}</h3>
      {storeName && <p className="sm dim">{t('orderDetail.questionBody', { name: storeName })}</p>}
      {whatsapp && (
        <a className={`btn ${cancelled ? 'btn-g' : 'btn-p'} btn-b`} href={channelHref('whatsapp', whatsapp.value)} target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4A8 8 0 1 1 8 18.9z" /></svg>
          <span><Trans t={t} i18nKey="orderDetail.whatsapp" components={{ nc: <span className="nc" /> }} /></span>
        </a>
      )}
      {phone && !cancelled && (
        <a className={`btn ${whatsapp ? 'btn-g' : 'btn-p'} btn-b`} href={channelHref('phone', phone.value)}>
          <G name="phone" cls="" />{t('orderDetail.call')}
        </a>
      )}
    </div>
  );

  // Self-cancel, while the server says it is still possible (D1). Once a store
  // has shipped or any payment has been taken, undoing the order is a
  // conversation with the shop, not a button.
  const cancelCard = order.cancellable && (
    <div className="card padl stk" style={{ gap: 12 }}>
      <h3 className="h3">{t('orderDetail.cancelTitle')}</h3>
      <p className="sm dim">{t('orderDetail.cancelBody')}</p>
      {!confirming ? (
        <button type="button" className="btn btn-d btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirming(true)}>{t('orderDetail.cancelCta')}</button>
      ) : (
        <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="btn btn-bad btn-sm" disabled={cancelling} onClick={cancel}>
            {cancelling ? t('orderDetail.cancelling') : t('orderDetail.cancelConfirm')}
          </button>
          <button type="button" className="btn btn-g btn-sm" disabled={cancelling} onClick={() => setConfirming(false)}>{t('orderDetail.cancelKeep')}</button>
        </div>
      )}
    </div>
  );
  // A cancelled order points back into the shop it came from — the store's
  // home: the line does not record the product's category.
  const similar = (block) => cancelled && sameStore && (
    <button type="button" className={`btn btn-p${block ? ' btn-b' : ''}`} style={block ? undefined : { alignSelf: 'flex-start' }} onClick={() => navigate('/')}>
      {t('orderDetail.similar')}
    </button>
  );

  const cols = dev === 'ph' ? { display: 'flex', flexDirection: 'column', gap: 16 }
    : { display: 'flex', gap: dev === 'tab' ? 20 : 32, alignItems: 'flex-start' };
  const left = dev === 'ph' ? { gap: 16 } : { gap: dev === 'tab' ? 16 : 18, flex: 1, minWidth: 0 };
  const right = dev === 'ph' ? { gap: 16 } : { gap: dev === 'tab' ? 16 : 18, width: dev === 'tab' ? 300 : 400, flex: 'none' };

  return (
    <Sk style={{ minHeight: '100vh' }}>
      {top}
      <div style={wrap}>
        {deskTitle}
        <div style={cols}>
          <div className="stk" style={left}>
            {statusCard}
            {items}
            {dev !== 'ph' && similar(false)}
          </div>
          <div className="stk" style={right}>
            {summary}
            {contact}
            {cancelCard}
            {error && <div className="alert bad" role="alert"><G name="warn" /><span className="sm">{error}</span></div>}
            {dev === 'ph' && similar(true)}
          </div>
        </div>
      </div>
    </Sk>
  );
}
