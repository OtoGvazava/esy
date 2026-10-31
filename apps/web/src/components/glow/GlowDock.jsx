// The store's menu: one list of places (shop · search · bag · orders ·
// account, from storeChrome.js) drawn the way the store's design object asks.
//   tabs     the tab bar across the bottom
//   capsule  a floating pill, with search as its own round button
//   mini     a small centred pill of icons
//   top      text tabs under the store header
//   drawer   a menu button in the store header, opening a side panel
//   fab      a round button in the store colour, opening the items above it
// App.jsx mounts only this component and it branches here. Top tabs and the
// side menu belong to the store header, so on the home page Home draws them
// in its header and every other page gets them in a strip at the top.
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './GlowPrimitives';
import { useGlow } from '../../styles/glow';
import { useAuth } from '../../contexts/AuthContext';
import { useDesign } from '../../core/design/useDesign';
import { useStoreNav, useStoreBarShown } from '../store/storeChrome';
import { ActionButton, MenuStrip } from '../store/StoreMenus';

export default function GlowDock() {
  const { T } = useGlow();
  const design = useDesign();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation('navbar');
  const { isAuthenticated, user } = useAuth();
  const { items: places } = useStoreNav();
  const barShown = useStoreBarShown();

  const menu = design.menu;
  // The design's "menu labels" switch: off, the tab bar and the capsule draw
  // icons only, and each item keeps its name for screen readers.
  const labels = design.show.labels;
  // The action button floats on every page the dock would.
  if (menu === 'fab') return <ActionButton />;
  if (menu === 'top' || menu === 'drawer') {
    // Where StoreBar is the header it already carries search, cart and account.
    return pathname === '/' || barShown ? null : <MenuStrip kind={menu} />;
  }

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

  const items = places.map((it) => (it.key === 'account'
    ? { ...it, icon: accountIcon, label: accountLabel }
    : { ...it, icon: <it.Icon /> }));

  // The capsule is a floating pill with search as its own round button; the
  // icon island is a small centred pill of icons.
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
          position: 'relative', height: 44, minWidth: 44, padding: it.active && capsule && labels ? '0 14px' : 0,
          borderRadius: 999, border: 'none', cursor: 'pointer', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          background: it.active ? T.accentBg : 'transparent', color: it.active ? T.accentFg : T.textDim,
          font: `600 12px ${T.font}`, whiteSpace: 'nowrap',
        }}
      >
        {it.icon}
        {it.active && capsule && labels && <span>{it.label}</span>}
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
        <nav aria-label={t('menu.tabs')} style={{
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
    <nav aria-label={t('menu.tabs')} style={{
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
        <button
          key={it.key}
          type="button"
          onClick={() => navigate(it.to)}
          aria-current={it.active ? 'page' : undefined}
          aria-label={labels ? undefined : it.label}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: it.active ? T.accentFg : T.textDim, cursor: 'pointer',
            background: 'none', border: 0, padding: 0, margin: 0, font: 'inherit',
          }}
        >
          <span style={{
            // Icons alone get the whole 44 px target the label used to share.
            width: labels ? 36 : 44, height: labels ? 36 : 44, borderRadius: 12, position: 'relative',
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
          </span>
          {labels && (
            <span style={{ display: 'block', font: `600 11px ${T.font}`, letterSpacing: '-0.005em', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
