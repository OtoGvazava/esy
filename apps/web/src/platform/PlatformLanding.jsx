import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform, useStores, PTopBar, PFooter, StoreMark, StoreArtStrip, shiftHue } from './PlatformShared';
import { FEATURED_SUBDOMAINS, storeInitials, storeUrl } from './platformData';

function HowStep({ T, n, title, body }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, background: T.accentBg, color: T.accentFg,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        font: `800 18px ${T.font}`, letterSpacing: '-0.04em', border: `1px solid ${T.accent}22`,
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

export default function PlatformLanding() {
  const { T, dark, isDesktop } = usePlatform();
  const { t } = useTranslation('platform');
  const navigate = useNavigate();
  const { stores } = useStores();
  const list = stores || [];
  const bySub = Object.fromEntries(list.map((s) => [s.subdomain, s]));
  const featured = FEATURED_SUBDOMAINS.map((s) => bySub[s]).filter(Boolean).concat(list).slice(0, 8);
  const f0 = featured[0];

  const pad = isDesktop ? '0 56px' : '0 22px';

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
      <PTopBar current="home" />

      {/* HERO */}
      <div style={{ position: 'relative', padding: isDesktop ? '64px 56px 40px' : '32px 22px 28px', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: isDesktop ? -180 : -100, left: isDesktop ? '20%' : -60, right: isDesktop ? '20%' : -60,
          height: isDesktop ? 480 : 300,
          background: `radial-gradient(50% 70% at 50% 30%, ${T.accent}38, transparent 70%), radial-gradient(40% 60% at 80% 40%, ${shiftHue(T.accent, 25)}30, transparent 70%)`,
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', display: isDesktop ? 'grid' : 'block', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: T.accentBg, color: T.accentFg, font: `600 11px ${T.font}`, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 22 }}>
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
                height: 52, padding: '0 22px', borderRadius: 16, border: 'none', background: T.grad, color: '#fff',
                font: `700 14.5px ${T.font}`, letterSpacing: '-0.01em', cursor: 'pointer',
                boxShadow: `0 14px 36px ${T.accent}55`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
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
            <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {featured.slice(0, 4).map((s, i) => (
                  <span key={s.subdomain} style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${s.primaryColor}, ${s.secondaryColor || s.primaryColor})`,
                    border: `2px solid ${T.bg}`, marginLeft: i === 0 ? 0 : -8,
                    font: `800 9px ${T.font}`, color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{storeInitials(s)[0]}</span>
                ))}
              </div>
              <span style={{ font: `500 12px ${T.font}`, color: T.textMute }}>
                {t('landing.social', { makers: '1,240+', paid: '2.1M ₾' })}
              </span>
            </div>
          </div>

          {isDesktop && f0 && (
            <div style={{ position: 'relative' }}>
              <div style={{ background: T.surface, borderRadius: 22, border: `1px solid ${T.border}`, padding: '18px 18px 20px', boxShadow: dark ? '0 24px 60px rgba(0,0,0,0.45)' : '0 24px 60px rgba(20,20,60,0.10)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                  <div style={{ flex: 1, marginLeft: 12, height: 30, borderRadius: 8, background: T.surface2, display: 'flex', alignItems: 'center', padding: '0 12px', font: `500 12px ${T.mono}`, color: T.textDim }}>
                    <span style={{ color: T.text }}>{f0.subdomain}</span><span>.esy.ge</span>
                  </div>
                </div>
                <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.bg }}>
                  <div style={{ height: 96, position: 'relative', background: `linear-gradient(135deg, ${f0.primaryColor}30 0%, ${(f0.secondaryColor || f0.primaryColor)}20 100%)` }}>
                    <div style={{ position: 'absolute', inset: 0, background: `repeating-linear-gradient(135deg, ${f0.primaryColor}18 0 14px, transparent 14px 28px)` }} />
                    <div style={{ position: 'absolute', left: 14, bottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StoreMark store={f0} size={28} radius={8} />
                      <div>
                        <div style={{ font: `700 13px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{f0.name}</div>
                        <div style={{ font: `500 9.5px ${T.mono}`, color: T.textMute }}>{t('landing.exampleStore')}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ aspectRatio: '1 / 1', borderRadius: 8, background: `repeating-linear-gradient(135deg, ${T.surface2} 0 6px, ${T.bg} 6px 12px)` }} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ position: 'absolute', right: -14, top: -22, padding: '8px 12px', background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 8px 24px rgba(20,20,60,0.10)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3f8a4a' }} />
                <span style={{ font: `700 11px ${T.font}`, color: T.text }}>{t('landing.orderPing')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding: isDesktop ? '80px 56px 56px' : '36px 22px 24px', borderTop: `1px solid ${T.border}` }}>
        <div style={{ font: `600 ${isDesktop ? 11 : 10}px ${T.font}`, color: T.accentFg, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>{t('landing.howItWorks')}</div>
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
            <div style={{ font: `600 ${isDesktop ? 11 : 10}px ${T.font}`, color: T.accentFg, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>{t('landing.featuredEyebrow')}</div>
            <h2 style={{ font: `700 ${isDesktop ? 38 : 22}px/1.05 ${T.font}`, color: T.text, letterSpacing: '-0.035em', margin: 0 }}>{t('landing.discover')}.</h2>
          </div>
          <span onClick={() => navigate('/stores')} style={{ font: `600 13px ${T.font}`, color: T.accentFg, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('landing.seeAll')}</span>
        </div>
        <div style={{ padding: pad, display: 'flex', gap: 14, overflowX: 'auto' }}>
          {featured.map((s) => (
            <FeaturedChip key={s.subdomain} T={T} store={s} onClick={() => { window.location.href = storeUrl(s); }} />
          ))}
        </div>
      </div>

      {/* FEE STRIP */}
      <div style={{ padding: isDesktop ? '56px 56px 80px' : '20px 22px 32px', borderTop: `1px solid ${T.border}` }}>
        <div style={{
          padding: isDesktop ? '32px' : '20px',
          background: `linear-gradient(135deg, ${T.accent}10 0%, ${shiftHue(T.accent, 25)}10 100%)`,
          border: `1px solid ${T.accent}30`, borderRadius: 22, maxWidth: isDesktop ? 760 : '100%',
        }}>
          <div style={{ font: `600 ${isDesktop ? 11 : 10}px ${T.font}`, color: T.accentFg, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>{t('landing.fee')}</div>
          <div style={{ font: `700 ${isDesktop ? 28 : 18}px/1.25 ${T.font}`, color: T.text, letterSpacing: '-0.03em', marginBottom: 18, maxWidth: 540 }}>
            {t('landing.feeBody')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 420 }}>
            {[[t('landing.feeListing'), '0 ₾'], [t('landing.feeMonthly'), '0 ₾'], [t('landing.feeCommission'), '2%']].map(([k, v]) => (
              <div key={k}>
                <div style={{ font: `700 ${isDesktop ? 28 : 22}px ${T.font}`, color: T.text, letterSpacing: '-0.04em' }}>{v}</div>
                <div style={{ font: `500 ${isDesktop ? 11 : 9.5}px ${T.font}`, color: T.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PFooter />
    </div>
  );
}
