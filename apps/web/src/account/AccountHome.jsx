// /account — the overview (the design's U2; inside a store, S1). Who you are,
// the stores you run or the offer to open one, the latest orders from every
// store, and, below a desktop, the account's sections as rows: on a desktop
// they are the list beside the page instead. Inside a store it opens with what
// this account has at that store (HereBlock).
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { langInfo } from '../components/glow/GlowPrimitives';
import { Av, Btn, Card, Glyph, Lbl, LiIc, List, cardStyle, initialsOf, type } from '../platform/PlatformKit';
import HereBlock from './HereBlock';
import { Go, NewStoreLink, OrderRow, Row, StoreRow, phoneText, srOnly, useAccount } from './parts';

/** The orders on the overview: the latest few, the rest are one row away. */
const RECENT = 3;

export default function AccountHome() {
  const { T, dev, app, user, stores, orders, addressCount, signOut, link, away, showTitle } = useAccount();
  const { ph, desk } = dev;
  const { t } = useTranslation('account');
  const { language, appearance } = useThemeMode();
  const ty = type(T, desk);

  const phone = user.phoneVerified && user.phoneNumber ? phoneText(user.phoneNumber) : '';
  const from = new Set(orders.map((o) => o.store?.subdomain).filter(Boolean)).size;
  const col = { display: 'flex', flexDirection: 'column', gap: ph ? 18 : 20, minWidth: 0 };
  const grid = ph
    ? { display: 'flex', flexDirection: 'column', gap: 18 }
    : { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: desk ? 24 : 20, alignItems: 'start' };
  const block = { display: 'flex', flexDirection: 'column', gap: 10 };
  const linkStyle = { font: `600 12.5px ${T.font}`, color: T.accentFg, textDecoration: 'none' };

  return (
    <>
      {desk ? <h1 style={showTitle ? ty.h1 : srOnly}>{t('hub.title')}</h1> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Av T={T} size="lg" ink>{initialsOf(user.name === user.email ? '' : user.name, user.email)}</Av>
          <div style={{ minWidth: 0 }}>
            {/* The page's heading, unless the app's own header line already is one (a store's phone header). */}
            {showTitle
              ? <h1 style={{ ...ty.h2, overflowWrap: 'anywhere' }}>{user.name}</h1>
              : <b style={{ ...ty.h2, display: 'block', overflowWrap: 'anywhere' }}>{user.name}</b>}
            {/* The number moves to its own line whole, never split across two. */}
            <div style={{ fontSize: 12.5, color: T.textDim, overflowWrap: 'anywhere' }}>
              {user.email}
              {phone && <>{user.email ? ' · ' : ''}<span style={{ whiteSpace: 'nowrap' }}>{phone}</span></>}
            </div>
          </div>
        </div>
      )}

      <div style={grid}>
        <div style={col}>
          {app === 'store' && <HereBlock />}

          {!desk && (
            <section style={block}>
              <Lbl T={T} as="h2">{t('hub.account')}</Lbl>
              <List T={T}>
                <Row
                  T={T} icon="receipt" to={link('/account/orders')} label={t('hub.allOrders')} meta={orders.length}
                  sub={from > 0 ? t('hub.fromStores', { count: from, n: from }) : null}
                />
                <Row T={T} icon="pin" to={link('/account/addresses')} label={t('hub.addresses')} meta={addressCount} />
                <Row T={T} icon="user" to={link('/account/personal')} label={t('me.personal')} />
                <Row
                  T={T} icon="screen" to={link('/account/display')} label={t('me.display')} last
                  sub={t('me.displaySub', {
                    appearance: t(`appearance.${appearance || 'auto'}`, { ns: 'display' }),
                    language: langInfo(language).native,
                  })}
                />
              </List>
            </section>
          )}

          <section style={block}>
            <Lbl T={T} as="h2">{t('me.stores')}</Lbl>
            {stores.map((s) => <StoreRow key={s.subdomain} T={T} t={t} ph={ph} store={s} />)}
            {stores.length > 0 ? <NewStoreLink T={T} t={t} /> : (
              <div style={{
                ...cardStyle(T), border: `1.5px dashed ${T.dark ? '#66666e' : '#b8b8be'}`, boxShadow: 'none',
                padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <LiIc T={T} name="store" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: 'block', fontSize: 12.5 }}>{t('hub.noStoreTitle')}</b>
                    <div style={{ fontSize: 12, color: T.textDim }}>{t('hub.noStoreSub')}</div>
                  </div>
                </div>
                <Btn T={T} kind="p" block {...away('/sell')}>{t('hub.noStoreCta')}</Btn>
              </div>
            )}
          </section>
        </div>

        <div style={col}>
          {!ph && (
            <section style={block}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Lbl T={T} as="h2">{t('hub.recent')}</Lbl>
                {orders.length > 0 && <Go to={link('/account/orders')} style={linkStyle}>{t('hub.seeAll')}</Go>}
              </div>
              {orders.length ? (
                <List T={T}>
                  {orders.slice(0, RECENT).map((o, i, shown) => (
                    <OrderRow key={o.orderNumber || o.id} T={T} t={t} order={o} last={i === shown.length - 1} />
                  ))}
                </List>
              ) : (
                <Card T={T} pad={16}>
                  <p style={{ margin: 0, fontSize: 12.5, color: T.textDim }}>
                    {t('me.noOrders')}{' '}
                    <Go {...away('/stores')} style={{ color: T.accentFg, fontWeight: 600, textDecoration: 'none' }}>{t('me.browse')}</Go>
                  </p>
                </Card>
              )}
            </section>
          )}

          {!desk && (
            <Btn T={T} block onClick={signOut} style={{ background: 'var(--k-bad-bg)', color: 'var(--k-bad)', boxShadow: 'none' }}>
              <Glyph name="logout" />{t('me.signOut')}
            </Btn>
          )}
        </div>
      </div>
    </>
  );
}
