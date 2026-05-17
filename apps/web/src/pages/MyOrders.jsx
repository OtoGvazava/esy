import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useOrders } from '../contexts/OrdersContext';
import { useAuth } from '../contexts/AuthContext';
import { useGlow } from '../styles/glow';
import { Icon, PoweredBy } from '../components/glow/GlowPrimitives';
import { GlowScreen, GlowTopNav, money } from '../components/glow/GlowChrome';

const MyOrders = () => {
  const { T } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const { orders, getTotalSpent } = useOrders();
  const { user } = useAuth();

  const [tab, setTab] = useState('all');

  const eyebrow = {
    font: `500 10.5px ${T.font}`,
    color: T.textMute,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };

  if (!user) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('orders.title')} onBack={() => navigate(-1)} />
        <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: T.surface, border: `1px solid ${T.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.accentFg }}>
            <Icon.bag width="34" height="34" />
          </div>
          <div style={{ font: `700 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{t('orders.title')}</div>
          <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim, maxWidth: 260 }}>{t('orders.signInRequired')}</div>
        </div>
      </GlowScreen>
    );
  }

  const tabDefs = [
    { id: 'all', label: t('orders.tab.all') },
    { id: 'processing', label: t('orders.tab.processing') },
    { id: 'shipped', label: t('orders.tab.shipped') },
    { id: 'delivered', label: t('orders.tab.delivered') },
    { id: 'cancelled', label: t('orders.tab.cancelled') },
  ];
  const countFor = (id) => (id === 'all' ? orders.length : orders.filter((o) => o.status === id).length);
  const filtered = tab === 'all' ? orders : orders.filter((o) => o.status === tab);

  const spent = getTotalSpent();
  const stats = [
    { v: String(orders.length), k: t('orders.stat.total') },
    { v: money(spent), k: t('orders.stat.spent') },
    { v: money(orders.length ? spent / orders.length : 0), k: t('orders.stat.avg') },
  ];

  const activeLabel = (tabDefs.find((d) => d.id === tab) || tabDefs[0]).label.toLowerCase();

  return (
    <GlowScreen T={T}>
      <GlowTopNav T={T} title={t('orders.title')} onBack={() => navigate(-1)} />
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ padding: '6px 22px 14px' }}>
          <div style={{ font: `700 24px ${T.font}`, color: T.text, letterSpacing: '-0.03em' }}>{t('orders.heading')}</div>
          <div style={{ font: `400 12.5px ${T.font}`, color: T.textDim, marginTop: 4 }}>{t('orders.acrossStores')}</div>
        </div>

        {/* stat tiles */}
        <div style={{ padding: '0 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {stats.map((x, i) => (
            <div key={i} style={{ padding: '14px 12px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: `800 17px ${T.font}`, color: T.text, letterSpacing: '-0.03em' }}>{x.v}</span>
              <span style={eyebrow}>{x.k}</span>
            </div>
          ))}
        </div>

        {/* status chip strip */}
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabDefs.map((d) => {
            const active = d.id === tab;
            return (
              <button key={d.id} onClick={() => setTab(d.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 999, cursor: 'pointer',
                background: active ? T.accent : T.surface,
                color: active ? '#fff' : T.text,
                border: `1px solid ${active ? T.accent : T.border}`,
                font: `600 12px ${T.font}`, whiteSpace: 'nowrap',
              }}>
                {d.label}
                <span style={{
                  minWidth: 16, height: 16, padding: '0 5px', borderRadius: 999,
                  background: active ? 'rgba(255,255,255,0.22)' : T.accentBg,
                  color: active ? '#fff' : T.accentFg,
                  font: `700 9.5px ${T.font}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{countFor(d.id)}</span>
              </button>
            );
          })}
        </div>

        {/* list */}
        <div style={{ padding: '0 16px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '36px 24px', borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, textAlign: 'center' }}>
              <div style={{ font: `600 13.5px ${T.font}`, color: T.text }}>
                {tab === 'all' ? t('orders.emptyTitle') : t('orders.emptyTab', { status: activeLabel })}
              </div>
              <div style={{ font: `400 12px ${T.font}`, color: T.textMute, marginTop: 4 }}>
                {tab === 'all' ? t('orders.emptyBody') : t('orders.emptyTabSub')}
              </div>
            </div>
          ) : filtered.map((o, idx) => {
            const id = (o.orderNumber || o.id || `ESY-${idx}`).toString().toUpperCase();
            const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
            const n = o.count ?? (Array.isArray(o.items) ? o.items.length : '—');
            const status = (o.status || 'placed').toLowerCase();
            const statusKey = o.statusKey || status.replace(/ /g, '_');
            const tone = status === 'delivered' || status === 'completed' ? T.success
              : status === 'cancelled' ? T.danger : T.accentFg;
            return (
              <div key={o.id || idx} style={{ padding: '14px', borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
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
};

export default MyOrders;
