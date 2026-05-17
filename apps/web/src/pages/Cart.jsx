import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import { useGlow } from '../styles/glow';
import { Icon, Placeholder } from '../components/glow/GlowPrimitives';
import { GlowScreen, GlowTopNav, GlowStickyCTA, money } from '../components/glow/GlowChrome';

const FREE_SHIP = 100;

function Thumb({ T, item, tenant }) {
  const src = item.image || item.thumbnail;
  return (
    <div style={{ width: 76, height: 76, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
      {src ? (
        <img src={src} alt={item.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
  const shipping = items.length && subtotal < FREE_SHIP ? 6 : 0;
  const total = subtotal + shipping;
  const remaining = Math.max(FREE_SHIP - subtotal, 0);
  const pct = Math.min(100, Math.round((subtotal / FREE_SHIP) * 100));

  if (items.length === 0) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('bag')} onBack={() => navigate(-1)} />
        <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
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
        {/* free-shipping progress */}
        <div style={{ padding: '6px 18px 14px' }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: T.accentBg, border: `1px solid ${T.accent}30`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ font: `600 12.5px ${T.font}`, color: T.accentFg, letterSpacing: '-0.01em' }}>
                {remaining > 0 ? t('freeShipAway', { amount: money(remaining) }) : t('freeShipUnlocked')}
              </div>
              <span style={{ font: `700 12.5px ${T.font}`, color: T.accentFg }}>{money(subtotal)} / {money(FREE_SHIP)}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: T.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,15,35,0.06)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: T.grad }} />
            </div>
          </div>
        </div>

        {/* line items */}
        <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}` }}>
              <Thumb T={T} item={it} tenant={tenant} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ font: `600 13.5px ${T.font}`, color: T.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                <button onClick={() => removeFromCart(it.id)} style={{ alignSelf: 'flex-start', marginTop: 2, padding: 0, border: 'none', background: 'transparent', color: T.textMute, font: `500 11px ${T.font}`, cursor: 'pointer' }}>{t('remove')}</button>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${T.border}`, borderRadius: 999, height: 30, overflow: 'hidden' }}>
                    <button onClick={() => updateQuantity(it.id, it.quantity - 1)} style={{ width: 30, height: 30, border: 'none', background: 'transparent', color: T.text, font: `600 16px ${T.font}`, cursor: 'pointer' }}>−</button>
                    <span style={{ width: 26, textAlign: 'center', font: `600 13px ${T.font}`, color: T.text }}>{it.quantity}</span>
                    <button onClick={() => updateQuantity(it.id, it.quantity + 1)} style={{ width: 30, height: 30, border: 'none', background: 'transparent', color: T.text, font: `600 16px ${T.font}`, cursor: 'pointer' }}>+</button>
                  </div>
                  <div style={{ font: `700 14px ${T.font}`, color: T.text, letterSpacing: '-0.015em' }}>{money(it.price * it.quantity)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* promo */}
        <div style={{ padding: '12px 16px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: T.surface, border: `1px dashed ${T.borderStr}` }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `800 13px ${T.font}` }}>%</span>
            <input placeholder={t('promoPlaceholder')} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: T.text, font: `500 13px ${T.font}` }} />
            <span style={{ font: `600 12px ${T.font}`, color: T.accentFg, cursor: 'pointer' }}>{t('apply')}</span>
          </div>
        </div>

        {/* totals */}
        <div style={{ padding: '14px 22px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { id: 'subtotal', label: t('subtotal'), value: money(subtotal) },
            { id: 'shipping', label: t('shipping'), value: shipping ? money(shipping) : t('free') },
            { id: 'tax', label: t('tax'), value: t('taxNote') },
          ].map(({ id, label, value }) => (
            <div key={id} style={{ display: 'flex', justifyContent: 'space-between', font: `500 13px ${T.font}`, color: T.textDim }}>
              <span>{label}</span><span style={{ color: T.text }}>{value}</span>
            </div>
          ))}
          <div style={{ height: 1, background: T.border, margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ font: `700 16px ${T.font}`, color: T.text }}>{t('total')}</span>
            <span style={{ font: `800 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{money(total)}</span>
          </div>
        </div>
      </div>

      <GlowStickyCTA T={T} label={t('continueCheckout')} sub={money(total)} onClick={() => navigate('/checkout')} />
    </GlowScreen>
  );
}
