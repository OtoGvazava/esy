import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@mui/material';
import { usePlatform, useStores, PTopBar, PFooter, StoreMark, StoreArtStrip, shiftHue } from './PlatformShared';
import { FEATURED_SUBDOMAINS, storeUrl } from './platformData';
import { alpha } from '../core/tokens';
import { Icons } from '../core/icons';
import { useDevice } from '../contexts/DeviceContext';
import { lookById } from '../core/design/looks';
import LookThumb from '../components/design/LookThumb';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';

// The hero's three looks (the design's O1), one per theme, each in the colour
// the board draws it with. A tap opens quick setup on that look.
const HERO_LOOKS = [
  { id: 'studio', brand: '#d9480f', mode: 'light' },
  { id: 'social', brand: '#db2777', mode: 'light' },
  { id: 'sneaker', brand: '#00b3ff', mode: 'dark' },
];

function HeroLooks({ t, scale, count, onPick }) {
  const { t: td } = useTranslation('design');
  return (
    <div role="group" aria-label={t('landing.looksLabel')} style={{ display: 'flex', justifyContent: 'center', gap: scale < 1 ? 16 : 24 }}>
      {HERO_LOOKS.slice(0, count).map(({ id, brand, mode }) => {
        const name = td(`names.${id}`);
        return (
          <button
            key={id} type="button" onClick={() => onPick(id)}
            aria-label={t('landing.lookOpen', { name })} title={name}
            style={{ display: 'block', padding: 0, border: 0, background: 'none', cursor: 'pointer', borderRadius: 28 * scale }}
          >
            <LookThumb design={lookById(id).design} brand={brand} mode={mode} scale={scale} />
          </button>
        );
      })}
    </div>
  );
}

function HowStep({ T, n, title, body }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, background: T.accentBg, color: T.accentFg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        font: `800 18px ${T.font}`, letterSpacing: '-0.04em', border: `1px solid ${alpha(T.accent, 0.13)}`,
      }}>{n}</div>
      <div>
        <div style={{ font: `700 17px/1.25 ${T.font}`, color: T.text, letterSpacing: '-0.02em', marginBottom: 6 }}>{title}</div>
        <div style={{ font: `400 13.5px/1.55 ${T.font}`, color: T.textDim }}>{body}</div>
      </div>
    </div>
  );
}

function FeaturedChip({ T, store, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 220, flexShrink: 0, background: T.surface, borderRadius: 16,
      border: `1px solid ${T.border}`, padding: 12, cursor: 'pointer',
      boxShadow: T.dark ? 'none' : '0 4px 18px rgba(20,20,60,0.04)',
    }}>
      <StoreArtStrip store={store} height={120} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <StoreMark store={store} size={28} radius={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `700 12.5px ${T.font}`, color: T.text, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.name}</div>
          <div style={{ font: `500 10px ${T.mono}`, color: T.textMute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.subdomain}.esy.ge</div>
        </div>
      </div>
    </div>
  );
}

/** A featured chip's shape while the directory loads: the strip, the mark, two lines. */
function FeaturedChipSkeleton({ T }) {
  return (
    <div style={{ width: 220, flexShrink: 0, background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`, padding: 12, boxSizing: 'border-box' }}>
      <Sk h={120} r={12} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <Sk w={28} h={28} r={8} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <Sk h={10} w="70%" r={5} />
          <Sk h={8} w="55%" r={4} />
        </div>
      </div>
    </div>
  );
}

export default function PlatformLanding() {
  const { T, isDesktop } = usePlatform();
  const { t } = useTranslation('platform');
  const navigate = useNavigate();
  const { stores } = useStores();
  const list = stores || [];
  const bySub = Object.fromEntries(list.map((s) => [s.subdomain, s]));
  const featured = FEATURED_SUBDOMAINS.map((s) => bySub[s]).filter(Boolean).concat(list).slice(0, 8);
  // The looks sit beside the hero's words where three full-size thumbnails
  // leave the words room, and under them otherwise; a phone shows two, smaller.
  const { isMobile } = useDevice();
  const side = useMediaQuery('(min-width:1280px)') && isDesktop;

  const pad = isDesktop ? '0 56px' : '0 22px';

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
      <PTopBar current="home" />

      {/* HERO */}
      <div style={{ position: 'relative', padding: isDesktop ? '64px 56px 40px' : '32px 22px 28px', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: isDesktop ? -180 : -100, left: isDesktop ? '20%' : -60, right: isDesktop ? '20%' : -60,
          height: isDesktop ? 480 : 300,
          background: `radial-gradient(50% 70% at 50% 30%, ${alpha(T.accent, 0.22)}, transparent 70%), radial-gradient(40% 60% at 80% 40%, ${alpha(shiftHue(T.accent, 25), 0.19)}, transparent 70%)`,
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', display: side ? 'grid' : 'block', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: T.accentBg, color: T.accentFg, font: `600 11px ${T.font}`, letterSpacing: '0.1em', marginBottom: 22 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
              {t('landing.heroEyebrow')}
            </div>
            <h1 style={{ font: `700 ${isDesktop ? 64 : 36}px/1.03 ${T.font}`, color: T.text, letterSpacing: '-0.04em', margin: '0 0 22px', maxWidth: 620 }}>
              {t('landing.heroTitlePre')}<span style={{ background: T.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>esy</span>{t('landing.heroTitlePost')}
            </h1>
            <div style={{ font: `400 ${isDesktop ? 16.5 : 14.5}px/1.55 ${T.font}`, color: T.textDim, maxWidth: 540, marginBottom: 30 }}>
              {t('landing.heroBodyPre')}<span style={{ color: T.text, fontFamily: T.mono, fontSize: isDesktop ? 14.5 : 13 }}>your-name.esy.ge</span>{t('landing.heroBodyPost')}
            </div>
            <div style={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'stretch', gap: 12 }}>
              <button onClick={() => navigate('/sell')} style={{
                height: 52, padding: '0 22px', borderRadius: 16, border: 'none', background: T.grad, color: T.onAccent,
                font: `700 14.5px ${T.font}`, letterSpacing: '-0.01em', cursor: 'pointer',
                boxShadow: `0 14px 36px ${alpha(T.accent, 0.33)}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {t('nav.openStore')}
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
              </button>
              <button onClick={() => navigate('/stores')} style={{
                height: 52, padding: '0 22px', borderRadius: 16, border: `1px solid ${T.border}`,
                background: T.surface, color: T.text, font: `600 14px ${T.font}`, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {t('landing.browseStores')}
                <span style={{ font: `500 11px ${T.mono}`, color: T.textMute }}>· {list.length}+ {t('landing.live')}</span>
              </button>
            </div>
            {/* Three facts the platform can stand behind, as the design has
                them. This row used to claim "1,240+ makers · 2.1M ₾ paid",
                numbers typed into the code rather than counted anywhere. */}
            <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
              {[t('landing.factFree'), t('landing.factFee'), t('landing.factCards')].map((fact) => (
                <span key={fact} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: `500 13px ${T.font}`, color: T.textDim }}>
                  <span style={{ color: T.success, display: 'inline-flex' }}><Icons.check width="14" height="14" /></span>
                  {fact}
                </span>
              ))}
            </div>
          </div>

          {/* The design's three looks, where an example-store mock used to
              stand: each opens quick setup with that look picked. */}
          <div style={side ? undefined : { marginTop: isMobile ? 28 : 40 }}>
            <HeroLooks
              t={t} scale={isMobile ? 0.66 : 1} count={isMobile ? 2 : 3}
              onPick={(id) => navigate(`/sell?look=${encodeURIComponent(id)}`)}
            />
          </div>
        </div>
      </div>

      {/* HOW IT WORKS — the top bar's "როგორ მუშაობს" lands here (#how). */}
      <div id="how" style={{ padding: isDesktop ? '80px 56px 56px' : '36px 22px 24px', borderTop: `1px solid ${T.border}`, scrollMarginTop: 72 }}>
        <div style={{ font: `600 ${isDesktop ? 11 : 10}px ${T.font}`, color: T.accentFg, letterSpacing: '0.16em', marginBottom: 14 }}>{t('landing.howItWorks')}</div>
        <h2 style={{ font: `700 ${isDesktop ? 38 : 24}px/1.06 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: '0 0 28px', maxWidth: 540 }}>
          {t('landing.howTitle')}
        </h2>
        {/* Four steps, as the design draws them. The fourth — getting paid —
            was missing, which left the sequence ending at "share the link" and
            never answering the question a merchant actually has. */}
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : '1fr', gap: isDesktop ? 24 : 20 }}>
          <HowStep T={T} n="1" title={t('landing.h1')} body={t('landing.h1d')} />
          <HowStep T={T} n="2" title={t('landing.h2')} body={t('landing.h2d')} />
          <HowStep T={T} n="3" title={t('landing.h3')} body={t('landing.h3d')} />
          <HowStep T={T} n="4" title={t('landing.h4')} body={t('landing.h4d')} />
        </div>
      </div>

      {/* FEATURED */}
      <div style={{ padding: isDesktop ? '64px 0 56px' : '24px 0 12px', borderTop: `1px solid ${T.border}` }}>
        <div style={{ padding: pad, marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ font: `600 ${isDesktop ? 11 : 10}px ${T.font}`, color: T.accentFg, letterSpacing: '0.16em', marginBottom: 12 }}>{t('landing.featuredEyebrow')}</div>
            <h2 style={{ font: `700 ${isDesktop ? 38 : 22}px/1.05 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: 0 }}>{t('landing.discover')}.</h2>
          </div>
          <span onClick={() => navigate('/stores')} style={{ font: `600 13px ${T.font}`, color: T.accentFg, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('landing.seeAll')}</span>
        </div>
        {/* The row holds its height while the directory loads, so the strip
            under it never moves when the stores arrive. */}
        {stores === null ? (
          <Skeleton style={{ padding: pad, display: 'flex', gap: 14, overflowX: 'hidden' }}>
            {[0, 1, 2, 3, 4].map((i) => <FeaturedChipSkeleton key={i} T={T} />)}
          </Skeleton>
        ) : (
          <div style={{ padding: pad, display: 'flex', gap: 14, overflowX: 'auto' }}>
            {featured.map((s) => (
              <FeaturedChip key={s.subdomain} T={T} store={s} onClick={() => { window.location.href = storeUrl(s); }} />
            ))}
          </div>
        )}
      </div>

      {/* FEE STRIP — the top bar's "ფასები" lands here (#pricing). */}
      <div id="pricing" style={{ padding: isDesktop ? '56px 56px 80px' : '20px 22px 32px', borderTop: `1px solid ${T.border}`, scrollMarginTop: 72 }}>
        <div style={{
          padding: isDesktop ? '32px' : '20px',
          background: `linear-gradient(135deg, ${alpha(T.accent, 0.06)} 0%, ${alpha(shiftHue(T.accent, 25), 0.06)} 100%)`,
          border: `1px solid ${alpha(T.accent, 0.19)}`, borderRadius: 22, maxWidth: isDesktop ? 760 : '100%',
        }}>
          <div style={{ font: `600 ${isDesktop ? 11 : 10}px ${T.font}`, color: T.accentFg, letterSpacing: '0.16em', marginBottom: 12 }}>{t('landing.fee')}</div>
          <div style={{ font: `700 ${isDesktop ? 28 : 18}px/1.25 ${T.font}`, color: T.text, letterSpacing: '-0.03em', marginBottom: 18, maxWidth: 540 }}>
            {t('landing.feeBody')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 420 }}>
            {[[t('landing.feeListing'), '0 ₾'], [t('landing.feeMonthly'), '0 ₾'], [t('landing.feeCommission'), '2%']].map(([k, v]) => (
              <div key={k}>
                <div style={{ font: `700 ${isDesktop ? 28 : 22}px ${T.font}`, color: T.text, letterSpacing: '-0.04em' }}>{v}</div>
                <div style={{ font: `500 ${isDesktop ? 11 : 9.5}px ${T.font}`, color: T.textMute, letterSpacing: '0.08em', marginTop: 4 }}>{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PFooter />
    </div>
  );
}
