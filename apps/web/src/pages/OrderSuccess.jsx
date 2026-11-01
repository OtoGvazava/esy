import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { orderApi, deliveryApi } from '../utils/api';
import { money } from '../core/money';
import { G, Sk, Thumb, dayTime, useDev } from '../components/shop/kit';

// The order is in (the design's A9). Reached from checkout for a store that
// arranges payment itself, and from the bank's return page once it is paid —
// both hand over the order number, and everything else on the page is read
// back from the order: its state, the lines, how it travels and where.
//
// Without an order number there is nothing true to say, so the page sends the
// shopper to their orders rather than invent one (it used to print a number
// made from the clock).
//
// What the order does not record is not drawn: the card's brand and last
// digits (the bank keeps them), or a delivery date. The time it takes is the
// store's own estimate for the route, when it has given one.
const COURIER = ['tbilisi', 'georgia'];

export default function OrderSuccess() {
  const navigate = useNavigate();
  const dev = useDev();
  const { t, i18n } = useTranslation('storefront');
  const { user } = useAuth();
  const { state } = useLocation();
  const number = state?.orderId ? String(state.orderId) : '';
  const [order, setOrder] = useState(null);
  const [routes, setRoutes] = useState(null);

  useEffect(() => {
    if (!number) return undefined;
    const ac = new AbortController();
    orderApi.get(number).then((o) => { if (!ac.signal.aborted) setOrder(o); }).catch(() => {});
    deliveryApi.listPublic(undefined, { signal: ac.signal })
      .then((r) => { if (!ac.signal.aborted) setRoutes(r); }).catch(() => {});
    return () => ac.abort();
  }, [number]);

  if (!number) return <Navigate to="/orders" replace />;

  const ka = i18n.language === 'ka';
  const name = (user?.firstName || '').trim();
  const lines = Array.isArray(order?.lines) ? order.lines : [];
  const count = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0) || state?.count || 0;
  const total = order?.total ?? state?.total;
  const pay = String(order?.paymentStatus || '').toLowerCase();
  const route = order?.deliveryRoute || '';
  const option = (routes?.routes || []).find((r) => r.route === (order?.deliveryExpress ? 'express' : route));
  const eta = option ? ((ka ? option.etaKa : option.etaEn) || '') : '';
  const routeName = order?.deliveryExpress ? t('checkout.flow.routeName.express')
    : route ? t(`checkout.flow.routeName.${route}`, { defaultValue: '' }) : '';
  const address = order?.delivery
    ? [order.delivery.city, order.delivery.line].filter(Boolean).join(', ')
    : (route === 'pickup' ? (option?.pickupAddress || '') : '');
  // A courier brings it, so the estimate reads "arrives in"; a pickup keeps
  // the route's name with the address and its time under it.
  const courier = COURIER.includes(route) || !!order?.deliveryExpress;
  const deliveryTitle = courier && eta ? t('success.eta', { eta }) : (routeName || address);
  const deliverySub = courier && eta
    ? [routeName, address].filter(Boolean).join(' · ')
    : (routeName ? [address, eta].filter(Boolean).join(' · ') : '');
  const wrap = dev === 'ph' ? '24px 16px 40px' : dev === 'tab' ? '120px 28px 48px' : '56px 48px 48px';

  return (
    <Sk style={{ minHeight: '100vh' }}>
      <div style={{ padding: wrap }}>
        <div className="stk" style={{ gap: 22, width: '100%', maxWidth: 520, margin: '0 auto' }}>
          <div className="stk" style={{ gap: 12, alignItems: 'center', textAlign: 'center' }}>
            <span className="empty-ic" style={{ background: 'var(--k-ok-bg)', color: 'var(--k-ok)' }}><G name="check" style={{ strokeWidth: 2.4 }} /></span>
            <h1 className="h1">{name ? t('success.title', { name }) : t('success.titlePlain')}</h1>
            <p className="dim" style={{ textWrap: 'balance' }}>
              <Trans t={t} i18nKey="success.body" values={{ number }} components={{ num: <b className="num" style={{ color: 'var(--k-fg)' }} /> }} />
            </p>
          </div>

          {order && (
            <div className="card padl stk" style={{ gap: 14 }}>
              <div className="rowb">
                {pay === 'paid'
                  ? <span className="chip c-conf">{t('orderDetail.payment.paid')}</span>
                  : <span className="chip c-pend">{t('orders.status.placed')}</span>}
                <span className="sm dim">{dayTime(t, order.placed)}</span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                {lines.slice(0, 3).map((l, i) => <Thumb key={i} i={i + 1} src={l.imageUrl} alt={l.title} />)}
                <span className="sm dim grow">{t('success.itemCount', { count })}</span>
                <b className="price">{money(total)}</b>
              </div>
              <div className="sep" />
              {deliveryTitle && (
                <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <span className="li-ic"><G name={courier ? 'truck' : 'pin'} cls="" /></span>
                  <div className="grow">
                    <b className="sm">{deliveryTitle}</b>
                    {deliverySub && <div className="xs dim">{deliverySub}</div>}
                  </div>
                </div>
              )}
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <span className="li-ic"><G name={pay === 'paid' ? 'card' : 'store'} cls="" /></span>
                <div className="grow">
                  <b className="sm">{pay === 'paid' ? t('success.paidCard') : t('checkout.flow.storeTitle')}</b>
                  <div className="xs dim">{pay === 'paid' ? t('success.bank') : t('success.payLaterSub')}</div>
                </div>
              </div>
            </div>
          )}

          <div className="stk" style={{ gap: 10 }}>
            <button type="button" className="btn btn-p btn-lg btn-b" onClick={() => navigate(`/orders/${encodeURIComponent(number)}`)}>{t('success.track')}</button>
            <button type="button" className="btn btn-g btn-b" onClick={() => navigate('/')}>{t('success.keepShopping')}</button>
          </div>
          <p className="xs dim" style={{ textAlign: 'center' }}>{t('success.note')}</p>
        </div>
      </div>
    </Sk>
  );
}
