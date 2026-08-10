// The storefront's desktop bar (the design's SBar).
//
// The storefront was mobile-first and never grew a desktop chrome: at 1440px
// it showed the phone dock and a phone header, so a desktop shopper had no
// search, no cart and no way to reach the shop. The design puts all three in a
// bar across the top, and the dock only on a phone.
//
// Store identity sits on the left with the subdomain under it, because a
// shopper who followed a link needs to know whose shop this is.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../contexts/CartContext';
import { useGlow } from '../../styles/glow';
import { useThemeMode } from '../../contexts/ThemeModeContext';
import { Icon } from '../glow/GlowPrimitives';
import { Icons } from '../../core/icons';
import { contactApi } from '../../utils/api';
import { CHANNELS, channelHref } from '../../core/channels';
import ManageButton from '../ManageButton';

/** The channels worth a one-tap button up here: the ones you can talk on. */
const QUICK = ['phone', 'whatsapp', 'instagram', 'facebook'];

export default function StoreBar({ compact }) {
  const { T, tenant } = useGlow();
  const { t } = useTranslation('home');
  const { getTotalItems } = useCart();
  const { language } = useThemeMode();
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    const ac = new AbortController();
    contactApi.listPublic(undefined, { signal: ac.signal })
      .then((rows) => { if (!ac.signal.aborted) setChannels(Array.isArray(rows) ? rows : []); })
      .catch(() => {});
    return () => ac.abort();
  }, []);

  const count = getTotalItems();
  const pill = {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 36,
    padding: '0 11px', borderRadius: 999, border: `1px solid ${T.border}`,
    font: `600 12px ${T.font}`, color: T.textDim, background: 'transparent',
    cursor: 'pointer', textDecoration: 'none',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: compact ? 14 : 26,
      padding: compact ? '0 24px' : '0 40px', height: compact ? 64 : 74,
      borderBottom: `1px solid ${T.border}`, background: T.surface,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        {tenant?.logoUrl ? (
          <img src={tenant.logoUrl} alt="" style={{ width: 38, height: 38, borderRadius: 11, objectFit: 'cover' }} />
        ) : (
          <span style={{
            width: 38, height: 38, borderRadius: 11, background: T.grad, color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            font: `800 16px ${T.font}`,
          }}>{(tenant?.name || '?').charAt(0)}</span>
        )}
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ font: `700 ${compact ? 15 : 17}px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>
            {tenant?.name}
          </span>
          <span style={{ font: `500 ${compact ? 9.5 : 10.5}px ${T.mono}`, color: T.textMute }}>
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
      {channels.filter((c) => QUICK.includes(c.type)).slice(0, 2).map((c) => {
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

      <span style={{ ...pill }}>
        <Icon.globe /> {language === 'ka' ? 'ქარ' : 'ENG'}
      </span>

      <Link to="/cart" style={{
        ...pill,
        background: count ? T.accentBg : 'transparent',
        borderColor: count ? T.accent : T.border,
        color: count ? T.accentFg : T.textDim,
      }}>
        <Icon.bag /> {count || 0}
      </Link>

      <Link to="/account" aria-label={t('account', { defaultValue: 'Account' })} style={{
        width: 36, height: 36, borderRadius: '50%', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${T.border}`, color: T.textDim, textDecoration: 'none',
      }}>
        <Icon.user />
      </Link>
    </div>
  );
}
