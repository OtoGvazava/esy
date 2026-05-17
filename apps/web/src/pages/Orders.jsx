import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOrders } from '../contexts/OrdersContext';
import { useGlow } from '../styles/glow';
import { Icon, PoweredBy } from '../components/glow/GlowPrimitives';
import { GlowScreen, GlowTopNav, money } from '../components/glow/GlowChrome';

export default function Orders() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const { orders } = useOrders();

  if (!orders || orders.length === 0) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('orders.title')} onBack={() => navigate(-1)} />
        <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: T.surface, border: `1px solid ${T.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.accentFg }}>
            <Icon.bag width="34" height="34" />
          </div>
          <div style={{ font: `700 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{t('orders.emptyTitle')}</div>
          <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim, maxWidth: 260 }}>
            {t('orders.emptyBody')}
          </div>
          <button onClick={() => navigate('/')} style={{ marginTop: 8, height: 48, padding: '0 22px', borderRadius: 14, border: 'none', background: T.grad, color: '#fff', font: `700 13.5px ${T.font}`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: `0 10px 24px ${T.accent}55` }}>
            {t('orders.browse', { name: tenant.name })} <Icon.arrowR />
          </button>
        </div>
      </GlowScreen>
    );
  }

  return (
    <GlowScreen T={T}>
      <GlowTopNav T={T} title={t('orders.title')} onBack={() => navigate(-1)} />
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ padding: '6px 22px 14px' }}>
          <div style={{ font: `700 24px ${T.font}`, color: T.text, letterSpacing: '-0.03em' }}>{t('orders.heading')}</div>
          <div style={{ font: `400 12.5px ${T.font}`, color: T.textDim, marginTop: 4 }}>{t('orders.orderCount', { count: orders.length })}</div>
        </div>

        <div style={{ padding: '0 16px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map((o, idx) => {
            const id = (o.orderNumber || o.id || `ESY-${idx}`).toString().toUpperCase();
            const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
            const n = o.count ?? (Array.isArray(o.items) ? o.items.length : '—');
            const status = (o.status || 'placed').toLowerCase();
            const statusKey = o.statusKey || status.replace(/ /g, '_');
            const tone = status === 'delivered' ? T.success
              : status === 'cancelled' ? T.danger : T.accentFg;
            return (
              <div key={o.id || idx} style={{ padding: '14px 14px', borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 42, height: 42, borderRadius: 12, background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon.bag /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `700 13px ${T.mono}`, color: T.text }}>#{id}</div>
                  <div style={{ font: `400 11.5px ${T.font}`, color: T.textMute, marginTop: 2 }}>{date} · {t('orders.itemCount', { count: n })}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ font: `800 14px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{money(o.total)}</span>
                  <span style={{ font: `600 9.5px ${T.font}`, color: tone, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t(`orders.status.${statusKey}`, { defaultValue: status })}</span>
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
