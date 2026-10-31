// Quick setup's "pick a look" (the design's O5), with "more looks" (O6) as a
// sheet. Three looks suit what the seller said they sell; the sheet has all of
// them. Every thumbnail is drawn in the seller's own colour, because a look
// carries none. The choice is a look id; registration sends that look's
// design object with the new store.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LookThumb from './LookThumb';
import { LOOKS, groupOf, lookById, suggestedLooks } from '../../core/design/looks';

function LookCard({ T, t, look, on, brand, mode, scale, onPick, showGroup, flex }) {
  const d = look.design;
  return (
    <button
      type="button"
      onClick={() => onPick(look.id)}
      aria-pressed={on}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', minWidth: 0,
        padding: 10, borderRadius: 20, cursor: 'pointer', textAlign: 'left', flex, scrollSnapAlign: 'start',
        background: T.surface, border: `${on ? 2 : 1}px solid ${on ? brand : T.border}`,
        boxShadow: on ? `0 0 0 4px color-mix(in srgb, ${brand} 18%, transparent)` : 'none',
      }}
    >
      <span style={{ position: 'relative', display: 'block' }}>
        <LookThumb design={d} brand={brand} mode={mode} scale={scale} />
        {/* The choice sits on the thumbnail, so the name keeps the card's width. */}
        {on && (
          <span style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            padding: '2px 9px', borderRadius: 999, background: brand,
            color: T.onAccent, font: `600 11px/18px ${T.font}`, whiteSpace: 'nowrap',
          }}>{t('look.picked')}</span>
        )}
      </span>
      <span style={{ display: 'block', width: '100%', minWidth: 0 }}>
        <span style={{ display: 'block', font: `700 14px ${T.font}`, color: T.text }}>{t(`names.${look.id}`)}</span>
        <span style={{ display: 'block', marginTop: 2, font: `400 12px/1.4 ${T.font}`, color: T.textDim }}>
          {showGroup ? `${t(`group.${look.group}`)} · ` : ''}
          {t(`theme.${d.theme}`)} · {t(`menu.${d.menu}`)} · {t(`layout.${d.productLayout}`)}
        </span>
      </span>
    </button>
  );
}

export default function LookPicker({ T, category, categoryLabel, value, onChange, brand, mode, isMobile }) {
  const { t } = useTranslation('design');
  const [more, setMore] = useState(false);
  // A look picked from the sheet, on the landing page or by the store before
  // leads the row, so the choice is always in view (the editor's Z3 row
  // starts with it too).
  const suggested = suggestedLooks(category);
  const picked = lookById(value);
  const three = picked && !suggested.includes(picked) ? [picked, ...suggested.slice(0, 2)] : suggested;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ font: `700 16px ${T.font}`, color: T.text, marginBottom: 4 }}>{t('look.title')}</div>
      <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim, marginBottom: 12 }}>
        {categoryLabel ? t('look.sub', { cat: categoryLabel }) : t('look.subAny')}
      </div>
      {/* A row that scrolls: three cards fit the 460px column, and a phone
          shows two and a half, so the third reads as "there is more". */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 4 }}>
        {three.map((look) => (
          <LookCard
            key={look.id} T={T} t={t} look={look} on={value === look.id} brand={brand}
            mode={mode} scale={0.58} onPick={onChange} flex="0 0 136px"
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setMore(true)}
        style={{
          marginTop: 10, height: 44, padding: '0 16px', borderRadius: 999, cursor: 'pointer',
          border: `1px solid ${T.border}`, background: 'transparent', color: T.text,
          font: `600 13px ${T.font}`,
        }}
      >{t('look.more', { count: LOOKS.length })}</button>

      {more && (
        <div role="dialog" aria-modal="true" aria-label={t('look.moreTitle')} style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
          <div onClick={() => setMore(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)' }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88vh', overflowY: 'auto',
            maxWidth: 980, margin: '0 auto', background: T.page || T.bg, borderRadius: '24px 24px 0 0',
            padding: isMobile ? '18px 16px 28px' : '24px 28px 32px', boxShadow: T.shadow,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ font: `700 20px ${T.font}`, color: T.text }}>{t('look.moreTitle')}</div>
                <div style={{ font: `400 13px ${T.font}`, color: T.textDim, marginTop: 2 }}>{t('look.moreSub')}</div>
              </div>
              <button
                type="button" onClick={() => setMore(false)}
                style={{ height: 40, padding: '0 16px', borderRadius: 999, border: `1px solid ${T.border}`, background: T.surface, color: T.text, font: `600 13px ${T.font}`, cursor: 'pointer' }}
              >{t('look.close')}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 150 : 170}px, 1fr))`, gap: 12 }}>
              {LOOKS.map((look) => (
                <LookCard
                  key={look.id} T={T} t={t} look={look} on={value === look.id} brand={brand}
                  mode={mode} scale={isMobile ? 0.6 : 0.68} showGroup={look.group !== groupOf(category)}
                  onPick={(id) => { onChange(id); setMore(false); }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
