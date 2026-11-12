// /account/stores — the stores this account runs (the design's U6), or the
// offer to open one when it runs none (U6b). A store you own carries its
// orders and revenue; one you manage carries neither, because the account
// summary sends a manager no money figures.
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { money } from '../../core/money';
import { safeAccent } from '../../core/tokens';
import { storeUrl } from '../platformData';
import { Alert, Av, Btn, Card, Chip, Glyph, initialsOf, type } from '../PlatformKit';
import { Head, NewChip, NewStoreLink, officeUrl, roleText, storeName, useAccount } from './parts';

function Stat({ T, label, value }) {
  return (
    <div style={{ background: T.surface2, borderRadius: 'var(--k-r-in)', padding: '12px 14px', minWidth: 0 }}>
      <span style={{ fontSize: 12, color: T.textDim }}>{label}</span>
      <b style={{ display: 'block', font: `700 20px/1.22 ${T.font}`, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums' }}>{value}</b>
    </div>
  );
}

function StoreCard({ T, t, ph, store }) {
  const name = storeName(store);
  const owner = store.myRole !== 'MANAGER';
  const open = store.status === 'live';
  return (
    <Card T={T} pad={16} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Av T={T} color={safeAccent(store.primaryColor)}>{initialsOf(name)}</Av>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b>{name}</b>
            <NewChip T={T} t={t} n={Number(store.newOrders) || 0} />
          </div>
          <div style={{ fontSize: 12, color: T.textDim, overflowWrap: 'anywhere' }}>
            {t('me.host', { sub: store.subdomain })}{' · '}{roleText(t, store)}
          </div>
        </div>
        {!ph && <Chip T={T} tone={open ? 'done' : 'canc'}>{open ? t('hub.storeOpen') : t('hub.storeClosed')}</Chip>}
      </div>
      {owner ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <Stat T={T} label={t('hub.statOrders')} value={String(store.orders ?? 0)} />
          <Stat T={T} label={t('hub.statRevenue')} value={money(store.revenue ?? 0)} />
        </div>
      ) : (
        <Alert T={T} style={{ padding: '12px 14px' }}>{t('hub.managerNote')}</Alert>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn T={T} kind={owner ? 'p' : 's'} size="sm" ph={ph} href={officeUrl(store)} style={{ flex: 1 }}>{t('me.panel')}</Btn>
        <Btn T={T} size="sm" ph={ph} href={storeUrl(store)} style={{ flex: 1 }}>{t('hub.viewStore')}</Btn>
      </div>
    </Card>
  );
}

export default function AccountStores() {
  const { T, dev, stores } = useAccount();
  const { ph, desk } = dev;
  const { t } = useTranslation('platform');
  const ty = type(T, desk);

  if (!stores.length) {
    return (
      <>
        <Head T={T} desk={desk} title={t('me.stores')} />
        <Card T={T} pad={22}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: 24 }}>
            <span style={{ width: 96, height: 96, borderRadius: '50%', background: T.surface2, color: T.accentFg, display: 'grid', placeItems: 'center' }}>
              <Glyph name="store" size={40} />
            </span>
            <h2 style={ty.h2}>{t('hub.noStoreTitle')}</h2>
            <p style={{ ...ty.body, color: T.textDim, maxWidth: 400 }}>{t('hub.noStoreBody')}</p>
            <Btn T={T} kind="p" to="/sell">{t('hub.noStoreCta')}</Btn>
            <Link to="/#how" style={{ font: `600 12.5px ${T.font}`, color: T.accentFg, textDecoration: 'none' }}>{t('hub.how')}</Link>
          </div>
        </Card>
        <Alert T={T}>{t('hub.roleHint')}</Alert>
      </>
    );
  }

  return (
    <>
      <Head T={T} desk={desk} title={t('me.stores')} />
      <div style={ph
        ? { display: 'grid', gap: 12 }
        : { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: desk ? 20 : 16, alignItems: 'start' }}
      >
        {stores.map((s) => <StoreCard key={s.subdomain} T={T} t={t} ph={ph} store={s} />)}
        <NewStoreLink T={T} t={t} style={{ minHeight: 72 }} />
      </div>
    </>
  );
}
