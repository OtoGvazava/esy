// Glow product card — ported from direction-a.jsx GlowCard. Uses the real
// product photo when present, falling back to the striped Placeholder (the
// design's intended slot for missing imagery).
//
// The store's design picks how a card is drawn (store plan, Phase 3):
//   grid2 — the two-column card, name and price under the photo
//   grid3 — a photo grid: the photo with its price on it, nothing else
//   feed  — one wide photo per row
//   list  — a row: thumbnail, name and price, the add button at the end
// `look.price` puts the price on the photo; `look.addbtn` "none" drops the
// quick add. A heart would need saved items, which the store doesn't have,
// so "heart" keeps the add button.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, Placeholder } from './GlowPrimitives';
import { money } from './GlowChrome';

const tagBg = (tag, T) =>
  tag === 'new' ? T.accent : tag === 'sale' ? T.danger : tag === 'low' ? T.warn : T.text;

const tagLabel = (tag, t) =>
  tag === 'best' ? `★ ${t('tagBest')}`
    : tag === 'low' ? t('tagLow')
      : tag === 'new' ? t('tagNew')
        : tag === 'sale' ? t('tagSale')
          : tag;

const RATIO = { square: '1 / 1', portrait: '4 / 5', landscape: '4 / 3' };

export default function GlowProductCard({ T, p, hue = 240, compact = false, onOpen, onAdd, layout = 'grid2', look = {} }) {
  const [imgOk, setImgOk] = useState(Boolean(p.image));
  const { t } = useTranslation('product');
  const list = layout === 'list';
  const photoGrid = layout === 'grid3';
  // A list row's thumbnail is too small to carry a price.
  const priceOnPhoto = !list && (photoGrid || look.price === 'photo');
  const showAdd = !photoGrid && look.addbtn !== 'none';
  const ratio = RATIO[look.ratio] || (layout === 'feed' ? '4 / 3' : '1 / 1');

  const photo = (
    <div style={{
      position: 'relative', aspectRatio: list ? '1 / 1' : ratio, overflow: 'hidden', flex: 'none',
      width: list ? 76 : undefined, borderRadius: photoGrid ? 4 : 'var(--k-r-img)',
    }}>
      {imgOk ? (
        <img
          src={p.image}
          alt={p.title}
          onError={() => setImgOk(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Placeholder label={list || photoGrid ? '' : p.title} hue={hue} dark={T.dark} />
      )}
      {p.tag && !photoGrid && !list && (
        <div style={{
          position: 'absolute', top: 10, left: 10, padding: '3px 8px', borderRadius: 999,
          background: tagBg(p.tag, T), color: p.tag === 'best' ? T.bg : '#fff',
          // 9.5px capitals turned Georgian into tiny Mtavruli; the design's
          // tag is 11px in sentence case.
          font: `700 11px ${T.font}`,
        }}>{tagLabel(p.tag, t)}</div>
      )}
      {priceOnPhoto && !list && (
        // A price on a photo sits on a dark pill: glass never carries text.
        <div style={{
          position: 'absolute', left: 8, bottom: 8, padding: '3px 9px', borderRadius: 999,
          background: 'rgba(10,10,14,0.74)', color: '#fff', font: `700 ${photoGrid ? 11 : 12}px ${T.font}`,
          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        }}>{money(p.price)}</div>
      )}
    </div>
  );

  const add = showAdd && (
    <button
      aria-label={t('add')}
      onClick={(e) => { e.stopPropagation(); onAdd?.(p); }}
      style={{
        width: 40, height: 40, flex: 'none', borderRadius: 'var(--k-r-ibtn)', border: 'none',
        background: 'var(--k-ink)', color: 'var(--k-on-ink)',
        display: 'grid', placeItems: 'center', cursor: 'pointer',
      }}
    ><Icon.plus width="18" height="18" /></button>
  );

  // The design's card: the theme decides its ground, padding and corners
  // (Liquid Glass draws a bare photo, Soft a white tile), the photo carries
  // the colour, and the quick add is one round button.
  return (
    <div
      onClick={() => onOpen?.(p)}
      style={{
        background: photoGrid ? 'transparent' : 'var(--k-pc-bg)', borderRadius: 'var(--k-r-card)',
        border: photoGrid ? 'none' : 'var(--k-pc-bd)', padding: photoGrid ? 0 : 'var(--k-pc-pad)',
        boxShadow: photoGrid ? 'none' : 'var(--k-pc-sh, none)',
        display: 'flex', flexDirection: list ? 'row' : 'column', alignItems: list ? 'center' : 'stretch',
        gap: list ? 12 : 8, cursor: 'pointer', minWidth: 0,
      }}
    >
      {photo}
      {!photoGrid && (
        <div style={{ display: 'flex', alignItems: list ? 'center' : 'flex-end', justifyContent: 'space-between', gap: 8, padding: list ? '0 4px 0 0' : '0 4px', flex: list ? 1 : undefined, minWidth: 0 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {/* Two lines of room, so prices line up across a row even when one
                Georgian name wraps and its neighbour does not. */}
            <div style={{ font: `500 ${compact ? 13 : 13.5}px/1.3 ${T.font}`, color: T.text, minHeight: list ? undefined : '2.6em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'break-word' }}>{p.title}</div>
            {!priceOnPhoto && (
              <div style={{ font: `700 ${compact ? 14 : 15}px ${T.font}`, color: T.text, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{money(p.price)}</div>
            )}
          </div>
          {add}
        </div>
      )}
    </div>
  );
}
