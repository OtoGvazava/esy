// Persistent bottom dock — Shop · Search · Bag · Saved · Account. Each item is
// a real route; Bag shows a live cart-count badge.
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './GlowPrimitives';
import { useGlow } from '../../styles/glow';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDesign } from '../../core/design/useDesign';

export default function GlowDock() {
  const { T } = useGlow();
  const design = useDesign();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { getTotalItems } = useCart();
  const { t } = useTranslation('navbar');
  const { isAuthenticated, user } = useAuth();
  const cartCount = getTotalItems();

  // Signed in → mirror the platform avatar: Google photo, else name initials.
  const initials = (user?.name || user?.firstName || 'You')
    .split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const accountIcon = isAuthenticated ? (
    <span style={{
      width: 26, height: 26, borderRadius: '50%', position: 'relative', overflow: 'hidden',
      background: T.grad, color: T.onAccent, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      font: `700 11px ${T.font}`,
    }}>
      {initials}
      {user?.avatar && (
        <img
          src={user.avatar}
          alt=""
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </span>
  ) : (
    <Icon.user />
  );

  // Signed in → label the tab with the user's first name instead of "Account".
  const firstName = (user?.firstName || user?.name || '').trim().split(/\s+/)[0];
  const accountLabel = isAuthenticated && firstName ? firstName : t('dock.account');

  const items = [
    { key: 'shop', icon: <Icon.grid />, label: t('dock.shop'), to: '/', active: pathname === '/' || pathname.startsWith('/product') },
    { key: 'search', icon: <Icon.search />, label: t('dock.search'), to: '/search', active: pathname === '/search' },
    { key: 'bag', icon: <Icon.bag />, label: t('dock.bag'), to: '/cart', badge: cartCount, active: ['/cart', '/checkout', '/success'].includes(pathname) },
    // The design's fifth item. Orders is where a shopper goes back to, and
    // burying it under Account cost a tap on the journey they repeat most.
    { key: 'orders', icon: <Icon.check />, label: t('dock.orders'), to: '/orders', active: pathname === '/orders' },
    { key: 'account', icon: accountIcon, label: accountLabel, to: '/account', active: pathname === '/account' },
  ];

  // The store's menu style (its design object). The capsule is a floating
  // pill with search as its own round button; the icon island is a small
  // centred pill of icons. Top tabs, the side menu and the action button are
  // not built yet, so those stores keep the tab bar for now.
  const menu = design.menu;
  if (menu === 'capsule' || menu === 'mini') {
    const capsule = menu === 'capsule';
    const glass = {
      background: 'var(--k-fl-bg)', backdropFilter: 'var(--k-fl-blur)', WebkitBackdropFilter: 'var(--k-fl-blur)',
      border: 'var(--k-fl-bd)', boxShadow: 'var(--k-fl-sh)', zIndex: 1200, position: 'fixed', bottom: 18,
    };
    const shown = capsule ? items.filter((it) => it.key !== 'search') : items;
    const search = items.find((it) => it.key === 'search');
    const iconBtn = (it) => (
      <button
        key={it.key} type="button" onClick={() => navigate(it.to)} aria-label={it.label}
        aria-current={it.active ? 'page' : undefined}
        style={{
          position: 'relative', height: 44, minWidth: 44, padding: it.active && capsule ? '0 14px' : 0,
          borderRadius: 999, border: 'none', cursor: 'pointer', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          background: it.active ? T.accentBg : 'transparent', color: it.active ? T.accentFg : T.textDim,
          font: `600 12px ${T.font}`, whiteSpace: 'nowrap',
        }}
      >
        {it.icon}
        {it.active && capsule && <span>{it.label}</span>}
        {it.badge ? (
          <span style={{
            position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, padding: '0 5px',
            borderRadius: 999, background: T.accent, color: T.onAccent,
            font: `700 11px ${T.font}`, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>{it.badge}</span>
        ) : null}
      </button>
    );
    return (
      <>
        <nav aria-label={t('dock.shop')} style={{
          ...glass, height: 56, borderRadius: 999, padding: '0 6px', display: 'flex', alignItems: 'center', gap: 2,
          ...(capsule ? { left: 16, right: 84, justifyContent: 'space-between' } : { left: '50%', transform: 'translateX(-50%)' }),
        }}>
          {shown.map(iconBtn)}
        </nav>
        {capsule && search && (
          <button
            type="button" onClick={() => navigate(search.to)} aria-label={search.label}
            style={{ ...glass, right: 16, width: 56, height: 56, borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center', color: search.active ? T.accentFg : T.text }}
          >{search.icon}</button>
        )}
      </>
    );
  }

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 18, maxWidth: 520, margin: '0 auto',
      // The theme's floating-control recipe — glass on Liquid Glass, solid on
      // Soft, a lit edge on Neon — rather than one hard-coded frosted white.
      height: 66, borderRadius: 'var(--k-r-dock)', zIndex: 1200,
      background: 'var(--k-fl-bg)',
      backdropFilter: 'var(--k-fl-blur)',
      WebkitBackdropFilter: 'var(--k-fl-blur)',
      border: 'var(--k-fl-bd)',
      boxShadow: 'var(--k-fl-sh)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 14px',
    }}>
      {items.map((it) => (
        <div
          key={it.key}
          onClick={() => navigate(it.to)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: it.active ? T.accentFg : T.textDim, cursor: 'pointer',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 12, position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: it.active ? T.accentBg : 'transparent',
          }}>
            {it.icon}
            {it.badge ? (
              <span style={{
                position: 'absolute', top: -3, right: -5, minWidth: 18, height: 18, padding: '0 5px',
                borderRadius: 999, background: T.accent, color: T.onAccent,
                font: `700 11px ${T.font}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${T.dark ? '#12121c' : '#ffffff'}`, lineHeight: 1,
              }}>{it.badge}</span>
            ) : null}
          </div>
          <div style={{ font: `600 11px ${T.font}`, letterSpacing: '-0.005em', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}
