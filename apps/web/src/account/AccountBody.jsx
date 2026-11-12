// The esy account's body (the design's U2–U7, and S1–S8 inside each app): the
// same sections in every app, drawn inside that app's own frame, so nobody
// leaves the store, the back office or admin to manage their account.
//
// Each app mounts this inside its own chrome (platform/account/AccountLayout,
// pages/AccountPage, manager/ManagerAccount, admin/AdminAccount) and says how
// it differs: the app (`app`), the store it is on (`here`), how a link to
// another section is written there (`link`: the back office keeps ?tenant=),
// whether the page draws its own title or the app's bar does (`showTitle`),
// and whether it keeps its own page measure (`padded`) or sits in the app's.
//
// It reads the account once (GET /api/account) and hands it down, so a section
// never waits for what the body already has. Signed out there is one section:
// language and display, kept in the browser, with the offer to sign in.
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../utils/api';
import { platformUrl } from '../utils/hosts';
import { accountQuery, addressesQuery } from '../core/query/queries';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { Av, Btn, Card, Glyph, cardStyle, initialsOf, miStyle, type, usePDevice } from '../platform/PlatformKit';
import { sectionOf } from './sections';

/** The body's measure: its own page on esy.ge and a store, the app's page in the back office and admin. */
function wrapStyle({ ph, desk, gut }, padded) {
  if (!padded) return desk ? { display: 'flex', gap: 32, alignItems: 'flex-start' } : {};
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

/** Signed out, on a desktop: the one section there is, and the offer to sign in. */
function GuestNav({ T, t, display }) {
  return (
    <aside style={{ width: SIDE, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px' }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', background: T.surface2, color: T.text, display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Glyph name="user" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block' }}>{t('hub.guest')}</b>
          <span style={{ display: 'block', fontSize: 12, color: T.textDim }}>{t('hub.guestSub')}</span>
        </div>
      </div>
      <nav aria-label={t('hub.navLabel')} style={{ ...cardStyle(T), padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavLink to={display} className="esy-press-soft" style={({ isActive }) => miStyle(T, isActive)}>
          <Glyph name="screen" />
          <span style={{ flex: 1, minWidth: 0 }}>{t('me.display')}</span>
        </NavLink>
      </nav>
      <Card T={T} pad={16} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 12.5, color: T.textDim }}>{t('hub.guestSignIn')}</span>
        <Btn T={T} kind="p" size="sm" block to="/signin">{t('hub.signIn')}</Btn>
      </Card>
    </aside>
  );
}

/** Signed out anywhere but language and display: what an account needs first. */
function SignInCard({ T, t, gut }) {
  const ty = type(T, false);
  return (
    <div style={{ maxWidth: 440, margin: '0 auto', padding: `72px ${gut}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
      <span style={{ width: 72, height: 72, borderRadius: '50%', background: T.surface2, color: T.accentFg, display: 'grid', placeItems: 'center' }}>
        <Glyph name="user" size={34} />
      </span>
      <h1 style={ty.h2}>{t('gate.signInTitle')}</h1>
      <p style={{ ...ty.body, color: T.textDim }}>{t('gate.signInBody')}</p>
      <Btn T={T} kind="p" size="lg" block to="/signin" style={{ marginTop: 8 }}>{t('gate.signIn')}</Btn>
    </div>
  );
}

/** The body while the account is read: the sections' column and two blocks, so nothing moves when it arrives. */
function Loading({ T, t, dev, padded }) {
  const { ph, desk } = dev;
  const card = (h) => <Sk h={h} r="var(--k-r-card)" style={{ ...cardStyle(T), boxShadow: 'none' }} />;
  return (
    <Skeleton label={t('gate.loading')} style={wrapStyle(dev, padded)}>
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

const same = (path) => path;

export default function AccountBody({
  app, T, here = null, link = same, showTitle = true, padded = true, crumb = false, signIn, onSignedOut,
}) {
  const dev = usePDevice();
  const { desk, gut } = dev;
  const { t } = useTranslation('account');
  const { pathname } = useLocation();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const section = sectionOf(pathname);
  const guest = !authLoading && !isAuthenticated;

  // Cached: coming back to the account shows it at once while it refreshes.
  const { data = null, error = null, isPending } = useQuery({ ...accountQuery(), enabled: isAuthenticated });
  // The address book's size, beside its row; nothing until it answers.
  const addresses = useQuery({ ...addressesQuery(), enabled: !!data });

  // Leaving the app: esy.ge's own pages, and other stores and apps, open in a new tab anywhere but esy.ge.
  const out = app !== 'platform';
  const away = (path) => (out
    ? { href: platformUrl(path), target: '_blank', rel: 'noopener noreferrer' }
    : { to: path });
  const base = { T, dev, app, here, link, away, out, showTitle };

  if (authLoading || (isAuthenticated && isPending)) return <Loading T={T} t={t} dev={dev} padded={padded} />;

  if (guest) {
    // Language and display needs no account: the choices are kept in this browser.
    if (section !== 'display') return signIn || <SignInCard T={T} t={t} gut={gut} />;
    return (
      <div style={wrapStyle(dev, padded)}>
        {desk && <GuestNav T={T} t={t} display={link('/account/display')} />}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dev.ph ? 16 : 20 }}>
          <Outlet context={{ ...base, guest: true }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div role="alert" style={{ textAlign: 'center', padding: '100px 22px', color: T.danger, font: `500 13px ${T.font}` }}>
        {handleApiError(error, t('gate.loadError'))}
      </div>
    );
  }

  const { user = {}, ownedStores = [], managedStores = [], orders = [] } = data;
  const stores = [...ownedStores, ...managedStores.filter((m) => !ownedStores.some((o) => o.subdomain === m.subdomain))];
  const addressCount = addresses.data ? addresses.data.length : null;
  const signOut = () => { logout(); onSignedOut?.(); };

  const items = [
    { to: link('/account'), end: true, icon: 'grid', label: t('hub.overview') },
    { to: link('/account/orders'), icon: 'receipt', label: t('hub.orders'), n: orders.length },
    { to: link('/account/addresses'), icon: 'pin', label: t('hub.addresses'), n: addressCount },
    { to: link('/account/stores'), icon: 'store', label: t('me.stores'), n: stores.length || null },
    { to: link('/account/personal'), icon: 'user', label: t('me.personal') },
    { to: link('/account/display'), icon: 'screen', label: t('me.display') },
  ];

  return (
    <div style={wrapStyle(dev, padded)}>
      {desk && <SideNav T={T} t={t} user={user} items={items} onSignOut={signOut} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: dev.ph ? 16 : 20 }}>
        {/* Where the app's own bar has no way back (esy.ge), the section says where it sits. */}
        {crumb && !desk && section && (
          <Link
            to={link('/account')}
            className="esy-press-soft"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginLeft: -4, font: `600 12.5px ${T.font}`, color: T.accentFg, textDecoration: 'none' }}
          >
            <Glyph name="back" size={16} />{t('hub.account')}
          </Link>
        )}
        <Outlet context={{
          ...base, guest: false, account: data, user, stores, ownedStores, managedStores, orders, addressCount, signOut,
        }} />
      </div>
    </div>
  );
}
