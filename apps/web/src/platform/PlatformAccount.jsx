// The esy account (the design's L4): one identity across every store. Who you
// are, the stores you run — with how many new orders each is waiting on and a
// way into its back office — the orders you placed anywhere, and the account's
// own settings. Desktop sets the shopping column beside the stores; a phone
// and a tablet stack them.
//
// Everything here comes from GET /api/account. The design's "N new" chip is
// the store's placed-and-not-yet-acted-on orders, and an order row names its
// first item, both carried by that response.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform, PTopBar, PFooter } from './PlatformShared';
import { storeUrl } from './platformData';
import { handleApiError } from '../utils/api';
import { accountQuery } from '../core/query/queries';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';
import { managerUrl } from '../utils/hosts';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { money } from '../core/money';
import { safeAccent } from '../core/tokens';
import { langInfo } from '../components/glow/GlowPrimitives';
import { Av, Btn, Card, Chip, Glyph, Lbl, List, LiIc, cardStyle, initialsOf, liStyle, type, usePDevice } from './PlatformKit';

// A shopper's order status: one hue per status, as the design review settled
// (placed amber, shipped indigo, out for delivery blue, delivered green,
// cancelled grey). The API sends the enum lower-cased with spaces.
const STATUS = {
  placed: ['placed', 'pend'],
  shipped: ['shipped', 'ship'],
  'out for delivery': ['out_for_delivery', 'conf'],
  delivered: ['delivered', 'done'],
  cancelled: ['cancelled', 'canc'],
};

/** The orders shown before "show all": the latest few, so the settings stay in reach. */
const RECENT = 5;

/** A Georgian mobile as the design writes it, "+995 555 12 34 56"; anything else as stored. */
function phoneText(p) {
  const m = String(p || '').replace(/\D/g, '').match(/^(?:995)?(5\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+995 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : String(p || '').trim();
}

function Page({ T, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}` }}>
      <PTopBar current="account" />
      <main style={{ flex: '1 0 auto', paddingBottom: 48 }}>{children}</main>
      <PFooter />
    </div>
  );
}

function StoreRow({ T, t, ph, store }) {
  const color = safeAccent(store.primaryColor);
  const name = store.displayName || store.name || store.subdomain;
  const fresh = Number(store.newOrders) || 0;
  return (
    <Card T={T} pad={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: ph ? 'wrap' : 'nowrap' }}>
      <Av T={T} color={color}>{initialsOf(name)}</Av>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 12.5 }}>{name}</b>
          {fresh > 0 && (
            <Chip T={T} tone="brand" nd aria-label={t('me.newAria', { count: fresh, n: fresh })} style={{ height: 20, padding: '0 8px', fontSize: 11.5 }}>
              {t('me.newChip', { count: fresh, n: fresh })}
            </Chip>
          )}
        </div>
        <div style={{ fontSize: 12, color: T.textDim }}>
          <a href={storeUrl(store)} style={{ color: 'inherit', textDecoration: 'none' }}>{t('me.host', { sub: store.subdomain })}</a>
          {' · '}{store.myRole === 'MANAGER' ? t('me.manager') : t('me.owner')}
        </div>
      </div>
      <Btn
        T={T}
        kind="p"
        size="sm"
        ph={ph}
        href={managerUrl(`/?tenant=${encodeURIComponent(store.subdomain)}`)}
        style={ph ? { flex: '1 0 100%' } : undefined}
      >
        {t('me.panel')}
      </Btn>
    </Card>
  );
}

function OrderRow({ T, t, order, last }) {
  const s = order.store || {};
  const name = s.displayName || s.name || s.subdomain || '';
  const [key, tone] = STATUS[order.status] || [order.status, 'canc'];
  const what = order.firstItem
    ? (order.items > 1 ? t('me.itemMore', { title: order.firstItem, count: order.items - 1, n: order.items - 1 }) : order.firstItem)
    : t('me.items', { count: order.items || 0, n: order.items || 0 });
  const href = s.subdomain ? `${storeUrl(s)}/orders/${encodeURIComponent(order.orderNumber)}` : undefined;
  return (
    <a href={href} style={liStyle(T, last)}>
      <Av T={T} size="sm" color={safeAccent(s.primaryColor)}>{initialsOf(name)}</Av>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t('me.orderTitle', { store: name, number: order.orderNumber })}
        </b>
        <div style={{ fontSize: 12, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t('me.orderSub', { what, total: money(order.total) })}
        </div>
      </div>
      <Chip T={T} tone={tone}>{t(`orders.status.${key}`, { ns: 'storefront', defaultValue: order.status })}</Chip>
    </a>
  );
}

export default function PlatformAccount() {
  const { T } = usePlatform();
  const { ph, tab, desk, gut } = usePDevice();
  const { t } = useTranslation('platform');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { language, appearance } = useThemeMode();
  const [allOrders, setAllOrders] = useState(false);
  const ty = type(T, desk);

  // Cached: coming back to the account shows it at once while it refreshes.
  const { data = null, error = null, isPending: loading } = useQuery(accountQuery());
  const notSignedIn = !loading && error && error.status === 401;

  // The page's own columns while it loads — who you are, your stores, and the
  // orders and settings beside them — so nothing moves when it arrives.
  if (loading) {
    const wrap = desk
      ? { display: 'flex', gap: 40, padding: '40px 0 0', maxWidth: 1080, margin: '0 auto', alignItems: 'flex-start' }
      : { display: 'flex', flexDirection: 'column', gap: ph ? 18 : 22, padding: ph ? `10px ${gut}px 0` : `30px ${gut}px 0` };
    const card = (h) => <Sk h={h} r="var(--k-r-card)" style={{ ...cardStyle(T), boxShadow: 'none' }} />;
    return (
      <Page T={T}>
        <Skeleton label={t('account.loading')} style={wrap}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: ph ? 16 : tab ? 18 : 20, ...(desk ? { flex: 1, minWidth: 0 } : null) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Sk w={76} h={76} r="50%" />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <Sk h={24} w="46%" r={8} />
                <Sk h={11} w="60%" r={6} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Sk h={11} w={90} r={6} />
              {card(76)}
              {card(56)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...(desk ? { width: 480, flex: 'none' } : null) }}>
            <Sk h={11} w={110} r={6} />
            {card(196)}
          </div>
        </Skeleton>
      </Page>
    );
  }

  if (notSignedIn) {
    return (
      <Page T={T}>
        <div style={{ maxWidth: 440, margin: '0 auto', padding: `72px ${gut}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <span style={{ width: 72, height: 72, borderRadius: '50%', background: T.surface2, color: T.accentFg, display: 'grid', placeItems: 'center' }}>
            <Glyph name="user" size={34} />
          </span>
          <h1 style={ty.h2}>{t('account.signInTitle')}</h1>
          <p style={{ ...ty.body, color: T.textDim }}>{t('account.signInBody')}</p>
          <Btn T={T} kind="p" size="lg" block to="/signin" style={{ marginTop: 8 }}>{t('account.signIn')}</Btn>
        </div>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page T={T}>
        <div role="alert" style={{ textAlign: 'center', padding: '100px 22px', color: T.danger, font: `500 13px ${T.font}` }}>
          {handleApiError(error, t('account.loadError'))}
        </div>
      </Page>
    );
  }

  const { user = {}, ownedStores = [], managedStores = [], orders = [] } = data;
  const stores = [...ownedStores, ...managedStores.filter((m) => !ownedStores.some((o) => o.subdomain === m.subdomain))];
  const contact = [user.email, user.phoneVerified && user.phoneNumber ? phoneText(user.phoneNumber) : null].filter(Boolean).join(' · ');
  const shownOrders = allOrders ? orders : orders.slice(0, RECENT);
  const signOut = () => { logout(); navigate('/'); };

  const wrap = desk
    ? { display: 'flex', gap: 40, padding: '40px 0 0', maxWidth: 1080, margin: '0 auto', alignItems: 'flex-start' }
    : { display: 'flex', flexDirection: 'column', gap: ph ? 18 : 22, padding: ph ? `10px ${gut}px 0` : `30px ${gut}px 0` };

  const settings = [
    { id: 'personal', icon: 'user', label: t('me.personal'), sub: t('me.personalSub'), to: '/account/personal', hideSubOnPhone: true },
    {
      id: 'display',
      icon: 'moon',
      label: t('me.display'),
      sub: t('me.displaySub', {
        appearance: t(`appearance.${appearance || 'auto'}`, { ns: 'display' }),
        language: langInfo(language).native,
      }),
      to: '/settings/display',
    },
  ];

  return (
    <Page T={T}>
      <div style={wrap}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: ph ? 16 : tab ? 18 : 20, ...(desk ? { flex: 1, minWidth: 0 } : null) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Av T={T} size="lg" ink>{initialsOf(user.name === user.email ? '' : user.name, user.email)}</Av>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ ...ty.h2, overflowWrap: 'anywhere' }}>{user.name}</h1>
              <div style={{ fontSize: 12.5, color: T.textDim, overflowWrap: 'anywhere' }}>{contact}</div>
            </div>
          </div>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Lbl T={T} as="h2">{t('me.stores')}</Lbl>
            {stores.map((s) => <StoreRow key={s.subdomain} T={T} t={t} ph={ph} store={s} />)}
            <Link
              to="/sell"
              style={{
                ...cardStyle(T), border: `1.5px dashed ${T.dark ? '#66666e' : '#b8b8be'}`, boxShadow: 'none',
                display: 'flex', alignItems: 'center', gap: 12, padding: 16, textDecoration: 'none', color: 'inherit',
              }}
            >
              <LiIc T={T} name="plus" />
              <b style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{t('me.openStore')}</b>
            </Link>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...(desk ? { width: 480, flex: 'none' } : null) }}>
          <Lbl T={T} as="h2">{t('me.orders')}</Lbl>
          {orders.length ? (
            <List T={T}>
              {shownOrders.map((o, i) => (
                <OrderRow key={o.orderNumber || o.id} T={T} t={t} order={o} last={i === shownOrders.length - 1 && shownOrders.length === orders.length} />
              ))}
              {orders.length > shownOrders.length && (
                <button
                  type="button"
                  onClick={() => setAllOrders(true)}
                  style={{ ...liStyle(T, true), minHeight: 48, justifyContent: 'center', cursor: 'pointer', color: T.accentFg, fontWeight: 600, fontSize: 12.5 }}
                >
                  {t('me.allOrders', { count: orders.length, n: orders.length })}
                </button>
              )}
            </List>
          ) : (
            <Card T={T} pad={16}>
              <p style={{ margin: 0, fontSize: 12.5, color: T.textDim }}>
                {t('me.noOrders')}{' '}
                <Link to="/stores" style={{ color: T.accentFg, fontWeight: 600, textDecoration: 'none' }}>{t('me.browse')}</Link>
              </p>
            </Card>
          )}

          <List T={T}>
            {settings.map((s) => (
              <Link key={s.id} to={s.to} style={liStyle(T, false)}>
                <LiIc T={T} name={s.icon} />
                <span style={{ flex: 1, minWidth: 0 }}>{s.label}</span>
                {!(ph && s.hideSubOnPhone) && <span style={{ fontSize: 12.5, color: T.textDim, whiteSpace: 'nowrap' }}>{s.sub}</span>}
              </Link>
            ))}
            <button type="button" onClick={signOut} style={{ ...liStyle(T, true), cursor: 'pointer' }}>
              <LiIc T={T} name="logout" />
              <span style={{ flex: 1, minWidth: 0, color: 'var(--k-bad)' }}>{t('me.signOut')}</span>
            </button>
          </List>
        </div>
      </div>
    </Page>
  );
}
