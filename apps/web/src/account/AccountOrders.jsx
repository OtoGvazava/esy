// /account/orders — everything this account ordered, at every store, in one
// list (the design's U4). The pills narrow it to one store. A row opens the
// order on the store it was placed at, where its tracking and the store's
// contacts are: inside that store its own page, from anywhere else a new tab.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, List, liStyle } from '../platform/PlatformKit';
import { Go, Head, OrderRow, dayText, storeName, useAccount } from './parts';

/** The rows shown before "show more", and how many each press adds. */
const STEP = 10;

const ALL = '';

function FilterPill({ T, on, onClick, children, count }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="esy-press-soft"
      style={{
        height: 38, padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 6,
        borderRadius: 999, whiteSpace: 'nowrap', flex: 'none', boxSizing: 'border-box', cursor: 'pointer',
        background: on ? 'var(--k-pill-on)' : 'var(--k-pill-bg)', color: on ? 'var(--k-pill-on-fg)' : T.text,
        border: on ? '1px solid transparent' : 'var(--k-pill-bd)', font: `${on ? 600 : 500} 13.5px ${T.font}`,
      }}
    >
      {children}
      <span style={{ opacity: 0.62, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </button>
  );
}

export default function AccountOrders() {
  const { T, dev, orders, away } = useAccount();
  const { ph, desk } = dev;
  const { t, i18n } = useTranslation('account');

  // The stores bought from, in the order of their latest order, with how many each has.
  const shops = useMemo(() => {
    const seen = new Map();
    orders.forEach((o) => {
      const sub = o.store?.subdomain;
      if (!sub) return;
      const at = seen.get(sub);
      if (at) at.n += 1;
      else seen.set(sub, { sub, name: storeName(o.store), n: 1 });
    });
    return [...seen.values()];
  }, [orders]);

  const [shop, setShop] = useState(ALL);
  const [limit, setLimit] = useState(STEP);
  const pick = (sub) => { setShop(sub); setLimit(STEP); };

  const list = shop === ALL ? orders : orders.filter((o) => o.store?.subdomain === shop);
  const shown = list.slice(0, limit);

  return (
    <>
      <Head T={T} desk={desk} title={t('hub.ordersTitle')} sub={t('hub.ordersSub')} />
      {!orders.length ? (
        <Card T={T} pad={16}>
          <p style={{ margin: 0, fontSize: 12.5, color: T.textDim }}>
            {t('me.noOrders')}{' '}
            <Go {...away('/stores')} style={{ color: T.accentFg, fontWeight: 600, textDecoration: 'none' }}>{t('me.browse')}</Go>
          </p>
        </Card>
      ) : (
        <>
          {shops.length > 1 && (
            <div role="group" aria-label={t('hub.filterLabel')} style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', margin: ph ? '0 -16px' : 0, padding: ph ? '0 16px' : 0 }}>
              <FilterPill T={T} on={shop === ALL} onClick={() => pick(ALL)} count={orders.length}>{t('hub.all')}</FilterPill>
              {shops.map((s) => (
                <FilterPill key={s.sub} T={T} on={shop === s.sub} onClick={() => pick(s.sub)} count={s.n}>{s.name}</FilterPill>
              ))}
            </div>
          )}
          <List T={T}>
            {shown.map((o) => (
              <OrderRow key={o.orderNumber || o.id} T={T} t={t} order={o} day={ph ? null : dayText(o.placed, i18n.language)} />
            ))}
            <div style={{ ...liStyle(T, true), justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
                {t('hub.shown', { shown: shown.length, total: list.length })}
              </span>
              {list.length > shown.length && (
                <button
                  type="button"
                  onClick={() => setLimit((n) => n + STEP)}
                  className="esy-press-soft"
                  style={{
                    height: ph ? 40 : 38, padding: '0 15px', borderRadius: 'var(--k-r-btn)', border: 0, cursor: 'pointer',
                    background: 'transparent', color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}`, font: `600 13.5px/1 ${T.font}`,
                  }}
                >
                  {t('hub.more')}
                </button>
              )}
            </div>
          </List>
        </>
      )}
    </>
  );
}
