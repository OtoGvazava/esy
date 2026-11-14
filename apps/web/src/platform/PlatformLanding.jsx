// esy.ge's landing page (the design's O1 and O1b): the offer, the stores, the
// ready-made looks, how it works and what it costs. The stores come right
// under the offer, where a visitor sees them without scrolling past the steps.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@mui/material';
import { usePlatform, useStores, PTopBar, PFooter, shiftHue } from './PlatformShared';
import { Chip, Glyph, IconBtn, Lbl, cardStyle, type, usePDevice } from './PlatformKit';
import { CATEGORIES, FEATURED_SUBDOMAINS } from './platformData';
import { PhotosCard, PhotosCardSkeleton } from './DirectoryViews';
import { alpha } from '../core/tokens';
import { Icons } from '../core/icons';
import { LOOKS, lookById } from '../core/design/looks';
import LookThumb from '../components/design/LookThumb';
import { thumbPhotos } from '../components/design/photos';
import { usePhotosReady } from '../core/usePhotosReady';
import { Skeleton } from '../components/skeleton/Skeleton';

// The three looks the page shows (the design's O1), one per theme, each in the
// colour the board draws it with and with the photos of the kind of store it
// shows, three different ones. A tap opens quick setup on that look.
const HERO_LOOKS = [
  { id: 'studio', brand: '#d9480f', mode: 'light', group: 'food' },
  { id: 'social', brand: '#db2777', mode: 'light', group: 'fashion' },
  { id: 'sneaker', brand: '#00b3ff', mode: 'dark', group: 'tech' },
];

// How many stores the shelf holds; "all stores" is one tap away for the rest.
const SHELF = 8;

/** A row that scrolls sideways and snaps to its cards, with no scrollbar drawn. */
const railStyle = (gut, gap) => ({
  display: 'flex', gap, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
  padding: `0 ${gut}px`, scrollPaddingLeft: gut, scrollPaddingRight: gut, WebkitOverflowScrolling: 'touch',
});

function Looks({ t, scale, strip, onPick }) {
  const { t: td } = useTranslation('design');
  // The three light up as one: their photos fade in together once every one
  // of them has decoded, rather than each phone filling in on its own.
  const ready = usePhotosReady(HERO_LOOKS.flatMap(({ id, group }) => thumbPhotos(lookById(id).design, group).urls));
  return (
    <div role="group" aria-label={t('landing.looksLabel')} style={{ display: 'flex', justifyContent: strip ? 'flex-start' : 'center', gap: strip ? 14 : 24 }}>
      {HERO_LOOKS.map(({ id, brand, mode, group }) => {
        const name = td(`names.${id}`);
        return (
          <button
            key={id} type="button" onClick={() => onPick(id)}
            aria-label={t('landing.lookOpen', { name })} title={name}
            style={{ display: 'block', flex: 'none', padding: 0, border: 0, background: 'none', cursor: 'pointer', borderRadius: 28 * scale, scrollSnapAlign: 'start' }}
          >
            <LookThumb design={lookById(id).design} brand={brand} mode={mode} scale={scale} group={group} ready={ready} />
          </button>
        );
      })}
    </div>
  );
}

/** A section's heading row: the title, and what sits at its end. */
function Head({ T, dev, title, big, label, end, gut = true }) {
  const ty = type(T, dev.desk);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: gut ? `0 ${dev.gut}px` : 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        {label && !dev.ph && <Lbl T={T} style={{ color: T.accentFg }}>{label}</Lbl>}
        <h2 style={big && !dev.ph ? ty.h1 : ty.h2}>{title}</h2>
      </div>
      {end && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>{end}</div>}
    </div>
  );
}

const moreLink = (T, ph) => ({
  font: `600 ${ph ? 12.5 : 14}px ${T.font}`, color: T.accentFg, textDecoration: 'none', whiteSpace: 'nowrap',
  // A phone's link is a full touch target without moving the row.
  padding: ph ? '12px 0' : 0, margin: ph ? '-12px 0' : 0,
});

/**
 * The stores, right under the offer (the design's Shelf): the ones with
 * product photos first, a category filter, and a row that scrolls sideways,
 * by touch on a phone and a tablet and by the arrows on a desktop.
 */
function Discover({ T, t, stores, dev }) {
  const [cat, setCat] = useState('all');
  const rail = useRef(null);

  // Stores with photos lead, the featured ones first among equals: a card
  // without photos is the store's initials on a plain tile.
  const ranked = useMemo(() => {
    const feat = new Map(FEATURED_SUBDOMAINS.map((s, i) => [s, i]));
    const photos = (s) => Math.min(3, (s.productPhotos || []).length);
    const place = (s) => feat.get(s.subdomain) ?? FEATURED_SUBDOMAINS.length;
    return [...(stores || [])].sort((a, b) => photos(b) - photos(a) || place(a) - place(b));
  }, [stores]);
  const cats = CATEGORIES.filter((c) => c.id === 'all' || ranked.some((s) => s.category === c.id));
  const shown = (cat === 'all' ? ranked : ranked.filter((s) => s.category === cat)).slice(0, SHELF);
  const perRow = dev.desk ? 4 : dev.tab ? 3 : 1;
  const gap = dev.desk ? 20 : dev.tab ? 16 : 12;

  useEffect(() => { if (rail.current) rail.current.scrollLeft = 0; }, [cat]);

  // Nothing to discover (no stores yet, or the directory did not load): no section.
  if (stores && !ranked.length) return null;

  const step = (dir) => () => rail.current?.scrollBy({ left: dir * rail.current.clientWidth, behavior: 'smooth' });
  const card = {
    flex: 'none', scrollSnapAlign: 'start', boxSizing: 'border-box',
    width: dev.ph ? 264 : `calc((100% - ${gap * (perRow - 1)}px) / ${perRow})`,
  };

  return (
    <section aria-label={t('landing.discover')} style={{ display: 'flex', flexDirection: 'column', gap: dev.ph ? 12 : 18, paddingTop: dev.ph ? 28 : 48 }}>
      <Head
        T={T} dev={dev} big title={t('landing.discover')} label={t('landing.discoverLabel')}
        end={(
          <>
            <Link to="/stores" style={moreLink(T, dev.ph)}>
              {t(dev.ph ? 'landing.discoverAllShort' : 'landing.discoverAll', { n: ranked.length })}
            </Link>
            {dev.desk && shown.length > perRow && (
              <>
                <IconBtn T={T} label={t('landing.shelfPrev')} onClick={step(-1)} style={{ background: 'transparent', boxShadow: `inset 0 0 0 1.5px ${T.border}` }}><Glyph name="back" /></IconBtn>
                <IconBtn T={T} label={t('landing.shelfNext')} onClick={step(1)} style={{ background: 'transparent', boxShadow: `inset 0 0 0 1.5px ${T.border}` }}><Glyph name="chevR" /></IconBtn>
              </>
            )}
          </>
        )}
      />

      {cats.length > 2 && (
        <div role="group" aria-label={t('landing.discoverFilter')} style={{ ...railStyle(dev.gut, 8), scrollSnapType: 'none' }}>
          {cats.map((c) => {
            const on = c.id === cat;
            return (
              <button
                key={c.id} type="button" aria-pressed={on} onClick={() => setCat(c.id)}
                style={{
                  height: 38, padding: '0 16px', borderRadius: 999, flex: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: on ? 'var(--k-pill-on)' : 'var(--k-pill-bg)', color: on ? 'var(--k-pill-on-fg)' : T.text,
                  border: on ? '1px solid transparent' : 'var(--k-pill-bd)', font: `${on ? 600 : 500} 13.5px ${T.font}`,
                }}
              >
                {t(`directory.cat.${c.id}`)}
              </button>
            );
          })}
        </div>
      )}

      {/* The row holds its height while the directory loads, so the page
          under it never moves when the stores arrive. */}
      {stores === null ? (
        <Skeleton style={{ ...railStyle(dev.gut, gap), overflowX: 'hidden' }}>
          {Array.from({ length: perRow + 1 }).map((_, i) => <PhotosCardSkeleton key={i} T={T} compact={dev.ph} style={card} />)}
        </Skeleton>
      ) : (
        <div ref={rail} style={{ ...railStyle(dev.gut, gap), overflowX: dev.desk ? 'hidden' : 'auto' }}>
          {shown.map((s) => <PhotosCard key={s.subdomain} T={T} t={t} store={s} compact={dev.ph} style={card} />)}
        </div>
      )}
    </section>
  );
}

/** One step of "how it works": its number, what to do, and a line about it. */
function HowStep({ T, dev, n, title, body, style }) {
  const ty = type(T, dev.desk);
  return (
    <div style={{ ...cardStyle(T), padding: 22, display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      <Chip T={T} tone="conf" nd style={{ width: 28, height: 28, padding: 0, justifyContent: 'center', alignSelf: 'flex-start', fontSize: 13 }}>{n}</Chip>
      <h3 style={ty.h3}>{title}</h3>
      <p style={{ ...ty.body, ...ty.sm, ...ty.dim }}>{body}</p>
    </div>
  );
}

/**
 * The steps: side by side where they fit, and on a phone a row to swipe, with
 * dots that follow the card in view.
 */
function How({ T, t, dev }) {
  const steps = [1, 2, 3, 4].map((n) => ({ n, title: t(`landing.h${n}`), body: t(`landing.h${n}d`) }));
  const [at, setAt] = useState(0);
  const onScroll = (e) => {
    const el = e.currentTarget;
    const card = el.firstElementChild?.getBoundingClientRect().width || 1;
    setAt(Math.min(steps.length - 1, Math.round(el.scrollLeft / (card + 12))));
  };
  const ty = type(T, dev.desk);
  return (
    <section id="how" style={{ display: 'flex', flexDirection: 'column', gap: dev.ph ? 12 : 16, paddingTop: dev.ph ? 28 : 48, scrollMarginTop: 16 }}>
      <Head
        T={T} dev={dev} title={t('landing.howItWorks')}
        end={dev.ph && (
          <div aria-hidden="true" style={{ display: 'flex', gap: 6 }}>
            {steps.map((s, i) => (
              <span key={s.n} style={{ width: i === at ? 20 : 7, height: 7, borderRadius: 4, background: i === at ? T.accent : T.border, transition: 'width .18s ease, background-color .18s ease' }} />
            ))}
          </div>
        )}
      />
      {!dev.ph && <p style={{ ...ty.body, ...ty.dim, padding: `0 ${dev.gut}px`, marginTop: -8 }}>{t('landing.howTitle')}</p>}
      {dev.ph ? (
        <div onScroll={onScroll} style={railStyle(dev.gut, 12)}>
          {steps.map((s) => <HowStep key={s.n} T={T} dev={dev} {...s} style={{ flex: 'none', width: 286, scrollSnapAlign: 'start' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${dev.desk ? 4 : 2}, minmax(0, 1fr))`, gap: dev.desk ? 16 : 14, padding: `0 ${dev.gut}px` }}>
          {steps.map((s) => <HowStep key={s.n} T={T} dev={dev} {...s} />)}
        </div>
      )}
    </section>
  );
}

/** What it costs: a card with the three numbers, and on a phone one short line of them. */
function Prices({ T, t, dev }) {
  const ty = type(T, dev.desk);
  // Amounts, not copy: the same figures in both languages.
  const rows = [[t('landing.feeListing'), '0 ₾'], [t('landing.feeMonthly'), '0 ₾'], [t('landing.feeCommission'), '2%']];
  return (
    <section id="pricing" aria-label={t('landing.fee')} style={{ padding: `${dev.ph ? 18 : 16}px ${dev.gut}px ${dev.ph ? 28 : 48}px`, scrollMarginTop: 16 }}>
      {dev.ph ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', ...ty.body, ...ty.sm, ...ty.dim }}>
          {rows.map(([k, v]) => (
            <span key={k}><b style={{ color: T.text, fontVariantNumeric: 'tabular-nums' }}>{v}</b> {k}</span>
          ))}
        </div>
      ) : (
        <div style={{ ...cardStyle(T), padding: 22, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 320px', minWidth: 0 }}>
            <Lbl T={T} style={{ color: T.accentFg }}>{t('landing.fee')}</Lbl>
            <h2 style={ty.h2}>{t('landing.feeBody')}</h2>
          </div>
          <div style={{ display: 'flex', gap: 36, flex: 'none' }}>
            {rows.map(([k, v]) => (
              <div key={k}>
                <b style={{ ...ty.h1, display: 'block', fontVariantNumeric: 'tabular-nums' }}>{v}</b>
                <span style={{ ...ty.sm, ...ty.dim }}>{k}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function PlatformLanding() {
  const { T } = usePlatform();
  const { t } = useTranslation('platform');
  const navigate = useNavigate();
  const { stores } = useStores();
  const dev = usePDevice();
  const count = (stores || []).length;
  // The looks sit beside the hero's words where three full-size thumbnails
  // leave the words room, and under them on a tablet; a phone shows them
  // after the stores, as a row to swipe.
  const side = useMediaQuery('(min-width:1280px)') && dev.desk;
  const pickLook = (id) => navigate(`/sell?look=${encodeURIComponent(id)}`);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
      <PTopBar current="home" />

      {/* HERO */}
      <div style={{ position: 'relative', padding: dev.desk ? `56px ${dev.gut}px 0` : dev.tab ? `40px ${dev.gut}px 0` : `12px ${dev.gut}px 0`, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: dev.desk ? -180 : -100, left: dev.desk ? '20%' : -60, right: dev.desk ? '20%' : -60,
          height: dev.desk ? 480 : 300,
          background: `radial-gradient(50% 70% at 50% 30%, ${alpha(T.accent, 0.22)}, transparent 70%), radial-gradient(40% 60% at 80% 40%, ${alpha(shiftHue(T.accent, 25), 0.19)}, transparent 70%)`,
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', display: side ? 'grid' : 'block', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: T.accentBg, color: T.accentFg, font: `600 11px ${T.font}`, letterSpacing: '0.1em', marginBottom: dev.ph ? 16 : 22 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
              {t('landing.heroEyebrow')}
            </div>
            <h1 style={{ font: `700 ${dev.desk ? 64 : dev.tab ? 44 : 34}px/1.05 ${T.font}`, color: T.text, letterSpacing: '-0.04em', margin: `0 0 ${dev.ph ? 14 : 22}px`, maxWidth: 620 }}>
              {t('landing.heroTitlePre')}<span style={{ background: T.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>esy</span>{t('landing.heroTitlePost')}
            </h1>
            <div style={{ font: `400 ${dev.desk ? 16.5 : 14.5}px/1.55 ${T.font}`, color: T.textDim, maxWidth: 540, marginBottom: dev.ph ? 18 : 30 }}>
              {t('landing.heroBodyPre')}<span style={{ color: T.text, fontFamily: T.mono, fontSize: dev.desk ? 14.5 : 13 }}>your-name.esy.ge</span>{t('landing.heroBodyPost')}
            </div>
            <div style={{ display: 'flex', flexDirection: dev.ph ? 'column' : 'row', alignItems: dev.ph ? 'stretch' : 'center', flexWrap: 'wrap', gap: 12 }}>
              <button onClick={() => navigate('/sell')} style={{
                height: 52, padding: '0 22px', borderRadius: 16, border: 'none', background: T.grad, color: T.onAccent,
                font: `700 14.5px ${T.font}`, letterSpacing: '-0.01em', cursor: 'pointer',
                boxShadow: `0 14px 36px ${alpha(T.accent, 0.33)}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {t('nav.openStore')}
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
              </button>
              {/* A phone has the stores right below and in its bottom menu. */}
              {!dev.ph && (
                <button onClick={() => navigate('/stores')} style={{
                  height: 52, padding: '0 22px', borderRadius: 16, border: `1px solid ${T.border}`,
                  background: T.surface, color: T.text, font: `600 14px ${T.font}`, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {t('landing.browseStores')}
                  {count > 0 && <span style={{ font: `500 11px ${T.mono}`, color: T.textMute }}>· {count}+ {t('landing.live')}</span>}
                </button>
              )}
            </div>
            {/* Three facts the platform can stand behind, as the design has them. */}
            <div style={{ marginTop: dev.ph ? 16 : 24, display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
              {[t('landing.factFree'), t('landing.factFee'), t('landing.factCards')].map((fact) => (
                <span key={fact} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: `500 13px ${T.font}`, color: T.textDim }}>
                  <span style={{ color: T.success, display: 'inline-flex' }}><Icons.check width="14" height="14" /></span>
                  {fact}
                </span>
              ))}
            </div>
          </div>

          {/* The design's three looks: each opens quick setup with that look picked. */}
          {!dev.ph && (
            <div style={side ? undefined : { marginTop: 40 }}>
              <Looks t={t} scale={1} onPick={pickLook} />
            </div>
          )}
        </div>
      </div>

      <Discover T={T} t={t} stores={stores} dev={dev} />

      {dev.ph && (
        <section aria-label={t('landing.looksTitle')} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 28 }}>
          <Head
            T={T} dev={dev} title={t('landing.looksTitle')}
            end={<Link to="/sell" style={moreLink(T, true)}>{t('landing.looksCount', { n: LOOKS.length })}</Link>}
          />
          <div style={railStyle(dev.gut, 14)}>
            <Looks t={t} scale={0.66} strip onPick={pickLook} />
          </div>
        </section>
      )}

      {/* The top bar's "როგორ მუშაობს" and "ფასები" land on these two (#how, #pricing). */}
      <How T={T} t={t} dev={dev} />
      <Prices T={T} t={t} dev={dev} />

      <PFooter />
    </div>
  );
}
