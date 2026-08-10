import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tenantApi, handleApiError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useGlow } from '../styles/glow';
import { Icon, PoweredBy } from '../components/glow/GlowPrimitives';
import { money } from '../components/glow/GlowChrome';

const devTenant = () => {
  try { return new URLSearchParams(window.location.search).get('tenant') || undefined; }
  catch { return undefined; }
};

function StatCard({ T, label, value, isDesktop }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18,
      padding: isDesktop ? '22px 24px' : '18px 18px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ font: `800 ${isDesktop ? 30 : 24}px ${T.font}`, color: T.text, letterSpacing: '-0.03em' }}>{value}</div>
    </div>
  );
}

// The next fulfilment step per state (decision D1). CANCEL is offered only
// where the machine allows it; the backend enforces the same table.
const NEXT_STEP = {
  placed: 'SHIPPED',
  shipped: 'OUT_FOR_DELIVERY',
  out_for_delivery: 'DELIVERED',
};
const CAN_CANCEL = new Set(['placed', 'shipped']);

function OrderRow({ T, order, t, onAdvance }) {
  const id = (order.orderNumber || `ESY-${order.id}`).toString().toUpperCase();
  const date = order.placed
    ? new Date(order.placed).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const n = Number.isFinite(order.items) ? order.items : 0;
  const status = (order.status || 'placed').toLowerCase();
  const statusKey = status.replace(/ /g, '_');
  const tone = status === 'delivered' || status === 'completed' ? T.success
    : status === 'cancelled' ? T.danger : T.accentFg;
  const next = NEXT_STEP[statusKey];
  const ship = order.delivery;
  return (
    <div style={{ padding: '14px 14px', borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon.bag /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `700 13px ${T.mono}`, color: T.text }}>#{id}</div>
          <div style={{ font: `400 11.5px ${T.font}`, color: T.textMute, marginTop: 2 }}>{date} · {t('orderItems', { count: n })}</div>
          {ship && (
            <div style={{ font: `400 11px ${T.font}`, color: T.textMute, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              → {ship.recipient} · {ship.line}, {ship.city}{ship.phone ? ` · ${ship.phone}` : ''}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ font: `800 14px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{money(order.total)}</span>
          <span style={{ font: `600 9.5px ${T.font}`, color: tone, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t(`orderStatus.${statusKey}`, { defaultValue: status })}</span>
        </div>
      </div>
      {(next || CAN_CANCEL.has(statusKey)) && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {next && (
            <button onClick={() => onAdvance(order, next)} style={{
              padding: '6px 13px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${T.accent}`, background: T.accentBg,
              color: T.accentFg, font: `600 11.5px ${T.font}`,
            }}>{t(`orderAdvance.${next.toLowerCase()}`)}</button>
          )}
          {CAN_CANCEL.has(statusKey) && (
            <button onClick={() => onAdvance(order, 'CANCELLED')} style={{
              padding: '6px 13px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${T.border}`, background: 'transparent',
              color: T.danger, font: `600 11.5px ${T.font}`,
            }}>{t('orderAdvance.cancelled')}</button>
          )}
        </div>
      )}
    </div>
  );
}

// Owner/admin store Orders page: the store's incoming orders plus headline
// stats, rendered in the same Glow shell as the storefront. Shoppers and
// non-owners are bounced home (mirrors the @storeAccess gate on the API).
export default function StoreOrders() {
  const navigate = useNavigate();
  const { t } = useTranslation('owner');
  const { canManageStore, loading: authLoading } = useAuth();
  const { T, isDesktop, tenant } = useGlow();

  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !canManageStore) navigate('/');
  }, [authLoading, canManageStore, navigate]);

  useEffect(() => {
    if (authLoading || !canManageStore) return undefined;
    let alive = true;
    setLoading(true);
    setError('');
    const tn = devTenant();
    Promise.all([tenantApi.stats(tn), tenantApi.orders(tn)])
      .then(([s, o]) => {
        if (!alive) return;
        setStats(s);
        setOrders(Array.isArray(o) ? o : []);
      })
      .catch((e) => { if (alive) setError(handleApiError(e, t('ordersError'))); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [authLoading, canManageStore, t]);

  // Advance an order through the fulfilment machine (decision D1); the row
  // updates in place from the server's response, stats refresh lazily.
  const advance = async (order, next) => {
    try {
      const updated = await tenantApi.updateOrderStatus(order.id, next, devTenant());
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (e) {
      setError(handleApiError(e, t('ordersError')));
    }
  };

  const gutter = isDesktop ? 40 : 18;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${T.accent}`, borderTopColor: 'transparent', animation: 'glow-spin 1s linear infinite' }} />
        <style>{'@keyframes glow-spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    );
  }

  const cards = stats ? [
    { id: 'products', label: t('statProducts'), value: stats.products ?? 0 },
    { id: 'orders', label: t('statOrders'), value: stats.orders ?? 0 },
    { id: 'revenue', label: t('statRevenue'), value: money(stats.revenue ?? 0) },
    { id: 'fees', label: t('statFeesOwed'), value: money(stats.serviceFeesOwed ?? 0) },
  ] : [];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}`, paddingBottom: 120 }}>
      <div style={{
        position: 'absolute', top: -120, left: -80, right: -80, height: 300,
        background: `radial-gradient(60% 80% at 30% 40%, ${T.accent}40, transparent 70%)`,
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: `28px ${gutter}px 0` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => navigate('/')}
            aria-label={t('ordersBack')}
            style={{
              width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`,
              background: T.surface, color: T.text, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon.arrowR style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div>
            <div style={{ font: `500 11px ${T.font}`, color: T.accentFg, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{t('ordersEyebrow')}</div>
            <div style={{ font: `700 ${isDesktop ? 26 : 22}px ${T.font}`, color: T.text, letterSpacing: '-0.03em', marginTop: 4 }}>
              {stats?.store?.displayName || stats?.store?.name || tenant.name}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ color: T.danger, font: `500 13px ${T.font}`, marginBottom: 16 }}>{error}</div>
        )}

        {!error && (
          <>
            <div style={{
              display: 'grid', gap: isDesktop ? 16 : 12,
              gridTemplateColumns: `repeat(${isDesktop ? 4 : 2}, 1fr)`,
            }}>
              {cards.map((c) => (
                <StatCard key={c.id} T={T} label={c.label} value={c.value} isDesktop={isDesktop} />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '34px 0 14px' }}>
              <div style={{ font: `700 ${isDesktop ? 20 : 17}px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{t('ordersListTitle')}</div>
              <div style={{ font: `500 12px ${T.font}`, color: T.textDim }}>{t('ordersCount', { count: orders.length })}</div>
            </div>

            {orders.length === 0 ? (
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18,
                padding: '40px 24px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center', gap: 8,
              }}>
                <span style={{ width: 56, height: 56, borderRadius: 16, background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon.bag width="22" height="22" /></span>
                <div style={{ font: `700 15px ${T.font}`, color: T.text }}>{t('ordersEmpty')}</div>
                <div style={{ font: `400 12.5px/1.5 ${T.font}`, color: T.textDim, maxWidth: 280 }}>{t('ordersEmptyBody')}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orders.map((o) => (
                  <OrderRow key={o.id} T={T} order={o} t={t} onAdvance={advance} />
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ padding: '28px 0 0' }}><PoweredBy T={T} /></div>
      </div>
    </div>
  );
}
