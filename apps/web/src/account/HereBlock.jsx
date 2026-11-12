// The overview's first block inside a store (the design's S1): this store,
// what this account ordered here and spent, the latest two of those orders
// (each this store's own page), and, for the store's own team, its back
// office, which is another app and so opens in a new tab.
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { money } from '../core/money';
import { safeAccent } from '../core/tokens';
import { Av, Chip, Lbl, List, initialsOf, liStyle } from '../platform/PlatformKit';
import { Go, OrderRow, Row, isCancelled, officeUrl, outProps, storeName, useAccount } from './parts';

/** The orders shown here: the latest two; the store's own orders page has the rest. */
const LATEST = 2;

export default function HereBlock() {
  const { T, here, orders, out } = useAccount();
  const { t } = useTranslation('account');
  const { canManageStore, isStoreOwner } = useAuth();
  const { tenant } = useTenant();
  if (!here) return null;

  const mine = orders.filter((o) => o.store?.subdomain === here);
  // What was spent is what was kept: a cancelled order is not money spent.
  const spent = mine.filter((o) => !isCancelled(o)).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const latest = mine.slice(0, LATEST);
  const name = storeName(tenant) || here;
  // Platform ADMIN grants nothing inside a store: only its own team sees the back office.
  const office = !!canManageStore;
  const linkStyle = { font: `600 12.5px ${T.font}`, color: T.accentFg, textDecoration: 'none' };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Lbl T={T} as="h2">{t('hub.hereStore')}</Lbl>
        {mine.length > 0 && <Go to="/orders" style={linkStyle}>{t('hub.seeAll')}</Go>}
      </div>
      <List T={T}>
        <div style={liStyle(T, !latest.length && !office)}>
          <Av T={T} size="sm" color={safeAccent(tenant?.primaryColor)}>{initialsOf(name)}</Av>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', fontSize: 12.5, overflowWrap: 'anywhere' }}>{name}</b>
            <div style={{ fontSize: 12, color: T.textDim }}>
              {mine.length
                ? `${t('hub.ordersCount', { count: mine.length, n: mine.length })} · ${money(spent)}`
                : t('hub.noOrdersHere')}
            </div>
          </div>
        </div>
        {latest.map((o, i) => (
          <OrderRow key={o.orderNumber || o.id} T={T} t={t} order={o} bare last={!office && i === latest.length - 1} />
        ))}
        {office && (
          <Row
            T={T} icon="store" label={t('hub.officeRow')} href={officeUrl({ subdomain: here })} {...outProps(out)} last
            chip={<Chip T={T} tone="conf" nd>{isStoreOwner ? t('me.owner') : t('me.manager')}</Chip>}
          />
        )}
      </List>
    </section>
  );
}
