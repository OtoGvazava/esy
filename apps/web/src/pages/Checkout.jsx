import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrdersContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useGlow } from '../styles/glow';
import { paymentApi, handleApiError } from '../utils/api';
import { GlowScreen, GlowTopNav, GlowStickyCTA, money } from '../components/glow/GlowChrome';
import PhoneVerifyBox from '../components/PhoneVerifyBox';

const devTenant = () => {
  try { return new URLSearchParams(window.location.search).get('tenant') || undefined; }
  catch { return undefined; }
};

function Field({ T, label, defaultValue, span }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: span ? 'span 2' : undefined }}>
      <span style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      <input defaultValue={defaultValue} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.dark ? T.surface2 : '#fff', color: T.text, font: `500 13px ${T.font}`, outline: 'none' }} />
    </div>
  );
}

export default function Checkout() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const { items, getTotalPrice, clearCart } = useCart();
  const { createOrder } = useOrders();
  const { user } = useAuth();
  // Raw tenant (useGlow().tenant is the derived brand and has no
  // bogConfigured). Drives card-redirect vs the free-order fallback.
  const { tenant: store } = useTenant();
  const [placing, setPlacing] = useState(false);
  const [payError, setPayError] = useState('');

  const subtotal = getTotalPrice();
  const count = items.reduce((s, it) => s + it.quantity, 0);
  // The shopper pays exactly the item subtotal — no shipping, no tax line.
  // The 2% platform service fee is computed/persisted server-side and billed
  // to the store later; it is invisible here and not added to the charge.
  const total = subtotal;
  const email = user?.email || 'guest@esy.shop';
  // Ordering requires a complete profile AND a verified phone (the backend
  // enforces this too — see OrderController.requireOrderEligible).
  const eligible = !!user && user.profileComplete && !!user.phoneVerified;

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
        const res = await paymentApi.checkout(cartItems, devTenant());
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
    const res = await createOrder({ items: cartItems });
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

        {/* shipping form active */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ padding: '14px 14px 16px', borderRadius: 16, background: T.surface, border: `1.5px solid ${T.accent}` }}>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t('checkout.shippingAddress')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field T={T} label={t('checkout.firstName')} defaultValue={user?.firstName || ''} />
              <Field T={T} label={t('checkout.lastName')} defaultValue={user?.lastName || ''} />
              <Field T={T} label={t('checkout.address')} defaultValue="" span />
              <Field T={T} label={t('checkout.city')} defaultValue="" />
              <Field T={T} label={t('checkout.zip')} defaultValue="" />
            </div>
          </div>
        </div>

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
