// Glow product card — ported from direction-a.jsx GlowCard. Uses the real
// product photo when present, falling back to the striped Placeholder (the
// design's intended slot for missing imagery).
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

export default function GlowProductCard({ T, p, hue = 240, compact = false, onOpen, onAdd }) {
  const [imgOk, setImgOk] = useState(Boolean(p.image));
  const { t } = useTranslation('product');
  // The design's card: the theme decides its ground, padding and corners
  // (Liquid Glass draws a bare photo, Soft a white tile), the photo carries
  // the colour, and the quick add is one round button.
  return (
    <div
      onClick={() => onOpen?.(p)}
      style={{
        background: 'var(--k-pc-bg)', borderRadius: 'var(--k-r-card)', border: 'var(--k-pc-bd)',
        padding: 'var(--k-pc-pad)', display: 'flex', flexDirection: 'column', gap: 8,
        cursor: 'pointer', minWidth: 0,
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 'var(--k-r-img)', overflow: 'hidden' }}>
        {imgOk ? (
          <img
            src={p.image}
            alt={p.title}
            onError={() => setImgOk(false)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Placeholder label={p.title} hue={hue} dark={T.dark} />
        )}
        {p.tag && (
          <div style={{
            position: 'absolute', top: 10, left: 10, padding: '3px 8px', borderRadius: 999,
            background: tagBg(p.tag, T), color: p.tag === 'best' ? T.bg : '#fff',
            // 9.5px capitals turned Georgian into tiny Mtavruli; the design's
            // tag is 11px in sentence case.
            font: `700 11px ${T.font}`,
          }}>{tagLabel(p.tag, t)}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, padding: '0 4px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Two lines of room, so prices line up across a row even when one
              Georgian name wraps and its neighbour does not. */}
          <div style={{ font: `500 ${compact ? 13 : 13.5}px/1.3 ${T.font}`, color: T.text, minHeight: '2.6em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'break-word' }}>{p.title}</div>
          <div style={{ font: `700 ${compact ? 14 : 15}px ${T.font}`, color: T.text, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{money(p.price)}</div>
        </div>
        <button
          aria-label={t('add')}
          onClick={(e) => { e.stopPropagation(); onAdd?.(p); }}
          style={{
            width: 40, height: 40, flex: 'none', borderRadius: 'var(--k-r-ibtn)', border: 'none',
            background: 'var(--k-ink)', color: 'var(--k-on-ink)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}
        ><Icon.plus width="18" height="18" /></button>
      </div>
    </div>
  );
}
