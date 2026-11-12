// The esy account (the design's U2–U6): one identity, managed in one place.
// Every app's account menu leads here; a store, the back office and admin have
// no account screens of their own.
//
// This is the frame every section sits in: the platform's bar and footer, on a
// desktop the list of sections beside the page (AcctNav), and below a desktop a
// way back to the overview above each section. It reads the account once
// (GET /api/account) and hands it down, with where the account was opened from
// (origin.js), so a section never waits for what the frame already has.
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform, PTopBar, PFooter } from '../PlatformShared';
import { handleApiError } from '../../utils/api';
import { accountQuery, addressesQuery } from '../../core/query/queries';
import { Sk, Skeleton } from '../../components/skeleton/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { Av, Btn, Glyph, cardStyle, initialsOf, miStyle, type, usePDevice } from '../PlatformKit';
import { clearOrigin, useOrigin } from './origin';

function Page({ T, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}` }}>
      <PTopBar current="account" />
      <main style={{ flex: '1 0 auto', paddingBottom: 48 }}>{children}</main>
      <PFooter />
    </div>
  );
}

/** The frame's own measure: one column below a desktop, the sections beside the page on one. */
function wrapStyle({ ph, desk, gut }) {
  if (desk) {
    return {
      display: 'flex', gap: 40, alignItems: 'flex-start', maxWidth: 1200, margin: '0 auto',
      padding: `40px ${gut}px 0`, boxSizing: 'content-box',
    };
  }
  return { padding: ph ? `10px ${gut}px 0` : `30px ${gut}px 0` };
}

const SIDE = 264;

/** The sections, beside the page on a desktop (the design's AcctNav). */
function SideNav({ T, t, user, items, onSignOut }) {
  return (
    <aside style={{ width: SIDE, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px' }}>
        <Av T={T} ink>{initialsOf(user.name === user.email ? '' : user.name, user.email)}</Av>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</b>
          <span style={{ display: 'block', fontSize: 12, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
        </div>
      </div>
      <nav aria-label={t('hub.navLabel')} style={{ ...cardStyle(T), padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className="esy-press-soft" style={({ isActive }) => miStyle(T, isActive)}>
            <Glyph name={it.icon} />
            <span style={{ flex: 1, minWidth: 0 }}>{it.label}</span>
            {it.n != null && <span style={{ fontSize: 12.5, color: T.textDim, fontVariantNumeric: 'tabular-nums', fontWeight: 400 }}>{it.n}</span>}
          </NavLink>
        ))}
      </nav>
      <button type="button" onClick={onSignOut} className="esy-press-soft" style={{ ...miStyle(T, false), color: 'var(--k-bad)' }}>
        <Glyph name="logout" />
        <span style={{ flex: 1, minWidth: 0 }}>{t('me.signOut')}</span>
      </button>
    </aside>
  );
}

/** The frame while the account is read: the sections' column and two blocks, so nothing moves when it arrives. */
function Loading({ T, t, dev }) {
  const { ph, desk } = dev;
  const card = (h) => <Sk h={h} r="var(--k-r-card)" style={{ ...cardStyle(T), boxShadow: 'none' }} />;
  return (
    <Skeleton label={t('account.loading')} style={wrapStyle(dev)}>
      {desk && (
        <div style={{ width: SIDE, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px' }}>
            <Sk w={44} h={44} r="50%" />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Sk h={14} w="62%" r={7} />
              <Sk h={10} w="80%" r={5} />
            </div>
          </div>
          {card(296)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: ph ? 18 : 20 }}>
        {desk ? <Sk h={30} w={260} r={8} /> : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Sk w={76} h={76} r="50%" />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <Sk h={22} w="46%" r={8} />
              <Sk h={11} w="60%" r={6} />
            </div>
          </div>
        )}
        <div style={ph
          ? { display: 'flex', flexDirection: 'column', gap: 18 }
          : { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: desk ? 24 : 20, alignItems: 'start' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Sk h={11} w={110} r={6} />
            {card(76)}
            {card(66)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Sk h={11} w={150} r={6} />
            {card(168)}
          </div>
        </div>
      </div>
    </Skeleton>
  );
}

export default function AccountLayout() {
  const { T } = usePlatform();
  const dev = usePDevice();
  const { ph, desk, gut } = dev;
  const { t } = useTranslation('platform');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const origin = useOrigin();
  const ty = type(T, desk);

  // Cached: coming back to the account shows it at once while it refreshes.
  const { data = null, error = null, isPending: loading } = useQuery(accountQuery());
  const signedIn = !!data;
  // The address book's size, beside its row; nothing until it answers.
  const addresses = useQuery({ ...addressesQuery(), enabled: signedIn });

  if (loading) return <Page T={T}><Loading T={T} t={t} dev={dev} /></Page>;

  if (error && error.status === 401) {
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
  const addressCount = addresses.data ? addresses.data.length : null;
  const signOut = () => { clearOrigin(); logout(); navigate('/'); };
  const home = pathname === '/account' || pathname === '/account/';

  const items = [
    { to: '/account', end: true, icon: 'grid', label: t('hub.overview') },
    { to: '/account/orders', icon: 'receipt', label: t('hub.orders'), n: orders.length },
    { to: '/account/addresses', icon: 'pin', label: t('hub.addresses'), n: addressCount },
    { to: '/account/stores', icon: 'store', label: t('me.stores'), n: stores.length || null },
    { to: '/account/personal', icon: 'user', label: t('me.personal') },
    // Language and display is still a page of its own; it comes back here.
    { to: '/settings/display', icon: 'screen', label: t('me.display') },
  ];

  return (
    <Page T={T}>
      <div style={wrapStyle(dev)}>
        {desk && <SideNav T={T} t={t} user={user} items={items} onSignOut={signOut} />}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: ph ? 16 : 20 }}>
          {!desk && !home && (
            <Link
              to="/account"
              className="esy-press-soft"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginLeft: -4, font: `600 12.5px ${T.font}`, color: T.accentFg, textDecoration: 'none' }}
            >
              <Glyph name="back" size={16} />{t('hub.account')}
            </Link>
          )}
          <Outlet context={{ T, dev, account: data, user, stores, ownedStores, managedStores, orders, origin, addressCount, signOut }} />
        </div>
      </div>
    </Page>
  );
}
