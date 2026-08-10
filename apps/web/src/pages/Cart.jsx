import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart, lineKey } from '../contexts/CartContext';
import { useGlow } from '../styles/glow';
import { Icon, Placeholder } from '../components/glow/GlowPrimitives';
import { GlowScreen, GlowTopNav, GlowStickyCTA, money } from '../components/glow/GlowChrome';

// No free-shipping threshold and no flat rate live here any more.
//
// This screen used to show a progress bar toward "free delivery over 100 ₾" and
// add a 6 ₾ fee below it. Neither number came from anywhere: D9 makes delivery
// four per-store routes, each with its own price and its own optional
// free-over threshold, and the shopper picks one at CHECKOUT. So the bar
// promised a threshold no store had set, and the fee named a price no store
// charged. The bag now shows what it actually knows — the goods — and says
// delivery is decided at the next step.

function Thumb({ T, item, tenant }) {
  const src = item.image || item.thumbnail;
  // A broken image URL used to hide the <img> and leave an empty white square.
  // Falling back to the placeholder keeps the row looking like a product —
  // ProductDetails already tracks load failure this way.
  const [ok, setOk] = useState(Boolean(src));
  return (
    <div style={{ width: 76, height: 76, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
      {src && ok ? (
        <img src={src} alt={item.title} onError={() => setOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Placeholder label={item.title} hue={tenant.hue} dark={T.dark} />
      )}
    </div>
  );
}

export default function Cart() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('cart');
  const { items, updateQuantity, removeFromCart, getTotalPrice } = useCart();

  const subtotal = getTotalPrice();

  if (items.length === 0) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('bag')} onBack={() => navigate(-1)} />
        <div style={{ minHeight: 'calc(100vh - 186px)', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: T.surface, border: `1px solid ${T.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.accentFg }}>
            <Icon.bag width="36" height="36" />
          </div>
          <div style={{ font: `700 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{t('emptyTitle')}</div>
          <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim, maxWidth: 260 }}>
            {t('emptyBody')}
          </div>
          <button onClick={() => navigate('/')} style={{ marginTop: 8, height: 48, padding: '0 22px', borderRadius: 14, border: 'none', background: T.grad, color: '#fff', font: `700 13.5px ${T.font}`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: `0 10px 24px ${T.accent}55` }}>
            {t('browse', { name: tenant.name })} <Icon.arrowR />
          </button>
        </div>
      </GlowScreen>
    );
  }

  return (
    <GlowScreen T={T} padBottom={180}>
      <GlowTopNav T={T} title={t('bagCount', { count: items.length })} onBack={() => navigate(-1)} />
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* line items */}
        <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}` }}>
              <Thumb T={T} item={it} tenant={tenant} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ font: `600 13.5px ${T.font}`, color: T.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                {it.variantLabel && (
                  <div style={{ font: `500 11.5px ${T.font}`, color: T.textMute, marginTop: 2 }}>{it.variantLabel}</div>
                )}
                <button onClick={() => removeFromCart(lineKey(it))} style={{ alignSelf: 'flex-start', marginTop: 2, padding: 0, border: 'none', background: 'transparent', color: T.textMute, font: `500 11px ${T.font}`, cursor: 'pointer' }}>{t('remove')}</button>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${T.border}`, borderRadius: 999, height: 30, overflow: 'hidden' }}>
                    <button onClick={() => updateQuantity(lineKey(it), it.quantity - 1)} style={{ width: 30, height: 30, border: 'none', background: 'transparent', color: T.text, font: `600 16px ${T.font}`, cursor: 'pointer' }}>−</button>
                    <span style={{ width: 26, textAlign: 'center', font: `600 13px ${T.font}`, color: T.text }}>{it.quantity}</span>
                    <button onClick={() => updateQuantity(lineKey(it), it.quantity + 1)} style={{ width: 30, height: 30, border: 'none', background: 'transparent', color: T.text, font: `600 16px ${T.font}`, cursor: 'pointer' }}>+</button>
                  </div>
                  <div style={{ font: `700 14px ${T.font}`, color: T.text, letterSpacing: '-0.015em' }}>{money(it.price * it.quantity)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* promo */}
        <div style={{ padding: '12px 16px 4px' }}>
          {/* The promo-code field was removed: there is no discount system, so
              it accepted a code, discarded it, and changed nothing. An input
              that silently does nothing is worse than no input. */}
        </div>

        {/* totals */}
        <div style={{ padding: '14px 22px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { id: 'subtotal', label: t('subtotal'), value: money(subtotal) },
            { id: 'shipping', label: t('shipping'), value: t('deliveryAtCheckout') },
          ].map(({ id, label, value }) => (
            <div key={id} style={{ display: 'flex', justifyContent: 'space-between', font: `500 13px ${T.font}`, color: T.textDim }}>
              <span>{label}</span><span style={{ color: T.text }}>{value}</span>
            </div>
          ))}
          <div style={{ height: 1, background: T.border, margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ font: `700 16px ${T.font}`, color: T.text }}>{t('total')}</span>
            <span style={{ font: `800 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{money(subtotal)}</span>
          </div>
        </div>
      </div>

      <GlowStickyCTA T={T} label={t('continueCheckout')} sub={money(subtotal)} onClick={() => navigate('/checkout')} />
    </GlowScreen>
  );
}
