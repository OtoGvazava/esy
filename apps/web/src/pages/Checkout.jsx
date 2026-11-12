// /checkout — the two steps after the bag (the design's A6 and A7).
//
//   Step 2 · Delivery     who receives it, how (the store's routes), where.
//   Step 3 · Review, pay  the same facts read back, the items, the payment
//                         method, and the one button that pays.
//
// The step lives in the URL (?step=review), so the browser's back button
// walks back through it. Step 3 is only reachable with everything step 2
// asks for; arriving there without it (a reload, a pasted link) lands back
// on step 2.
//
// On a phone and a tablet the total and the action sit in a floating bar at
// the bottom, clear of the store's menu (useBottomClearance); on a desktop
// they sit in the summary card beside the form.
//
// Nothing about the money is decided here. Delivery is priced by the server
// from the store's own routes, card payment happens on the Bank of Georgia's
// page, and a store without card payments takes the order and arranges
// payment itself. The 2% platform fee is the store's, never the shopper's.
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useCart, lineKey } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrdersContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useDevice } from '../contexts/DeviceContext';
import { useGlow } from '../styles/glow';
import { paymentApi, handleApiError } from '../utils/api';
import { addressesQuery, publicDeliveryQuery } from '../core/query/queries';
import { money } from '../core/money';
import { alpha } from '../core/tokens';
import { useBottomClearance, useDesign } from '../core/design/useDesign';
import { platformUrl } from '../utils/hosts';
import { hubUrl } from '../components/account/hub';
import PhoneVerifyBox from '../components/PhoneVerifyBox';
import { markIfComplete, markLoaded } from '../core/imgFade';

const devTenant = () => {
  try { return new URLSearchParams(window.location.search).get('tenant') || undefined; }
  catch { return undefined; }
};

// ─── Glyphs (the boards' own paths) ─────────────────────────────────────────
const PATHS = {
  back: <path d="M15 5 8 12l7 7" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  pin: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  truck: <><path d="M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  user: <><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c1.5-4 4.3-5.5 7.5-5.5s6 1.5 7.5 5.5" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  store: <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5" />,
  bag: <><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
};

function G({ name, size = 20, style }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      style={{ flex: 'none', strokeWidth: 'var(--k-ic-w, 1.8)', ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────────────
const digits = (p) => String(p || '').replace(/\D/g, '');

/** A Georgian mobile as the design writes it, "+995 555 12 34 56"; anything else as typed. */
function phoneText(p) {
  const m = digits(p).match(/^(?:995)?(5\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+995 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : String(p || '').trim();
}

const samePhone = (a, b) => {
  const x = digits(a).slice(-9);
  return x.length === 9 && x === digits(b).slice(-9);
};

// Latin letters only: toUpperCase() would turn Georgian into Mtavruli capitals.
const initials = (name) => String(name || '').trim().split(/\s+/).slice(0, 2)
  .map((w) => w.charAt(0)).join('').replace(/[a-z]/g, (c) => c.toUpperCase());

// ─── Pieces ─────────────────────────────────────────────────────────────────
const cardStyle = (T) => ({
  background: T.surface, border: 'var(--k-card-bd)', boxShadow: 'var(--k-card-sh)',
  borderRadius: 'var(--k-r-card)',
});

const floatStyle = {
  background: 'var(--k-fl-bg)', border: 'var(--k-fl-bd)', boxShadow: 'var(--k-fl-sh)',
  backdropFilter: 'var(--k-fl-blur, none)', WebkitBackdropFilter: 'var(--k-fl-blur, none)',
};

function IconTile({ T, name, tone }) {
  return (
    <span style={{
      width: 34, height: 34, borderRadius: 'var(--k-r-in)', background: T.surface2, flex: 'none',
      display: 'grid', placeItems: 'center', color: tone || T.text,
    }}>
      <G name={name} size={18} />
    </span>
  );
}

function Label({ T, children }) {
  return <span style={{ font: `600 12px/1.2 ${T.font}`, color: T.textDim }}>{children}</span>;
}

/** The three-part progress line and "Step 2 / 3 · Delivery" under it. */
function Steps({ T, n, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div aria-hidden="true" style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3].map((i) => (
          <i key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= n ? T.accent : T.border }} />
        ))}
      </div>
      <span style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{label}</span>
    </div>
  );
}

function Field({ T, id, label, value, onChange, error, autoComplete, inputMode, style }) {
  const [focus, setFocus] = useState(false);
  return (
    <label htmlFor={id} style={{
      display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0,
      font: `500 12.5px ${T.font}`, color: T.textDim, ...style,
    }}>
      {label}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? 'true' : undefined}
        style={{
          width: '100%', boxSizing: 'border-box', height: 50, padding: '0 15px', outline: 'none',
          borderRadius: 'var(--k-r-in)', background: 'var(--k-in-bg)', color: T.text, font: `400 15px ${T.font}`,
          border: `1.5px solid ${error ? T.danger : focus ? T.accent : 'var(--k-in-bd)'}`,
          boxShadow: focus && !error ? `0 0 0 4px ${alpha(T.accent, 0.18)}` : 'none',
        }}
      />
      {error && <span style={{ font: `500 12px ${T.font}`, color: T.danger }}>{error}</span>}
    </label>
  );
}

/** One way to receive the order: radio, icon, name and detail, price. */
function Option({ T, on, icon, name, sub, price, onClick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px',
        textAlign: 'left', cursor: 'pointer', font: 'inherit', color: T.text, boxSizing: 'border-box',
        borderRadius: 'var(--k-r-card)', background: T.surface,
        border: `1.5px solid ${on ? T.accent : T.border}`,
        boxShadow: on ? `0 0 0 3px ${alpha(T.accent, 0.14)}` : 'none',
      }}
    >
      <span aria-hidden="true" style={{
        width: 22, height: 22, borderRadius: '50%', boxSizing: 'border-box', flex: 'none', background: T.surface,
        border: on ? `7px solid ${T.accent}` : `2px solid ${T.border}`,
      }} />
      <IconTile T={T} name={icon} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}` }}>{name}</b>
        {sub && <span style={{ display: 'block', font: `400 12px/1.4 ${T.font}`, color: T.textDim }}>{sub}</span>}
      </span>
      {price}
    </button>
  );
}

/** The product photo, or the theme's placeholder tile when there is none (or it fails to load). */
function Thumb({ item }) {
  const src = item.image || item.thumbnail;
  const [ok, setOk] = useState(Boolean(src));
  return (
    <span style={{
      width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flex: 'none',
      display: 'grid', placeItems: 'center', background: 'var(--k-ph2)', color: 'var(--k-ph2f)',
    }}>
      {src && ok ? (
        <img src={src} alt="" className="esy-img" ref={markIfComplete} onLoad={markLoaded} onError={() => setOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <G name="bag" size={24} />
      )}
    </span>
  );
}

function ItemRow({ T, t, item }) {
  const detail = [item.variantLabel, t('checkout.flow.qty', { count: item.quantity })].filter(Boolean).join(' · ');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Thumb item={item} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}`, color: T.text, overflowWrap: 'anywhere' }}>{item.title}</b>
        <div style={{ font: `400 12px/1.4 ${T.font}`, color: T.textDim }}>{detail}</div>
      </div>
      <span style={{ font: `600 13.5px ${T.font}`, color: T.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {money(Number(item.price) * item.quantity)}
      </span>
    </div>
  );
}

function Kv({ T, label, value, strong, valueStyle }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '5px 0' }}>
      <span style={{ font: strong ? `700 14px ${T.font}` : `500 12.5px ${T.font}`, color: strong ? T.text : T.textDim }}>{label}</span>
      <span style={{
        font: strong ? `700 16px ${T.font}` : `600 12.5px ${T.font}`, color: T.text,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...valueStyle,
      }}>
        {value}
      </span>
    </div>
  );
}

/** A text link that is still a 44px target on a phone. */
function LinkBtn({ T, phone, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 'none', background: 'transparent', cursor: 'pointer', flex: 'none',
        padding: phone ? '12px 0' : '4px 0', margin: phone ? '-12px 0' : 0,
        color: T.accentFg, font: `600 12.5px ${T.font}`,
      }}
    >
      {children}
    </button>
  );
}

export default function Checkout() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { t, i18n } = useTranslation('storefront');
  const ka = String(i18n.language || '').startsWith('ka');
  const { isDesktop, isMobile } = useDevice();
  const clearance = useBottomClearance();
  const { theme } = useDesign();
  const { items, getTotalPrice, clearCart } = useCart();
  const { createOrder } = useOrders();
  const { user, loading: authLoading } = useAuth();
  // The routes and the address book come from the query cache, where the
  // route loader has usually put them before the page opened: the form fills
  // in with the page instead of a moment after it.
  const qc = useQueryClient();
  // Raw tenant (useGlow().tenant is the derived brand and has no
  // bogConfigured). Drives card-redirect vs the free-order fallback.
  const { tenant: store } = useTenant();
  const card = !!store?.bogConfigured;
  const step = params.get('step') === 'review' ? 'review' : 'delivery';

  const [placing, setPlacing] = useState(false);
  const [payError, setPayError] = useState('');
  const [touched, setTouched] = useState(false);
  const [editContact, setEditContact] = useState(false);

  // Delivery routes the store actually offers (D9). An unconfigured store
  // still answers with collection in person, so this is never empty once
  // loaded. Express is not a route: it is bought on top of a courier one.
  const [routes, setRoutes] = useState([]);
  const [routesReady, setRoutesReady] = useState(false);
  const [express, setExpress] = useState(null);
  const [wantExpress, setWantExpress] = useState(false);
  const [requiresAddress, setRequiresAddress] = useState(false);
  const [deliveryRoute, setDeliveryRoute] = useState('pickup');

  // Delivery address (decision D4). Prefilled from the platform-wide address
  // book's default entry; whatever is submitted is frozen onto the order
  // server-side, and a new inline address is saved to the book for next time.
  const [bookReady, setBookReady] = useState(false);
  const [savedAddressId, setSavedAddressId] = useState(null);
  // Snapshot of the loaded saved address — "did the shopper change anything?"
  // is answered by value comparison, not a touched flag: a set-only flag would
  // treat a reverted keystroke as a new address and save a duplicate book row.
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [line, setLine] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const fieldRefs = useRef({});

  // Delivery routes load for everyone, signed in or not — a guest still needs
  // to see what the shop offers before deciding to sign in.
  useEffect(() => {
    const ac = new AbortController();
    qc.fetchQuery(publicDeliveryQuery())
      .then((res) => {
        if (ac.signal.aborted) return;
        const list = Array.isArray(res?.routes) ? res.routes : [];
        setRoutes(list);
        setExpress(res?.express || null);
        setRequiresAddress(!!res?.requiresAddress);
        // Preselect the cheapest route rather than the first: the shopper can
        // always pick a faster one, and defaulting to the dearest would charge
        // for a choice they never made.
        const cheapest = [...list].sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0))[0];
        if (cheapest) setDeliveryRoute(cheapest.route);
      })
      .catch(() => { /* falls back to PICKUP, which every store offers */ })
      .finally(() => { if (!ac.signal.aborted) setRoutesReady(true); });
    return () => ac.abort();
  }, [qc]);

  // Signed out, there is no address book to wait for.
  useEffect(() => {
    if (!user && !authLoading) setBookReady(true);
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    // Not ready until the book answers: step 3 waits for it before deciding
    // the address is missing.
    setBookReady(false);
    if (!recipient) setRecipient([user.firstName, user.lastName].filter(Boolean).join(' '));
    if (!phone && user.phoneNumber) setPhone(user.phoneNumber);
    qc.fetchQuery(addressesQuery())
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
      .catch(() => { /* signed out or no book yet — the blank form is fine */ })
      .finally(() => setBookReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // A new step starts at its top.
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const subtotal = getTotalPrice();
  const count = items.reduce((s, it) => s + it.quantity, 0);

  // ── Delivery (D9) ─────────────────────────────────────────────────────────
  // The fee shown here is the store's own published price for the chosen
  // route; the server prices the order again from the same rows, so a
  // tampered browser cannot set its own delivery charge — this number is for
  // the shopper to read, never the one that is charged.
  const chosen = routes.find((r) => r.route === deliveryRoute);
  const couriers = routes.filter((r) => r.courier);
  // The route express would ride on: the chosen courier, else the first one.
  const expressBase = chosen?.courier ? chosen : couriers[0];
  const canExpress = !!express && !!chosen?.courier;
  const expressOn = canExpress && wantExpress;

  const baseFee = (r) => {
    if (!r) return 0;
    const price = Number(r.price ?? 0);
    const freeOver = r.freeOverTotal == null ? null : Number(r.freeOverTotal);
    // The threshold frees the route, never the speed.
    return freeOver != null && subtotal >= freeOver ? 0 : price;
  };
  const expressPrice = Number(express?.price ?? 0);
  const deliveryFee = chosen ? baseFee(chosen) + (expressOn ? expressPrice : 0) : 0;
  const total = subtotal + deliveryFee;

  const eta = (o) => (ka ? o?.etaKa : o?.etaEn) || '';
  const routeName = (r) => t(`checkout.flow.routeName.${r.route}`, { defaultValue: t(`checkout.route.${r.route}`) });
  const routeArea = (r) => (r.courier ? t(`checkout.flow.routeArea.${r.route}`, { defaultValue: '' }) : '');

  // Only a courier route needs an address. With both couriers off the store
  // posts nothing, so checkout does not ask and does not block on it.
  const needsAddress = requiresAddress && !!chosen?.courier;
  const fullLine = [line.trim(), apartment.trim()].filter(Boolean).join(', ');

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
      && fullLine === savedSnapshot.line
      && city.trim() === savedSnapshot.city
      && postalCode.trim() === savedSnapshot.postalCode;
    if (matchesSaved) return { ...base, addressId: savedAddressId };
    return { ...base, address: {
      recipient: recipient.trim(), phone: phone.trim(), line: fullLine,
      city: city.trim(), postalCode: postalCode.trim() || null, country: null,
    } };
  };

  // ── Who may order ─────────────────────────────────────────────────────────
  // A complete profile AND a verified phone (the backend enforces this too —
  // OrderController.requireOrderEligible), plus a complete address to freeze
  // onto the order when one is being delivered.
  const identityOk = !!user && !!user.profileComplete && !!user.phoneVerified;
  const missing = needsAddress
    ? { recipient: !recipient.trim(), phone: !phone.trim(), line: !line.trim(), city: !city.trim() }
    : {};
  const addressOk = !Object.values(missing).some(Boolean);
  const eligible = identityOk && addressOk;

  // Step 3 without what step 2 asks for — a reload before the address book
  // came back is waited out — goes back to step 2.
  useEffect(() => {
    if (step !== 'review' || authLoading || !routesReady || !bookReady) return;
    if (!eligible) {
      setParams((p) => { const n = new URLSearchParams(p); n.delete('step'); return n; }, { replace: true });
    }
  }, [step, authLoading, routesReady, bookReady, eligible, setParams]);

  const toReview = () => {
    if (!user) { navigate('/signin'); return; }
    if (!identityOk) return;
    setTouched(true);
    if (!addressOk) {
      if (missing.recipient || missing.phone) setEditContact(true);
      const first = ['recipient', 'phone', 'city', 'line'].find((k) => missing[k]);
      setTimeout(() => fieldRefs.current[first]?.focus?.(), 0);
      return;
    }
    setPayError('');
    setParams((p) => { const n = new URLSearchParams(p); n.set('step', 'review'); return n; }, { state: { fromDelivery: true } });
  };

  const toDelivery = () => {
    if (location.state?.fromDelivery) navigate(-1);
    else setParams((p) => { const n = new URLSearchParams(p); n.delete('step'); return n; }, { replace: true });
  };

  const back = () => (step === 'review' ? toDelivery() : navigate('/cart'));

  const pay = async () => {
    if (!eligible || placing) return;
    setPayError('');
    setPlacing(true);
    // variantId rides along so the server can price the chosen row and take
    // stock from it (D11); it is absent for a product without variants. The
    // server reads the product as productId — `id` is what the bag calls it.
    const cartItems = items.map((i) => ({
      id: i.id, productId: i.id, title: i.title, price: i.price, quantity: i.quantity, variantId: i.variantId,
    }));

    // Stores that connected Bank of Georgia: create the order + BOG payment,
    // then hand the browser to the bank-hosted page. The cart is kept until
    // /pay/return confirms PAID (so an abandoned payment doesn't lose it).
    if (card) {
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

    // Stores without a payment provider: the order is placed and the store
    // arranges payment (context posts /api/orders, the order lives in the DB).
    const res = await createOrder({ items: cartItems, ...delivery() });
    setPlacing(false);
    if (!res?.success) {
      setPayError(res?.error || t('checkout.flow.placeError'));
      return;
    }
    clearCart();
    navigate('/success', {
      replace: true,
      state: { orderId: res.order?.orderNumber || res.order?.id, total, count },
    });
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  const gut = isMobile ? 16 : 28;
  const barBottom = clearance > 0 ? clearance : 12;
  const glass = theme === 'soft'
    ? { background: T.dark ? '#2a2a30' : 'var(--k-ink)', color: T.dark ? '#f2f2f4' : 'var(--k-on-ink)', border: 'none', boxShadow: 'var(--k-fl-sh)' }
    : theme === 'neon'
      ? { ...floatStyle, color: T.text }
      // Liquid Glass carries text here, so its glass is denser than elsewhere.
      : {
        ...floatStyle, color: T.text,
        background: T.dark
          ? 'linear-gradient(155deg,rgba(255,255,255,.12),rgba(255,255,255,0) 40%),rgba(30,30,32,.84)'
          : 'linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,0) 40%),rgba(255,255,255,.78)',
      };
  const primary = (off) => ({
    border: !off && theme === 'glow' ? '1px solid rgba(255,255,255,.35)' : 'none',
    background: off ? T.surface2 : T.accent, color: off ? T.textMute : T.onAccent,
    boxShadow: !off && theme === 'glow'
      ? `inset 0 1px 1px rgba(255,255,255,.55), 0 10px 24px -10px ${alpha(T.accent, 0.7)}` : 'none',
    cursor: off ? 'not-allowed' : 'pointer',
  });

  const screen = (children, padBottom) => (
    <div style={{
      position: 'relative', minHeight: '100vh', background: T.page, color: T.text,
      font: `400 14px ${T.font}`, paddingBottom: padBottom,
    }}>
      {children}
    </div>
  );

  const topBar = !isDesktop && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `${isMobile ? 14 : 20}px ${gut}px 6px` }}>
      <button
        type="button"
        onClick={back}
        aria-label={t('checkout.flow.back')}
        style={{
          ...floatStyle, width: 44, height: 44, borderRadius: 'var(--k-r-ibtn)', padding: 0, flex: 'none',
          display: 'grid', placeItems: 'center', color: T.text, cursor: 'pointer',
        }}
      >
        <G name="back" />
      </button>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textAlign: 'center' }}>
        <h1 style={{ margin: 0, font: `600 16px/1.3 var(--k-font-d, ${T.font})`, color: T.text }}>{t('checkout.flow.heading')}</h1>
        {card && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: `500 12px ${T.font}`, color: T.textDim }}>
            <G name="lock" size={13} />{t('checkout.flow.secure')}
          </span>
        )}
      </div>
      <span style={{ width: 44, flex: 'none' }} />
    </div>
  );

  // ── Empty bag ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return screen(
      <>
        {topBar}
        <div style={{ padding: '60px 24px', textAlign: 'center', color: T.textDim, font: `500 14px ${T.font}` }}>
          {t('checkout.emptyBag')}
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{ height: 48, padding: '0 22px', borderRadius: 'var(--k-r-btn)', font: `600 15px ${T.font}`, ...primary(false) }}
            >
              {t('checkout.browse', { name: tenant.name })}
            </button>
          </div>
        </div>
      </>,
      120,
    );
  }

  const review = step === 'review';
  const stepLabel = t('checkout.flow.stepOf', {
    n: review ? 3 : 2, total: 3,
    name: review ? t('checkout.flow.stepReview') : t('checkout.flow.stepDelivery'),
  });
  const freeText = <span style={{ color: T.success }}>{t('checkout.free')}</span>;
  const deliveryValue = deliveryFee ? money(deliveryFee) : freeText;
  const agree = (
    <Trans
      t={t}
      i18nKey={card ? 'checkout.flow.agreePay' : 'checkout.flow.agreeOrder'}
      components={{
        // Not `link`: that is a void HTML element, and Trans drops its text.
        rules: (
          <a
            href={platformUrl('/returns')}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: T.accentFg, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}
          />
        ),
      }}
    />
  );

  // The action, per step and per state of the account.
  const action = (() => {
    if (review) {
      const label = placing ? (card ? t('checkout.redirecting') : t('checkout.placing'))
        : card ? t('checkout.payNow') : t('checkout.flow.placeOrder');
      return { label, wide: placing ? label : card ? t('checkout.flow.payAmount', { amount: money(total) }) : t('checkout.flow.placeAmount', { amount: money(total) }), onClick: pay, off: placing || !eligible, lock: card };
    }
    if (!user) return { label: t('checkout.signInToPay'), onClick: toReview, off: false };
    if (!user.profileComplete) return { label: t('checkout.completeProfile'), onClick: toReview, off: true };
    if (!user.phoneVerified) return { label: t('checkout.verifyToPay'), onClick: toReview, off: true };
    return { label: t('checkout.flow.toPayment'), onClick: toReview, off: false };
  })();

  const err = (k) => (touched && missing[k] ? t('checkout.flow.required') : undefined);
  const ref = (k) => (el) => { fieldRefs.current[k] = el?.querySelector?.('input') || null; };

  // ── Step 2 · Delivery ─────────────────────────────────────────────────────
  const accountName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const shownName = (needsAddress ? recipient.trim() : '') || accountName || recipient.trim();
  const shownPhone = needsAddress ? phone : (user?.phoneNumber || phone);
  const verified = !!user?.phoneVerified && samePhone(shownPhone, user?.phoneNumber);
  const contactFields = needsAddress && (editContact || missing.recipient || missing.phone);

  const gate = !identityOk && (
    <div style={{ ...cardStyle(T), padding: 16, display: 'flex', flexDirection: 'column', gap: 10, border: `1px solid ${alpha(T.danger, 0.33)}` }}>
      <b style={{ font: `700 13px ${T.font}`, color: T.text }}>{t('checkout.verifyTitle')}</b>
      {!user ? (
        <>
          <span style={{ font: `500 12.5px/1.5 ${T.font}`, color: T.textDim }}>{t('checkout.needSignIn')}</span>
          <button type="button" onClick={() => navigate('/signin')} style={{ height: 44, borderRadius: 'var(--k-r-btn)', font: `600 13.5px ${T.font}`, ...primary(false) }}>
            {t('checkout.signIn')}
          </button>
        </>
      ) : !user.profileComplete ? (
        <span style={{ font: `500 12.5px/1.5 ${T.font}`, color: T.textDim }}>{t('checkout.completeProfileHint')}</span>
      ) : !user.phoneNumber ? (
        <>
          <span style={{ font: `500 12.5px/1.5 ${T.font}`, color: T.textDim }}>{t('checkout.needPhone')}</span>
          <a href={hubUrl('/account/personal', 'store', store?.subdomain)} style={{ height: 44, borderRadius: 'var(--k-r-btn)', font: `600 13.5px ${T.font}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxSizing: 'border-box', ...primary(false) }}>
            {t('checkout.addPhone')}
          </a>
        </>
      ) : (
        <>
          <span style={{ font: `500 12.5px/1.5 ${T.font}`, color: T.textDim }}>{t('checkout.verifyPhoneHint', { phone: user.phoneNumber })}</span>
          <PhoneVerifyBox compact />
        </>
      )}
    </div>
  );

  const contact = identityOk && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...cardStyle(T), padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-hidden="true" style={{
          width: 34, height: 34, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
          background: 'var(--k-ink)', color: 'var(--k-on-ink)', font: `700 12px ${T.font}`,
        }}>
          {initials(shownName) || <G name="user" size={16} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}`, color: T.text, overflowWrap: 'anywhere' }}>
            {shownName || t('checkout.recipient')}
          </b>
          <div style={{ font: `400 12px/1.4 ${T.font}`, color: T.textDim }}>
            {[phoneText(shownPhone), verified ? t('checkout.flow.verified') : null].filter(Boolean).join(' · ')}
          </div>
        </div>
        {needsAddress && !contactFields && (
          <LinkBtn T={T} phone={isMobile} onClick={() => setEditContact(true)}>{t('checkout.edit')}</LinkBtn>
        )}
      </div>
      {contactFields && (
        <div style={{ display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div ref={ref('recipient')} style={{ flex: '1 1 200px', minWidth: 0, display: 'flex' }}>
            <Field T={T} id="co-recipient" label={t('checkout.recipient')} value={recipient} onChange={setRecipient} error={err('recipient')} autoComplete="name" style={{ flex: 1 }} />
          </div>
          <div ref={ref('phone')} style={{ flex: '1 1 200px', minWidth: 0, display: 'flex' }}>
            <Field T={T} id="co-phone" label={t('checkout.phone')} value={phone} onChange={setPhone} error={err('phone')} autoComplete="tel" inputMode="tel" style={{ flex: 1 }} />
          </div>
        </div>
      )}
    </div>
  );

  const options = routes.length > 0 && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Label T={T}>{t('checkout.flow.howReceive')}</Label>
      <div role="radiogroup" aria-label={t('checkout.flow.howReceive')} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {routes.map((r) => {
          const fee = baseFee(r);
          const listed = Number(r.price ?? 0);
          const price = fee === 0 ? (
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <b style={{ font: `700 12.5px ${T.font}`, color: listed > 0 ? T.success : T.text }}>{t('checkout.free')}</b>
              {listed > 0 && (
                <span style={{ font: `400 12px ${T.font}`, color: T.textDim, textDecoration: 'line-through' }}>{money(listed)}</span>
              )}
            </span>
          ) : (
            <b style={{ font: `700 12.5px ${T.font}`, whiteSpace: 'nowrap' }}>{money(fee)}</b>
          );
          const sub = r.courier
            ? [routeArea(r), eta(r)].filter(Boolean).join(' · ')
            : [r.pickupAddress, eta(r)].filter(Boolean).join(' · ');
          return (
            <Option
              key={r.route}
              T={T}
              on={r.route === deliveryRoute && !expressOn}
              icon={r.courier ? 'truck' : 'pin'}
              name={routeName(r)}
              sub={sub}
              price={price}
              onClick={() => { setDeliveryRoute(r.route); setWantExpress(false); }}
            />
          );
        })}
        {/* Express rides on a courier route, so choosing it picks one: the
            chosen courier, or the first the store offers. Its price is that
            route's plus the upgrade — what the server will charge. */}
        {express && expressBase && (
          <Option
            T={T}
            on={expressOn}
            icon="clock"
            name={t('checkout.flow.routeName.express')}
            sub={[eta(express), couriers.length > 1 ? routeArea(expressBase) : null].filter(Boolean).join(' · ')}
            price={<b style={{ font: `700 12.5px ${T.font}`, whiteSpace: 'nowrap' }}>{money(baseFee(expressBase) + expressPrice)}</b>}
            onClick={() => { if (!chosen?.courier) setDeliveryRoute(expressBase.route); setWantExpress(true); }}
          />
        )}
      </div>
    </div>
  );

  const address = needsAddress && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Label T={T}>{t('checkout.shippingAddress')}</Label>
      <div ref={ref('city')} style={{ display: 'flex' }}>
        <Field T={T} id="co-city" label={t('checkout.city')} value={city} onChange={setCity} error={err('city')} autoComplete="address-level2" style={{ flex: 1 }} />
      </div>
      <div ref={ref('line')} style={{ display: 'flex' }}>
        <Field T={T} id="co-line" label={t('checkout.address')} value={line} onChange={setLine} error={err('line')} autoComplete="address-line1" style={{ flex: 1 }} />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Field T={T} id="co-apt" label={t('checkout.flow.apartment')} value={apartment} onChange={setApartment} autoComplete="address-line2" style={{ flex: 1 }} />
        <Field T={T} id="co-zip" label={t('checkout.zip')} value={postalCode} onChange={setPostalCode} autoComplete="postal-code" inputMode="numeric" style={{ flex: 1 }} />
      </div>
    </div>
  );

  // ── Step 3 · Review and pay ───────────────────────────────────────────────
  const method = expressOn ? t('checkout.flow.routeName.express') : chosen ? routeName(chosen) : t('checkout.route.pickup');
  const methodEta = expressOn ? eta(express) : eta(chosen);
  const where = needsAddress
    ? [city.trim(), fullLine].filter(Boolean).join(', ')
    : (chosen?.pickupAddress || '');
  const reviewRow = (icon, label, value, last) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56, boxSizing: 'border-box',
      borderBottom: last ? 'none' : `1px solid ${T.border}`,
    }}>
      <IconTile T={T} name={icon} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', font: `400 12px/1.4 ${T.font}`, color: T.textDim }}>{label}</span>
        {value && <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}`, color: T.text, overflowWrap: 'anywhere' }}>{value}</b>}
      </div>
      <LinkBtn T={T} phone={isMobile} onClick={toDelivery}>{t('checkout.edit')}</LinkBtn>
    </div>
  );

  const reviewBody = (
    <>
      <div style={{ ...cardStyle(T), overflow: 'hidden' }}>
        {reviewRow('user', t('checkout.recipient'), [shownName, phoneText(shownPhone)].filter(Boolean).join(' · '))}
        {reviewRow(
          needsAddress || expressOn ? 'truck' : 'pin',
          [method, methodEta].filter(Boolean).join(' · '),
          where,
          true,
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Label T={T}>{t('checkout.flow.items')}</Label>
        {items.map((it) => <ItemRow key={lineKey(it)} T={T} t={t} item={it} />)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Label T={T}>{t('checkout.flow.paymentMethod')}</Label>
        <div style={{ ...cardStyle(T), padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconTile T={T} name={card ? 'card' : 'store'} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}`, color: T.text }}>
              {card ? t('checkout.payCard') : t('checkout.flow.storeTitle')}
            </b>
            <span style={{ display: 'block', font: `400 12px/1.45 ${T.font}`, color: T.textDim }}>
              {card ? t('checkout.flow.cardSub') : t('checkout.flow.storeSub')}
            </span>
          </span>
        </div>
      </div>

      {card && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px',
          borderRadius: 'var(--k-r-card)', background: 'var(--k-info-bg)', color: T.text,
        }}>
          <span style={{ color: 'var(--k-info)', display: 'flex' }}><G name="shield" /></span>
          <span style={{ font: `500 12.5px/1.55 ${T.font}` }}>{t('checkout.flow.cardNote', { name: tenant.name })}</span>
        </div>
      )}

      {payError && (
        <div role="alert" style={{
          padding: '12px 14px', borderRadius: 'var(--k-r-card)', background: 'var(--k-bad-bg)',
          color: T.danger, font: `600 12.5px/1.5 ${T.font}`,
        }}>
          {payError}
        </div>
      )}

      {!isDesktop && (
        <p style={{ margin: 0, textAlign: 'center', font: `400 12px/1.5 ${T.font}`, color: T.textDim }}>{agree}</p>
      )}
    </>
  );

  const deliveryBody = (
    <>
      {gate}
      {contact}
      {options}
      {address}
    </>
  );

  // ── Desktop summary ───────────────────────────────────────────────────────
  const ctaButton = (lg) => (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.off}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
        height: lg ? 54 : 48, padding: '0 22px', borderRadius: 'var(--k-r-btn)', flex: 'none',
        width: lg ? '100%' : undefined, font: `600 ${lg ? 16 : 15}px/1 ${T.font}`, ...primary(action.off),
      }}
    >
      {action.lock && !placing && <G name="lock" size={18} />}
      {lg && action.wide ? action.wide : action.label}
    </button>
  );

  const aside = isDesktop && (
    <aside style={{ ...cardStyle(T), width: 400, flex: 'none', padding: 22, display: 'flex', flexDirection: 'column', gap: 14, boxSizing: 'border-box' }}>
      <b style={{ font: `600 16px/1.3 var(--k-font-d, ${T.font})`, color: T.text }}>
        {review ? t('checkout.flow.summary') : t('checkout.flow.order')}
      </b>
      {!review && items.map((it) => <ItemRow key={lineKey(it)} T={T} t={t} item={it} />)}
      {!review && <div style={{ height: 1, background: T.border }} />}
      <div>
        <Kv T={T} label={review ? t('checkout.flow.itemsCount', { count }) : t('checkout.flow.items')} value={money(subtotal)} />
        <Kv T={T} label={t('checkout.deliveryMethod')} value={deliveryValue} />
      </div>
      {review && <div style={{ height: 1, background: T.border }} />}
      <Kv T={T} strong label={t('checkout.total')} value={money(total)} valueStyle={review ? { fontSize: 20 } : undefined} />
      {ctaButton(true)}
      {review && (
        <span style={{ textAlign: 'center', font: `400 12px/1.5 ${T.font}`, color: T.textDim }}>{agree}</span>
      )}
    </aside>
  );

  // ── Phone and tablet: the floating bar ────────────────────────────────────
  const bar = !isDesktop && (
    <div style={{
      position: 'fixed', zIndex: 1100, bottom: barBottom, boxSizing: 'border-box',
      ...(isMobile ? { left: 12, right: 12 } : { left: '50%', width: 600, transform: 'translateX(-50%)' }),
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: theme === 'neon' ? '8px 10px 8px 20px' : '7px 7px 7px 20px',
      borderRadius: theme === 'neon' ? 10 : 'var(--k-r-btn)', ...glass,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ font: `500 12px ${T.font}`, opacity: 0.75 }}>{t('checkout.total')}</span>
        <b style={{ font: `700 16px ${T.font}`, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(total)}</b>
      </div>
      {ctaButton(false)}
    </div>
  );

  const left = (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: isDesktop ? 20 : isMobile ? 18 : 20, minWidth: 0,
      ...(isDesktop ? { flex: 1, maxWidth: 640 } : null),
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isDesktop && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent',
                padding: '4px 0', marginLeft: -4, cursor: 'pointer', color: T.accentFg, font: `600 12.5px ${T.font}`,
              }}
            >
              <G name="back" size={16} />{t('checkout.flow.bag')}
            </button>
            {card && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: `500 12.5px ${T.font}`, color: T.textDim }}>
                <G name="lock" size={16} />{t('checkout.flow.secureBank')}
              </span>
            )}
          </div>
        )}
        <Steps T={T} n={review ? 3 : 2} label={stepLabel} />
      </div>
      {isDesktop && (
        <h1 style={{ margin: 0, font: `var(--k-w-t, 700) 26px/1.15 var(--k-font-d, ${T.font})`, letterSpacing: '-0.02em', color: T.text }}>
          {review ? t('checkout.flow.reviewTitle') : t('checkout.flow.deliveryTitle')}
        </h1>
      )}
      {review ? reviewBody : deliveryBody}
    </div>
  );

  return screen(
    <>
      {topBar}
      {isDesktop ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 48, padding: '28px 48px 0' }}>
          {left}
          {aside}
        </div>
      ) : (
        <div style={{
          padding: isMobile ? '6px 16px 0' : '10px 28px 0',
          ...(isMobile ? null : { maxWidth: 640, margin: '0 auto' }),
        }}>
          {left}
        </div>
      )}
      {bar}
    </>,
    isDesktop ? 48 : barBottom + 62 + 28,
  );
}
