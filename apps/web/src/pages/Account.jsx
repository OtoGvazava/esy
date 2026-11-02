import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrdersContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { useGlow } from '../styles/glow';
import { useBottomClearance } from '../core/design/useDesign';
import { addressesQuery } from '../core/query/queries';
import { langInfo } from '../components/glow/GlowPrimitives';
import { money } from '../components/glow/GlowChrome';
import { G, Sk, Thumb, initials, useDev } from '../components/shop/kit';
import { Sk as SkBlock, Skeleton } from '../components/skeleton/Skeleton';
import { managerUrl, platformUrl } from '../utils/hosts';
import SignIn from './SignIn';

// An order's chip, in the board's tones: on its way is "ship", cancelled is "ref".
const TONE = { placed: 'c-pend', shipped: 'c-ship', out_for_delivery: 'c-ship', delivered: 'c-done', cancelled: 'c-ref' };

// The design's frames (D1): one column on a phone and a tablet; on a desktop
// the profile and recent orders on the left, the settings in a 460 px column
// (narrower below 1200 px, so the two still fit).
const FRAME = {
  ph: { wrap: { padding: '6px 16px 0' }, cols: { display: 'flex', flexDirection: 'column', gap: 16 }, left: { gap: 16 }, right: { gap: 10 } },
  tab: { wrap: { padding: '8px 28px 0' }, cols: { display: 'flex', flexDirection: 'column', gap: 20 }, left: { gap: 18 }, right: { gap: 10 } },
  desk: {
    // The title sits in the same centred column as the cards, so they share one left edge.
    wrap: { display: 'flex', flexDirection: 'column', gap: 20, padding: '32px var(--gut) 0', maxWidth: 1200, margin: '0 auto', boxSizing: 'content-box' },
    cols: { display: 'flex', gap: 32, alignItems: 'flex-start' },
    left: { gap: 20, flex: 1, minWidth: 0 },
    right: { gap: 10, width: 'min(460px, 42%)', flex: 'none' },
  },
};

// The board while the session is restored and the orders are first read: the
// profile card, its two figures and the settings in their own places, each
// block the height of its line, so the board lands without moving. What is
// always there is drawn; the recent orders, there only for some, are not.
function AccountSkeleton({ t, f }) {
  const line = (h, w, box) => <SkBlock h={h} w={w} r={Math.min(8, h / 2)} style={{ margin: `${(box - h) / 2}px 0` }} />;
  return (
    <Skeleton label={t('common:loading.profile')} style={f.cols}>
      <div className="stk" style={f.left}>
        <div className="card padl stk" style={{ gap: 14 }}>
          <div className="row" style={{ gap: 14 }}>
            <SkBlock w={76} h={76} r="50%" />
            <div className="grow">
              {line(18, '46%', 24)}
              {line(11, '62%', 18)}
            </div>
          </div>
          {/* The figures' boxes are the kit's grey already: the box is the block. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <SkBlock h={66} r="var(--k-r-in)" />
            <SkBlock h={66} r="var(--k-r-in)" />
          </div>
        </div>
      </div>
      <div className="stk" style={f.right}>
        <span className="lbl no-desk">{t('account.settings')}</span>
        <div className="list">
          {/* the address book, Language and display (two lines), personal details, help */}
          {[['40%'], ['52%', '38%'], ['46%'], ['30%']].map((widths, i) => (
            <div key={i} className="li">
              <SkBlock w={34} h={34} r="var(--k-r-in)" />
              <div className="grow">
                {line(12, widths[0], 20)}
                {widths[1] && line(10, widths[1], 17)}
              </div>
            </div>
          ))}
        </div>
        <SkBlock h={48} r="var(--k-r-btn)" />
      </div>
    </Skeleton>
  );
}

// /account — the shopper's account tab (the design's D1).
export default function Account() {
  const { tenant } = useGlow();
  const dev = useDev();
  const bottom = useBottomClearance();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const { user, isAuthenticated, isStoreOwner, canManageStore, logout, loading } = useAuth();
  const { orders, pending, getTotalOrders, getTotalSpent } = useOrders();
  const { appearance, language } = useThemeMode();
  // The address book's size, beside its row; nothing until it answers.
  const addresses = useQuery({ ...addressesQuery(), enabled: isAuthenticated && !loading });
  const addressCount = addresses.data ? addresses.data.length : null;

  // Not a sign-in screen flashing up for a shopper who is signed in, nor a 0
  // that turns into their count: the board's own shape until both are known.
  const waiting = loading || pending;
  if (!waiting && !isAuthenticated) return <SignIn />;

  const name = user?.name || user?.email || t('account.memberFallback');
  const recent = (orders || []).slice(0, 2);
  const f = FRAME[dev];
  const openOrder = (o) => o.orderNumber && navigate(`/orders/${encodeURIComponent(o.orderNumber)}`);

  const settings = [
    // The address book has no screen of its own yet: checkout keeps it.
    { id: 'addresses', icon: 'pin', k: t('account.setAddresses'), v: addressCount ?? null },
    // Language, appearance and the rest of the display settings are one screen (D1 → D3).
    {
      id: 'display',
      icon: 'screen',
      k: t('displayRow', { ns: 'account' }),
      sub: t('displaySummary', {
        ns: 'account',
        language: langInfo(language).native,
        appearance: t(`appearance.${appearance || 'auto'}`, { ns: 'display' }),
      }),
      onClick: () => navigate('/settings/display'),
    },
    // Personal details are their own screen (D1 → D2).
    { id: 'personal', icon: 'user', k: t('account.personal.title'), onClick: () => navigate('/account/personal') },
    // Only to the store's own team: platform ADMIN grants no authority inside a store.
    ...(canManageStore ? [{
      id: 'dashboard',
      icon: 'store',
      k: t('account.setDashboard'),
      chip: isStoreOwner ? t('account.chipOwner') : t('account.chipManager'),
      href: managerUrl(`/?tenant=${encodeURIComponent(tenant?.subdomain || '')}`),
    }] : []),
    { id: 'help', icon: 'info', k: t('account.setHelp'), href: platformUrl('/help') },
  ];

  const row = (s) => {
    const body = (
      <>
        <span className="li-ic"><G name={s.icon} cls="" /></span>
        {s.sub
          ? <div className="grow"><span>{s.k}</span><div className="xs dim">{s.sub}</div></div>
          : <span className="grow">{s.k}</span>}
        {s.v != null && <span className="sm dim">{s.v}</span>}
        {s.chip && <span className="chip nd c-conf">{s.chip}</span>}
        {(s.onClick || s.href) && <G name="chevR" cls="ic s dim" />}
      </>
    );
    if (s.href) return <a key={s.id} href={s.href} className="li esy-press-soft">{body}</a>;
    if (s.onClick) return <button key={s.id} type="button" className="li esy-press-soft" onClick={s.onClick}>{body}</button>;
    return <div key={s.id} className="li">{body}</div>;
  };

  return (
    <Sk style={{ paddingBottom: (dev === 'desk' ? 0 : bottom) + 40 }}>
      {dev !== 'desk' && (
        <div className="st-top" style={{ paddingBottom: 10, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 28px)' }}>
          <h1 className="h1 grow">{t('account.title')}</h1>
        </div>
      )}
      <div style={f.wrap}>
        {dev === 'desk' && <h1 className="h1">{t('account.title')}</h1>}
        {waiting ? <AccountSkeleton t={t} f={f} /> : (
          <div style={f.cols}>
            <div className="stk" style={f.left}>
              {/* profile, with the two numbers inside it */}
              <div className="card padl stk" style={{ gap: 14 }}>
                <div className="row" style={{ gap: 14 }}>
                  <span className="av lg u">
                    {initials(name)}
                    {user?.avatar && (
                      <img src={user.avatar} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    )}
                  </span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <b className="h2" style={{ display: 'block', overflowWrap: 'anywhere' }}>{name}</b>
                    {user?.email && <span className="sm dim" style={{ overflowWrap: 'anywhere' }}>{user.email}</span>}
                    {user?.phoneVerified && (
                      <div className="row" style={{ gap: 6, marginTop: 4 }}><span className="chip c-done">{t('account.phoneVerified')}</span></div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  {[
                    { id: 'orders', k: t('account.statOrders'), v: String(getTotalOrders()) },
                    { id: 'spent', k: t('account.statSpent'), v: money(getTotalSpent()) },
                  ].map((s) => (
                    <div key={s.id} style={{ background: 'var(--k-sf2)', borderRadius: 'var(--k-r-in)', padding: '12px 14px' }}>
                      <span className="xs dim">{s.k}</span>
                      <b className="h2 num" style={{ display: 'block' }}>{s.v}</b>
                    </div>
                  ))}
                </div>
              </div>

              {recent.length > 0 && (
                <div className="stk" style={{ gap: 10 }}>
                  <div className="rowb">
                    <span className="lbl">{t('account.recentOrders')}</span>
                    <button type="button" className="link sm" onClick={() => navigate('/orders')} data-prefetch="/orders">{t('account.seeAll')}</button>
                  </div>
                  <div className="list">
                    {recent.map((o, i) => {
                      const id = String(o.orderNumber || o.id || '').toUpperCase();
                      const key = o.statusKey || 'placed';
                      return (
                        <button
                          key={o.id || i} type="button" className="li esy-press-soft" onClick={() => openOrder(o)}
                          data-prefetch={o.orderNumber ? `/orders/${encodeURIComponent(o.orderNumber)}` : undefined}
                        >
                          <Thumb i={i + 1} size={44} radius={10} />
                          <div className="grow">
                            <b className="sm num">#{id}</b>
                            <div className="xs dim">{`${t('account.itemCount', { count: o.count ?? 0 })} · ${money(o.total)}`}</div>
                          </div>
                          <span className={`chip ${TONE[key] || 'c-pend'}`}>{t(`account.status.${key}`, { defaultValue: t(`orders.status.${key}`, { defaultValue: key }) })}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="stk" style={f.right}>
              <span className="lbl no-desk">{t('account.settings')}</span>
              <div className="list">{settings.map(row)}</div>
              <button type="button" className="btn btn-d btn-b esy-press" onClick={() => { logout(); navigate('/'); }}>
                <G name="signOut" cls="" />{t('account.signOut')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Sk>
  );
}
