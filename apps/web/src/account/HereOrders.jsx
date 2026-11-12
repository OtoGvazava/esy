// /account/orders inside a store (the design's S2): what this account ordered
// at this store, each opening as the store's own order page. Orders from every
// store are esy.ge's (U4), so the way there opens esy.ge in a new tab.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../contexts/TenantContext';
import { platformUrl } from '../utils/hosts';
import { Btn, Card, Glyph, List } from '../platform/PlatformKit';
import { Go, Head, OrderRow, ShownRow, dayText, srOnly, storeName, useAccount } from './parts';

/** The rows shown before "show more", and how many each press adds. */
const STEP = 10;

export default function HereOrders() {
  const { T, dev, here, orders } = useAccount();
  const { ph, desk } = dev;
  const { t, i18n } = useTranslation('account');
  const { tenant } = useTenant();
  const [limit, setLimit] = useState(STEP);

  const mine = orders.filter((o) => o.store?.subdomain === here);
  const shown = mine.slice(0, limit);
  const all = { href: platformUrl('/account/orders'), target: '_blank', rel: 'noopener noreferrer' };
  const newTab = <span style={srOnly}>{` (${t('acct.newTab', { ns: 'navbar' })})`}</span>;

  return (
    <>
      <Head
        T={T} desk={desk} title={t('hub.hereOrdersTitle')}
        sub={t('hub.hereOrdersSub', { store: storeName(tenant) || here })}
        action={!ph && (
          <Btn T={T} size="sm" {...all}>
            {t('hub.allOrders')}{newTab}
            <Glyph name="ext" size={16} style={{ color: T.textDim }} />
          </Btn>
        )}
      />
      {ph && (
        <a {...all} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', font: `600 12.5px ${T.font}`, color: T.accentFg, textDecoration: 'none' }}>
          {t('hub.allOrdersEsy')}{newTab}
          <Glyph name="ext" size={15} />
        </a>
      )}
      {!mine.length ? (
        <Card T={T} pad={16}>
          <p style={{ margin: 0, fontSize: 12.5, color: T.textDim }}>
            {t('hub.noOrdersHere')}{' '}
            <Go to="/" style={{ color: T.accentFg, fontWeight: 600, textDecoration: 'none' }}>{t('hub.shopHere')}</Go>
          </p>
        </Card>
      ) : (
        <List T={T}>
          {shown.map((o) => (
            <OrderRow key={o.orderNumber || o.id} T={T} t={t} order={o} bare day={ph ? null : dayText(o.placed, i18n.language)} />
          ))}
          <ShownRow T={T} t={t} ph={ph} shown={shown.length} total={mine.length} onMore={() => setLimit((n) => n + STEP)} />
        </List>
      )}
    </>
  );
}
