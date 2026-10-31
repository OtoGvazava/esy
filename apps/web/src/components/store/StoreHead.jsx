// The store's own header on its home page, wherever StoreBar is not the header
// (a phone today). The store's design object picks one of three:
//   compact  logo and name on the left, the controls on the right (unchanged)
//   center   the name centred on the screen, the controls on the right
//   cover    a band in the theme's hero colour carrying the store's words, the
//            avatar over its bottom edge and the name beside it
// A store with the side menu gets the menu button at the start, and search and
// the bag in place of language and light/dark, which move into the menu (the
// canvas's StoreTop draws the header that way for the side menu).
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../../styles/glow';
import { useDesign } from '../../core/design/useDesign';
import { useDevice } from '../../contexts/DeviceContext';
import { useThemeMode } from '../../contexts/ThemeModeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import ManageButton from '../ManageButton';
import { Icon } from '../glow/GlowPrimitives';
import { ThemePill, LangPill } from '../glow/GlowPills';
import { HeadButton, MenuButton, StoreAvatar } from './StoreMenus';
import { useStoreNav } from './storeChrome';

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

function GlowLogo({ T, tenant, size = 20 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.text }}>
      {tenant.logoUrl ? (
        <img
          src={tenant.logoUrl} alt={tenant.name}
          style={{ width: size * 1.1, height: size * 1.1, borderRadius: 10, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{
          width: size * 1.1, height: size * 1.1, borderRadius: 10, background: T.grad,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: T.onAccent, font: `800 ${size * 0.55}px ${T.font}`, letterSpacing: '-0.02em',
        }}>{tenant.initials.charAt(0)}</span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ font: `700 ${size * 0.82}px ${T.font}`, letterSpacing: '-0.02em' }}>{tenant.name}</span>
        <span style={{ font: `500 12px ${T.font}`, color: T.textMute, marginTop: 4 }}>{tenant.domain}</span>
      </div>
    </div>
  );
}

// The right-hand controls of the centred and cover headers, and of any header
// with the side menu: two touch-size buttons on the theme's floating surface.
function Controls({ drawer }) {
  const { t } = useTranslation('navbar');
  const { mode, toggle } = useThemeMode();
  const { count } = useStoreNav();
  if (drawer) {
    return (
      <>
        <HeadButton to="/search" label={t('dock.search')}><Icon.search /></HeadButton>
        <HeadButton to="/cart" label={count ? t('menu.bagCount', { count }) : t('dock.bag')} badge={count}><Icon.bag /></HeadButton>
      </>
    );
  }
  return (
    <>
      <HeadButton label={t('toggleTheme')} onClick={toggle}>{mode === 'dark' ? <Icon.sun /> : <Icon.moon />}</HeadButton>
      <HeadButton to="/settings/language" label={t('menu.language')}><Icon.globe /></HeadButton>
    </>
  );
}

export default function StoreHead() {
  const { T, tenant } = useGlow();
  const design = useDesign();
  const { isMobile } = useDevice();
  const navigate = useNavigate();
  const { mode, toggle: toggleTheme, language } = useThemeMode();
  const { t } = useTranslation('home');
  // ManageButton's own test. These headers give the owner's button a row of
  // its own above them: beside a centred name or the cover's avatar it took
  // the room the name needs, and a shopper never sees it either way.
  const { canManageStore } = useAuth();
  const { tenant: store } = useTenant();
  const canManage = !!canManageStore && !!store?.subdomain;
  const gutter = isMobile ? 16 : 40;
  const drawer = design.menu === 'drawer';
  const ownerRow = canManage && (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', padding: `14px ${gutter}px 0` }}>
      <ManageButton />
    </div>
  );

  if (design.header === 'center') {
    // Three columns, the outer two equal, so the name sits on the screen's
    // centre line rather than in whatever the controls leave; a name too long
    // for that shortens with an ellipsis instead of pushing the controls off.
    return (
      <>
        {ownerRow}
        <div style={{
          position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
          columnGap: 8, padding: `${canManage ? 10 : 28}px ${gutter}px 0`,
        }}>
          <div style={{ justifySelf: 'start', display: 'flex' }}>{drawer && <MenuButton />}</div>
          <div style={{ minWidth: 0, overflow: 'hidden', textAlign: 'center', color: T.text }}>
            <div style={{ font: `700 16px/1.2 ${T.font}`, letterSpacing: '-0.02em', ...ellipsis }}>{tenant.name}</div>
            <div style={{ font: `500 12px ${T.font}`, color: T.textMute, marginTop: 3, ...ellipsis }}>{tenant.domain}</div>
          </div>
          <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Controls drawer={drawer} />
          </div>
        </div>
      </>
    );
  }

  if (design.header === 'cover') {
    // No cover photo exists yet, so the band is the theme's hero colour, and
    // it carries what the store says about itself: under this header Home
    // draws no separate hero.
    const meta = [tenant.location, tenant.since ? t('established', { year: tenant.since }) : null].filter(Boolean).join(' · ');
    return (
      <>
        {ownerRow}
        <div style={{ position: 'relative', padding: `${canManage ? 10 : isMobile ? 14 : 24}px ${gutter}px 6px` }}>
          <div style={{
            position: 'relative', overflow: 'hidden', borderRadius: 'var(--k-r-card)',
            background: 'var(--k-hero)', color: 'var(--k-hero-fg)',
            minHeight: isMobile ? 132 : 180, boxSizing: 'border-box',
            // The bottom stays clear for the avatar that overlaps it.
            padding: isMobile ? '18px 20px 52px' : '28px 32px 60px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {meta && <div style={{ font: `600 12px ${T.font}`, opacity: 0.88 }}>{meta}</div>}
            {tenant.bio && (
              <div style={{
                font: `700 ${isMobile ? '20px/1.15' : '28px/1.12'} ${T.font}`, letterSpacing: '-0.02em', maxWidth: 620,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{tenant.bio}</div>
            )}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: -40 }}>
            {drawer && <MenuButton />}
            <StoreAvatar size={76} ring />
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 2, color: T.text }}>
              <div style={{ font: `700 17px/1.2 ${T.font}`, letterSpacing: '-0.02em', ...ellipsis }}>{tenant.name}</div>
              <div style={{ font: `500 12px ${T.font}`, color: T.textMute, marginTop: 3, ...ellipsis }}>{tenant.domain}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
              <Controls drawer={drawer} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // compact, with the side menu: its button before the logo, search and the
  // bag on the right.
  if (drawer) {
    return (
      <>
        {ownerRow}
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: `${canManage ? 10 : 28}px ${gutter}px 0`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <MenuButton />
            <GlowLogo T={T} tenant={tenant} size={20} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 'none' }}>
            <Controls drawer />
          </div>
        </div>
      </>
    );
  }

  // compact: the header exactly as it has always been.
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `28px ${gutter}px 0` }}>
      <GlowLogo T={T} tenant={tenant} size={20} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <ManageButton />
        <ThemePill T={T} dark={mode === 'dark'} onClick={toggleTheme} />
        <LangPill T={T} lang={language} onClick={() => navigate('/settings/language')} />
      </div>
    </div>
  );
}
