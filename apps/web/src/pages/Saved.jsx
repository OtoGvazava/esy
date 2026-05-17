import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSaved } from '../contexts/SavedContext';
import { useCart } from '../contexts/CartContext';
import { useGlow } from '../styles/glow';
import { Icon, Placeholder, PoweredBy } from '../components/glow/GlowPrimitives';
import { GlowScreen, GlowTopNav, money } from '../components/glow/GlowChrome';

export default function Saved() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const { items, toggleSaved } = useSaved();
  const { addToCart } = useCart();

  if (items.length === 0) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('saved.title')} onBack={() => navigate(-1)} />
        <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: T.surface, border: `1px solid ${T.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.accentFg }}>
            <Icon.heart width="34" height="34" />
          </div>
          <div style={{ font: `700 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{t('saved.heading')}</div>
          <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim, maxWidth: 260 }}>
            {t('saved.emptyBody')}
          </div>
          <button onClick={() => navigate('/')} style={{ marginTop: 8, height: 48, padding: '0 22px', borderRadius: 14, border: 'none', background: T.grad, color: '#fff', font: `700 13.5px ${T.font}`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: `0 10px 24px ${T.accent}55` }}>
            {t('saved.browse', { name: tenant.name })} <Icon.arrowR />
          </button>
        </div>
      </GlowScreen>
    );
  }

  return (
    <GlowScreen T={T}>
      <GlowTopNav T={T} title={t('saved.title')} onBack={() => navigate(-1)} />
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ padding: '8px 22px 16px' }}>
          <div style={{ font: `700 24px ${T.font}`, color: T.text, letterSpacing: '-0.03em' }}>{t('saved.heading')}</div>
          <div style={{ font: `400 12.5px ${T.font}`, color: T.textDim, marginTop: 4 }}>{t('saved.itemCount', { count: items.length })}</div>
        </div>

        <div style={{ padding: '0 18px 12px', display: 'flex', gap: 6, overflow: 'hidden' }}>
          {[t('saved.filterAll'), t('saved.filterInStock'), tenant.name].map((f, i) => (
            <span key={f} style={{ display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 12px', borderRadius: 999, whiteSpace: 'nowrap', background: i === 0 ? T.text : T.surface2, color: i === 0 ? T.bg : T.text, font: `600 12px ${T.font}`, border: i === 0 ? 'none' : `1px solid ${T.border}` }}>{f}</span>
          ))}
        </div>

        <div style={{ padding: '0 16px 6px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((p) => {
            const src = p.image || p.thumbnail;
            return (
              <div key={p.id} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}` }}>
                <div onClick={() => navigate(`/product/${p.id}`)} style={{ width: 92, height: 92, borderRadius: 12, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
                  {src ? <img src={src} alt={p.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Placeholder label={p.title} hue={tenant.hue} dark={T.dark} />}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div onClick={() => navigate(`/product/${p.id}`)} style={{ font: `600 13.5px ${T.font}`, color: T.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{p.title}</div>
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ font: `800 16px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{money(p.price)}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleSaved(p)} aria-label="remove from saved" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.border}`, background: 'transparent', color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon.heart /></button>
                      <button onClick={() => { addToCart({ id: p.id, title: p.title, price: p.price, image: p.image, thumbnail: p.thumbnail }); navigate('/cart'); }} style={{ height: 34, padding: '0 12px', borderRadius: 10, border: 'none', background: T.grad, color: '#fff', font: `700 11.5px ${T.font}`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon.plus /> {t('saved.bag')}</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '18px 22px 8px' }}><PoweredBy T={T} /></div>
      </div>
    </GlowScreen>
  );
}
