// The storefront's desktop bar (the design's SBar).
//
// The storefront was mobile-first and never grew a desktop chrome: at 1440px
// it showed the phone dock and a phone header, so a desktop shopper had no
// search, no cart and no way to reach the shop. The design puts all three in a
// bar across the top, and the dock only on a phone.
//
// Store identity sits on the left with the subdomain under it, because a
// shopper who followed a link needs to know whose shop this is.
//
// While it is mounted it is the store's header: Home leaves out its own header
// and GlowDock leaves out the top tabs and side-menu strip (storeChrome.js).
// App.jsx decides where it is mounted.
//
// The design draws one bar for every header style on a desktop (A1Home's
// desk frames): centred is the compact bar, and so is cover, except that the
// home page then has no hero band. The one thing added for cover is the
// store's cover photo, when it has one, across the top of the home page; with
// none the page is the bar and the shop, as the design draws it.
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../contexts/CartContext';
import { useGlow } from '../../styles/glow';
import { useThemeMode } from '../../contexts/ThemeModeContext';
import { Icon } from '../glow/GlowPrimitives';
import { LangPill } from '../glow/GlowPills';
import { Icons } from '../../core/icons';
import { usePublicContacts } from '../../hooks/useStoreContacts';
import { CHANNELS, channelHref } from '../../core/channels';
import ManageButton from '../ManageButton';
import { useStoreBarMounted } from './storeChrome';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { toggleAccountMenu, useAccountMenuState } from '../account/accountSheet';
import { useDesign } from '../../core/design/useDesign';
import { StoreName } from './VerifiedTick';
import { markIfComplete, markLoaded } from '../../core/imgFade';

/** The channels worth a one-tap button up here: the ones you can talk on. */
const QUICK = ['phone', 'whatsapp', 'instagram', 'facebook'];

export default function StoreBar({ compact }) {
  useStoreBarMounted();
  const { T, tenant } = useGlow();
  const { t } = useTranslation('home');
  const { getTotalItems } = useCart();
  const { language } = useThemeMode();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { tenant: store } = useTenant();
  const design = useDesign();
  const socials = design.show.socials;
  const [coverFailed, setCoverFailed] = useState(null);

  // The quick channel buttons are the store's social buttons up here, so the
  // design's socials switch hides them; there is nothing to fetch then.
  const { channels } = usePublicContacts(socials);

  const cover = design.header === 'cover' && pathname === '/' && store?.coverUrl && coverFailed !== store.coverUrl
    ? store.coverUrl : null;

  const count = getTotalItems();
  const { isAuthenticated } = useAuth();
  const account = useAccountMenuState();
  const accountBtn = {
    width: 36, height: 36, borderRadius: '50%', display: 'inline-flex', padding: 0,
    alignItems: 'center', justifyContent: 'center', background: 'transparent', cursor: 'pointer',
    border: `1px solid ${T.border}`, color: T.textDim, textDecoration: 'none',
  };
  const pill = {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 36,
    padding: '0 11px', borderRadius: 999, border: `1px solid ${T.border}`,
    font: `600 12px ${T.font}`, color: T.textDim, background: 'transparent',
    cursor: 'pointer', textDecoration: 'none',
  };

  const bar = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: compact ? 14 : 26,
      padding: compact ? '0 24px' : '0 48px', height: compact ? 64 : 76,
      // The theme's header ground: frosted on Liquid Glass and Neon, clear on Soft.
      borderBottom: `1px solid ${T.border}`, background: 'var(--k-hd-bg)',
      backdropFilter: 'var(--k-hd-blur, none)', WebkitBackdropFilter: 'var(--k-hd-blur, none)',
      position: 'sticky', top: 0, zIndex: 50,
      // Stays put while the page under it cross-fades (styles/motion.css).
      viewTransitionName: 'esy-storebar',
    }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        {tenant?.logoUrl ? (
          <img src={tenant.logoUrl} alt="" className="esy-img" ref={markIfComplete} onLoad={markLoaded} style={{ width: 38, height: 38, borderRadius: 11, objectFit: 'cover' }} />
        ) : (
          <span style={{
            width: 38, height: 38, borderRadius: 11, background: T.grad, color: T.onAccent,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            font: `800 16px ${T.font}`,
          }}>{(tenant?.name || '?').charAt(0)}</span>
        )}
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
          <StoreName
            name={tenant?.name} size={compact ? 15 : 16}
            style={{ font: `700 ${compact ? 15 : 17}px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}
          />
          <span style={{ font: `500 ${compact ? 11 : 12}px ${T.mono}`, color: T.textMute }}>
            {tenant?.domain}
          </span>
        </span>
      </Link>

      <span style={{ flex: 1 }} />

      {/* Search is a real control here rather than a hero field — on desktop
          it belongs where a shopper looks for it. */}
      {!compact && (
        <button
          type="button"
          onClick={() => navigate('/search')}
          data-prefetch="/search"
          className="esy-press-soft"
          style={{
            display: 'flex', alignItems: 'center', gap: 9, height: 44, padding: '0 16px',
            borderRadius: 999, width: 320, background: T.bg, border: `1px solid ${T.border}`,
            color: T.textMute, font: `500 13px ${T.font}`, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <Icon.search /> {t('searchPlaceholder')}
        </button>
      )}

      <ManageButton />

      {/* One tap to reach the shop, in each channel's own colour. Rendered
          only where the store actually published a channel. */}
      {socials && channels.filter((c) => QUICK.includes(c.type)).slice(0, 2).map((c) => {
        const meta = CHANNELS[c.type];
        const href = channelHref(c.type, c.value);
        const Ic = meta && Icons[meta.icon];
        if (!meta || !href || !Ic) return null;
        return (
          <a
            key={c.id} href={href} target={c.type === 'phone' ? undefined : '_blank'} rel="noreferrer"
            aria-label={c.value}
            style={{
              width: 36, height: 36, borderRadius: 999, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              background: `${meta.brand}14`, border: `1px solid ${meta.brand}33`, color: meta.brand,
            }}
          >
            <Ic width={16} height={16} />
          </a>
        );
      })}

      {/* A gear and the current language: it opens Language and display
          (where the language and the look are both chosen), not a switch. */}
      <LangPill T={T} lang={language} to="/settings/display" label={t('title', { ns: 'display' })} compact={false} />

      <Link to="/cart" className="esy-press" style={{
        ...pill,
        background: count ? T.accentBg : 'transparent',
        borderColor: count ? T.accent : T.border,
        color: count ? T.accentFg : T.textDim,
      }}>
        <Icon.bag /> {count || 0}
      </Link>

      {isAuthenticated ? (
        // Signed in, it opens the account menu out of itself (StoreAccount.jsx).
        <button
          type="button" aria-label={t('account', { defaultValue: 'Account' })} aria-haspopup="menu" aria-expanded={account.open}
          onClick={(e) => toggleAccountMenu(e.currentTarget)} className="esy-press" style={accountBtn}
        >
          <Icon.user />
        </button>
      ) : (
        <Link to="/account" aria-label={t('account', { defaultValue: 'Account' })} className="esy-press" style={accountBtn}>
          <Icon.user />
        </Link>
      )}
    </div>
  );

  if (!cover) return bar;
  // The cover header's photo, under the bar on the home page and lined up with
  // the page's own gutter. It scrolls away; the bar stays.
  return (
    <>
      {bar}
      <div style={{ position: 'relative', padding: `${compact ? 16 : 24}px ${compact ? 24 : 40}px 0` }}>
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 'var(--k-r-card)',
          height: compact ? 180 : 240, background: T.surface2,
        }}>
          <img
            src={cover} alt="" onError={() => setCoverFailed(cover)}
            className="esy-img" ref={markIfComplete} onLoad={markLoaded}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      </div>
    </>
  );
}
