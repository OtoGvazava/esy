import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrdersContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useGlow } from '../styles/glow';
import { paymentApi, addressApi, deliveryApi, handleApiError } from '../utils/api';
import { GlowScreen, GlowTopNav, GlowStickyCTA, money } from '../components/glow/GlowChrome';
import PhoneVerifyBox from '../components/PhoneVerifyBox';

const devTenant = () => {
  try { return new URLSearchParams(window.location.search).get('tenant') || undefined; }
  catch { return undefined; }
};

function Field({ T, label, value, onChange, span }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: span ? 'span 2' : undefined }}>
      <span style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.dark ? T.surface2 : '#fff', color: T.text, font: `500 13px ${T.font}`, outline: 'none' }} />
    </div>
  );
}

export default function Checkout() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('storefront');
  const { items, getTotalPrice, clearCart } = useCart();
  const { createOrder } = useOrders();
  const { user } = useAuth();
  // Raw tenant (useGlow().tenant is the derived brand and has no
  // bogConfigured). Drives card-redirect vs the free-order fallback.
  const { tenant: store } = useTenant();
  const [placing, setPlacing] = useState(false);
  const [payError, setPayError] = useState('');

  // Delivery address (decision D4). Prefilled from the platform-wide address
  // book's default entry; whatever is submitted gets frozen onto the order
  // server-side, and a new inline address is saved to the book for next time.
  // Delivery routes the store actually offers (D9). An unconfigured store
  // still answers with collection in person, so this is never empty.
  const [routes, setRoutes] = useState([]);
  // Express is not a route. It is bought on top of a courier one, so it has
  // its own offer and its own checkbox rather than a place in the list.
  const [express, setExpress] = useState(null);
  const [wantExpress, setWantExpress] = useState(false);
  const [requiresAddress, setRequiresAddress] = useState(false);
  const [deliveryRoute, setDeliveryRoute] = useState('pickup');

  const [savedAddressId, setSavedAddressId] = useState(null);
  // Snapshot of the loaded saved address — "did the shopper change anything?"
  // is answered by value comparison, not a touched flag: a set-only flag would
  // treat a reverted keystroke as a new address and save a duplicate book row
  // on every such checkout.
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [line, setLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Delivery routes load for everyone, signed in or not — a guest still needs
  // to see what the shop offers before deciding to sign in.
  useEffect(() => {
    const ac = new AbortController();
    deliveryApi.listPublic(undefined, { signal: ac.signal })
      .then((res) => {
        if (ac.signal.aborted) return;
        const list = Array.isArray(res?.routes) ? res.routes : [];
        setRoutes(list);
        setExpress(res?.express || null);
        setRequiresAddress(!!res?.requiresAddress);
        // Preselect the cheapest route rather than the first: the shopper can
        // always pick a faster one, and defaulting to the dearest would charge
        // for a choice they never made.
        const cheapest = [...list].sort(
          (a, b) => Number(a.price ?? 0) - Number(b.price ?? 0))[0];
        if (cheapest) setDeliveryRoute(cheapest.route);
      })
      .catch(() => { /* falls back to PICKUP, which every store offers */ });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!recipient) setRecipient([user.firstName, user.lastName].filter(Boolean).join(' '));
    if (!phone && user.phoneNumber) setPhone(user.phoneNumber);
    addressApi.list()
      .then((list) => {
        const def = (list || []).find((a) => a.isDefault) || (list || [])[0];
        if (def) {
          setSavedAddressId(def.id);
          setSavedSnapshot({
            recipient: def.recipient || '', phone: def.phone || '', line: def.line || '',
            city: def.city || '', postalCode: def.postalCode || '',
          });
          setRecipient(def.recipient || '');
          setPhone(def.phone || '');
          setLine(def.line || '');
          setCity(def.city || '');
          setPostalCode(def.postalCode || '');
        }
      })
      .catch(() => { /* signed out or no book yet — the blank form is fine */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const addressComplete = recipient.trim() && phone.trim() && line.trim() && city.trim();

  const subtotal = getTotalPrice();
  const count = items.reduce((s, it) => s + it.quantity, 0);

  // Delivery (D9). The fee shown here is the store's own published price for
  // the chosen route; the server prices the order again from the same rows at
  // checkout, so a tampered browser cannot set its own delivery charge — this
  // number is for the shopper to read, never the one that is charged.
  const chosen = routes.find((r) => r.route === deliveryRoute);

  // Express is only on the table once a courier is chosen — there is nothing
  // to accelerate about collecting in person.
  const canExpress = !!express && !!chosen?.courier;
  const expressOn = canExpress && wantExpress;

  const deliveryFee = (() => {
    if (!chosen) return 0;
    const price = Number(chosen.price ?? 0);
    const freeOver = chosen.freeOverTotal == null ? null : Number(chosen.freeOverTotal);
    // The threshold frees the route, never the speed.
    const base = freeOver != null && subtotal >= freeOver ? 0 : price;
    return base + (expressOn ? Number(express.price ?? 0) : 0);
  })();

  // Only a courier route needs an address. With both couriers off the store
  // posts nothing, so checkout does not ask and does not block on it. Declared
  // before delivery() because that closure reads it.
  const needsAddress = requiresAddress && !!chosen?.courier;

  const delivery = () => {
    // The route is all the server needs to price delivery — it looks the fee
    // up from the store's own rows rather than trusting anything sent here.
    const base = { deliveryRoute, deliveryExpress: expressOn };

    // On collection there is nothing to post. Sending an address anyway would
    // freeze one onto an order nobody is delivering, and the server ignores it.
    if (!needsAddress) return base;

    const matchesSaved = savedAddressId != null && savedSnapshot
      && recipient.trim() === savedSnapshot.recipient
      && phone.trim() === savedSnapshot.phone
      && line.trim() === savedSnapshot.line
      && city.trim() === savedSnapshot.city
      && postalCode.trim() === savedSnapshot.postalCode;
    if (matchesSaved) return { ...base, addressId: savedAddressId };
    return { ...base, address: {
      recipient: recipient.trim(), phone: phone.trim(), line: line.trim(),
      city: city.trim(), postalCode: postalCode.trim() || null, country: null,
    } };
  };

  // The 2% platform service fee is computed/persisted server-side and billed
  // to the store later; it is invisible here and not added to the charge.
  const total = subtotal + deliveryFee;

  const email = user?.email || 'guest@esy.shop';
  // Ordering requires a complete profile AND a verified phone (the backend
  // enforces this too — see OrderController.requireOrderEligible), plus a
  // complete delivery address to freeze onto the order.
  const eligible = !!user && user.profileComplete && !!user.phoneVerified
    && (!needsAddress || !!addressComplete);

  if (items.length === 0) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('checkout.title')} onBack={() => navigate(-1)} />
        <div style={{ padding: '60px 24px', textAlign: 'center', color: T.textDim, font: `500 14px ${T.font}` }}>
          {t('checkout.emptyBag')}
          <div style={{ marginTop: 16 }}>
            <button onClick={() => navigate('/')} style={{ height: 44, padding: '0 20px', borderRadius: 999, border: 'none', background: T.grad, color: '#fff', font: `600 13px ${T.font}`, cursor: 'pointer' }}>{t('checkout.browse', { name: tenant.name })}</button>
          </div>
        </div>
      </GlowScreen>
    );
  }

  const pay = async () => {
    if (!eligible || placing) return;
    setPayError('');
    setPlacing(true);
    const cartItems = items.map((i) => ({ id: i.id, title: i.title, price: i.price, quantity: i.quantity }));

    // Stores that connected Bank of Georgia: create the order + BOG payment,
    // then hand the browser to the bank-hosted page. The cart is kept until
    // /pay/return confirms PAID (so an abandoned payment doesn't lose it).
    if (store?.bogConfigured) {
      try {
        const res = await paymentApi.checkout(cartItems, devTenant(), delivery());
        if (res?.redirectUrl) {
          window.location.href = res.redirectUrl;
          return; // leaving the SPA — keep the spinner
        }
        setPayError(t('checkout.payError'));
      } catch (e) {
        setPayError(handleApiError(e, t('checkout.payError')));
      }
      setPlacing(false);
      return;
    }

    // Fallback for stores without a payment provider: the previous
    // free-order flow (context posts /api/orders, order lives in the DB).
    const res = await createOrder({ items: cartItems, ...delivery() });
    setPlacing(false);
    if (!res?.success) return; // backend rejected — stay on checkout
    clearCart();
    navigate('/success', {
      replace: true,
      state: { orderId: res.order?.orderNumber || res.order?.id, total, count },
    });
  };

  return (
    <GlowScreen T={T} padBottom={170}>
      <GlowTopNav T={T} title={t('checkout.title')} onBack={() => navigate(-1)} right={<span style={{ font: `500 11px ${T.font}`, color: T.textMute, letterSpacing: '0.06em' }}>2/3</span>} />
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* stepper */}
        <div style={{ padding: '4px 22px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {[
            { id: 'contact', label: t('checkout.stepContact') },
            { id: 'shipping', label: t('checkout.stepShipping') },
            { id: 'payment', label: t('checkout.stepPayment') },
          ].map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < 2 ? 1 : '0 0 auto' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: i < 1 ? T.accent : i === 1 ? T.surface2 : T.surface2, color: i < 1 ? '#fff' : T.textDim, border: `1px solid ${i === 1 ? T.accent : T.border}`, font: `700 11px ${T.font}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i < 1 ? '✓' : i + 1}</span>
                <span style={{ font: `${i === 1 ? 700 : 500} 12px ${T.font}`, color: i <= 1 ? T.text : T.textMute }}>{s.label}</span>
              </div>
              {i < 2 && <span style={{ flex: 1, height: 1, background: i < 1 ? T.accent : T.border }} />}
            </div>
          ))}
        </div>

        {/* contact confirmed */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `700 11px ${T.font}` }}>✓</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('checkout.contact')}</div>
              <div style={{ font: `600 13px ${T.font}`, color: T.text }}>{email}</div>
            </div>
            <span style={{ font: `600 12.5px ${T.font}`, color: T.accentFg, cursor: 'pointer' }}>{t('checkout.edit')}</span>
          </div>
        </div>

        {/* delivery routes (D9) */}
        {(routes.length > 1 || canExpress) && (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ padding: '14px', borderRadius: 16, background: T.surface, border: `1.5px solid ${T.border}` }}>
              <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                {t('checkout.deliveryMethod')}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {routes.map((r) => {
                  const active = r.route === deliveryRoute;
                  const free = r.freeOverTotal != null && subtotal >= Number(r.freeOverTotal);
                  const eta = i18n.language === 'ka' ? r.etaKa : r.etaEn;
                  return (
                    <button
                      key={r.route} type="button" onClick={() => setDeliveryRoute(r.route)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                        padding: '11px 13px', borderRadius: 13, cursor: 'pointer',
                        border: `1.5px solid ${active ? T.accent : T.border}`,
                        background: active ? T.accentBg : 'transparent',
                      }}
                    >
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', font: `700 13px ${T.font}`, color: T.text }}>
                          {t(`checkout.route.${r.route}`)}
                        </span>
                        {(eta || r.pickupAddress) && (
                          <span style={{ display: 'block', font: `400 11.5px ${T.font}`, color: T.textMute, marginTop: 2 }}>
                            {[eta, r.pickupAddress].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      <span style={{ font: `700 12.5px ${T.font}`, color: free || !Number(r.price) ? T.success : T.text }}>
                        {free || !Number(r.price) ? t('checkout.free') : money(Number(r.price))}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* The upgrade, not a route: it appears only once a courier is
                  chosen, and its price reads as "+₾" because it is added to
                  the route above rather than replacing it. */}
              {canExpress && (
                <button
                  type="button"
                  onClick={() => setWantExpress((v) => !v)}
                  style={{
                    marginTop: 10, width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 13px', borderRadius: 13, cursor: 'pointer',
                    border: `1.5px solid ${expressOn ? T.accent : T.border}`,
                    background: expressOn ? T.accentBg : 'transparent',
                  }}
                >
                  <span style={{ color: expressOn ? T.accentFg : T.textMute, display: 'inline-flex' }}>
                    <Icon.check />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', font: `700 13px ${T.font}`, color: T.text }}>
                      {t('checkout.route.express')}
                    </span>
                    {(i18n.language === 'ka' ? express.etaKa : express.etaEn) && (
                      <span style={{ display: 'block', font: `400 11.5px ${T.font}`, color: T.textMute, marginTop: 2 }}>
                        {i18n.language === 'ka' ? express.etaKa : express.etaEn}
                      </span>
                    )}
                  </span>
                  <span style={{ font: `700 12.5px ${T.font}`, color: T.text, flexShrink: 0 }}>
                    +{money(Number(express.price ?? 0))}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* shipping form active — only when something is actually being posted */}
        {needsAddress && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ padding: '14px 14px 16px', borderRadius: 16, background: T.surface, border: `1.5px solid ${T.accent}` }}>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t('checkout.shippingAddress')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field T={T} label={t('checkout.recipient')} value={recipient} onChange={setRecipient} />
              <Field T={T} label={t('checkout.phone')} value={phone} onChange={setPhone} />
              <Field T={T} label={t('checkout.address')} value={line} onChange={setLine} span />
              <Field T={T} label={t('checkout.city')} value={city} onChange={setCity} />
              <Field T={T} label={t('checkout.zip')} value={postalCode} onChange={setPostalCode} />
            </div>
          </div>
        </div>
        )}

        {/* order eligibility: complete profile + verified phone */}
        {!eligible && (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ padding: 14, borderRadius: 16, background: T.surface, border: `1px solid ${T.danger}55`, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ font: `700 13px ${T.font}`, color: T.text }}>{t('checkout.verifyTitle')}</div>
              {!user ? (
                <>
                  <div style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{t('checkout.needSignIn')}</div>
                  <button onClick={() => navigate('/signin')} style={{ height: 42, borderRadius: 12, border: 'none', background: T.grad, color: '#fff', font: `700 13px ${T.font}`, cursor: 'pointer' }}>{t('checkout.signIn')}</button>
                </>
              ) : !user.profileComplete ? (
                <div style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{t('checkout.completeProfileHint')}</div>
              ) : !user.phoneNumber ? (
                <>
                  <div style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{t('checkout.needPhone')}</div>
                  <button onClick={() => navigate('/account')} style={{ height: 42, borderRadius: 12, border: 'none', background: T.grad, color: '#fff', font: `700 13px ${T.font}`, cursor: 'pointer' }}>{t('checkout.addPhone')}</button>
                </>
              ) : (
                <>
                  <div style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{t('checkout.verifyPhoneHint', { phone: user.phoneNumber })}</div>
                  <PhoneVerifyBox compact />
                </>
              )}
            </div>
          </div>
        )}

        {/* order summary */}
        <div style={{ padding: '0 22px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', font: `500 13px ${T.font}`, color: T.textDim }}><span>{t('checkout.itemCount', { count })}</span><span style={{ color: T.text }}>{money(subtotal)}</span></div>
          {/* Delivery is its own line — a total that silently absorbed it
              would leave the shopper unable to see what they are paying for. */}
          {chosen && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, font: `500 13px ${T.font}`, color: T.textDim }}>
              <span>{t(`checkout.route.${chosen.route}`)}{expressOn ? ` + ${t('checkout.route.express')}` : ''}</span>
              <span style={{ color: deliveryFee ? T.text : T.success }}>
                {deliveryFee ? money(deliveryFee) : t('checkout.free')}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span style={{ font: `700 14px ${T.font}`, color: T.text }}>{t('checkout.total')}</span><span style={{ font: `800 18px ${T.font}`, color: T.text }}>{money(total)}</span></div>
        </div>

        {store?.bogConfigured && eligible && !payError && (
          <div style={{ padding: '0 22px 14px', font: `500 11.5px ${T.font}`, color: T.textMute, textAlign: 'center' }}>
            {t('checkout.bogSecure')}
          </div>
        )}
        {payError && (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ padding: '11px 14px', borderRadius: 12, background: `${T.danger}14`, border: `1px solid ${T.danger}55`, color: T.danger, font: `600 12.5px ${T.font}` }}>
              {payError}
            </div>
          </div>
        )}
      </div>

      <GlowStickyCTA
        T={T}
        label={
          placing ? (store?.bogConfigured ? t('checkout.redirecting') : t('checkout.placing'))
            : !user ? t('checkout.signInToPay')
            : !user.profileComplete ? t('checkout.completeProfile')
            : !user.phoneVerified ? t('checkout.verifyToPay')
            : store?.bogConfigured ? t('checkout.payCard')
            : t('checkout.payNow')
        }
        sub={money(total)}
        onClick={pay}
        disabled={placing || !eligible}
      />
    </GlowScreen>
  );
}
