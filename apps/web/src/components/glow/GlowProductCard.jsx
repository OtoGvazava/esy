// Glow product card — ported from direction-a.jsx GlowCard. Uses the real
// product photo when present, falling back to the striped Placeholder (the
// design's intended slot for missing imagery).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, Placeholder } from './GlowPrimitives';
import { money } from './GlowChrome';
import { useSaved } from '../../contexts/SavedContext';

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
  const { isSaved, toggleSaved } = useSaved();
  const { t } = useTranslation('product');
  const saved = isSaved(p.id);
  return (
    <div
      onClick={() => onOpen?.(p)}
      style={{
        background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1 / 1' }}>
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
        <button
          aria-label={saved ? 'remove from saved' : 'save'}
          onClick={(e) => { e.stopPropagation(); toggleSaved({ id: p.id, title: p.title, price: p.price, image: p.image, thumbnail: p.thumbnail }); }}
          style={{
            position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%',
            border: 'none', cursor: 'pointer',
            background: T.dark ? 'rgba(10,10,18,0.55)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)', color: saved ? T.accent : T.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        ><Icon.heart /></button>
        {p.tag && (
          <div style={{
            position: 'absolute', top: 10, left: 10, padding: '3px 8px', borderRadius: 999,
            background: tagBg(p.tag, T), color: p.tag === 'best' ? T.bg : '#fff',
            font: `700 9.5px ${T.font}`, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{tagLabel(p.tag, t)}</div>
        )}
      </div>
      <div style={{ padding: compact ? '10px 12px 12px' : '14px 14px 14px' }}>
        <div style={{ font: `600 ${compact ? 13 : 14}px ${T.font}`, color: T.text, letterSpacing: '-0.01em', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
        {p.blurb && (
          <div style={{ font: `400 ${compact ? 11 : 12}px ${T.font}`, color: T.textMute, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.blurb}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: p.blurb ? 0 : 10 }}>
          <div style={{ font: `700 ${compact ? 15 : 17}px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{money(p.price)}</div>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd?.(p); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: compact ? '6px 10px' : '7px 12px',
              borderRadius: 999, border: 'none', background: T.grad, color: '#fff',
              font: `600 ${compact ? 11 : 12}px ${T.font}`, cursor: 'pointer',
            }}
          ><Icon.plus /> {t('add')}</button>
        </div>
      </div>
    </div>
  );
}
