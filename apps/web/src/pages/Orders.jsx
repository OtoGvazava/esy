import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOrders } from '../contexts/OrdersContext';
import { useGlow } from '../styles/glow';
import { Icon, PoweredBy } from '../components/glow/GlowPrimitives';
import { GlowScreen, GlowTopNav, money } from '../components/glow/GlowChrome';
import { alpha } from '../core/tokens';
import { platformUrl } from '../utils/hosts';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';

export default function Orders() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const { orders, pending } = useOrders();

  // The list's own shape until it is known: the heading and a few order rows.
  if (pending) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('orders.title')} />
        <Skeleton label={t('common:loading.orders')} style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ padding: '6px 22px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Sk h={24} w="44%" r={8} />
            <Sk h={11} w="22%" r={6} />
          </div>
          <div style={{ padding: '0 16px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ padding: '14px 14px', borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Sk w={42} h={42} r={12} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Sk h={12} w="40%" r={6} />
                  <Sk h={10} w="55%" r={5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
                  <Sk h={13} w={56} r={6} />
                  <Sk h={10} w={44} r={5} />
                </div>
              </div>
            ))}
          </div>
        </Skeleton>
      </GlowScreen>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('orders.title')} />
        <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: T.surface, border: `1px solid ${T.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.accentFg }}>
            <Icon.bag width="34" height="34" />
          </div>
          <div style={{ font: `700 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{t('orders.emptyTitle')}</div>
          <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim, maxWidth: 260 }}>
            {t('orders.emptyBody')}
          </div>
          <button onClick={() => navigate('/')} style={{ marginTop: 8, height: 48, padding: '0 22px', borderRadius: 14, border: 'none', background: T.grad, color: T.onAccent, font: `700 13.5px ${T.font}`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: `0 10px 24px ${alpha(T.accent, 0.33)}` }}>
            {t('orders.browse', { name: tenant.name })} <Icon.arrowR />
          </button>
        </div>
      </GlowScreen>
    );
  }

  return (
    <GlowScreen T={T}>
      <GlowTopNav T={T} title={t('orders.title')} />
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ padding: '6px 22px 14px' }}>
          <div style={{ font: `700 24px ${T.font}`, color: T.text, letterSpacing: '-0.03em' }}>{t('orders.heading')}</div>
          <div style={{ font: `400 12.5px ${T.font}`, color: T.textDim, marginTop: 4 }}>{t('orders.orderCount', { count: orders.length })}</div>
          {/* These are this store's. Everything ordered anywhere is esy.ge's, in a new tab. */}
          <a
            href={platformUrl('/account/orders')} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 32, marginTop: 6, font: `600 12.5px ${T.font}`, color: T.accentFg, textDecoration: 'none' }}
          >
            {t('orders.allOnEsy')}
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
          </a>
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
              // Rows open the order. Without this the list was a dead end:
              // the only screen a shopper could reach said how many items and
              // what it cost, never what they had actually bought.
              <div
                key={o.id || idx}
                role="button"
                tabIndex={0}
                className="esy-press-soft"
                data-prefetch={o.orderNumber ? `/orders/${encodeURIComponent(o.orderNumber)}` : undefined}
                onClick={() => o.orderNumber && navigate(`/orders/${encodeURIComponent(o.orderNumber)}`)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && o.orderNumber) {
                    e.preventDefault();
                    navigate(`/orders/${encodeURIComponent(o.orderNumber)}`);
                  }
                }}
                style={{ padding: '14px 14px', borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, cursor: o.orderNumber ? 'pointer' : 'default' }}
              >
                <span style={{ width: 42, height: 42, borderRadius: 12, background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon.bag /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `700 13px ${T.mono}`, color: T.text }}>#{id}</div>
                  <div style={{ font: `400 11.5px ${T.font}`, color: T.textMute, marginTop: 2 }}>{date} · {t('orders.itemCount', { count: n })}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ font: `800 14px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{money(o.total)}</span>
                  <span style={{ font: `600 12px ${T.font}`, color: tone }}>{t(`orders.status.${statusKey}`, { defaultValue: status })}</span>
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
