// Choosing a combination before buying (decision D11).
//
// The rule that makes this more than a set of buttons: availability is judged
// against the OTHER axis's current selection, not across the product as a
// whole. With 38 chosen, a colour with no stock in 38 is struck through even
// though it exists in 40.
//
// Struck through rather than hidden, deliberately. Hiding it says "we never
// made this"; striking it says "this exists and may come back", which is true
// and is what brings a shopper back. The note underneath names what it is
// unavailable *with*, because otherwise a struck-through size looks like the
// shop is out of that size entirely.
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '../../core/primitives';
import { axisAvailability, rowFor } from '../../core/variants';

/** Low stock worth warning about — the design's threshold. */
const LOW_STOCK = 5;

export default function VariantPicker({ T, variants, basePrice, onChange }) {
  const { t } = useTranslation('storefront');

  // Open on the first combination that can actually be bought, so a shopper
  // landing on the page sees a buyable state rather than a sold-out one.
  const initial = useMemo(() => {
    if (!variants?.rows?.length) return null;
    const buyable = variants.rows.find((r) => Number(r.stock) > 0) || variants.rows[0];
    return buyable.key;
  }, [variants]);

  const [picked, setPicked] = useState(initial);

  const row = picked ? rowFor(variants, picked) : null;
  const stock = row ? Number(row.stock) || 0 : 0;

  // Report the selection upward whenever it settles on a different row.
  const choose = (axisIndex, value) => {
    const next = [...picked];
    next[axisIndex] = value;
    setPicked(next);
    const chosen = rowFor(variants, next);
    if (onChange) onChange(chosen || null);
  };

  // The opening selection has to be reported too, or the page would start
  // with a chosen row the parent does not know about and an Add button that
  // sends no variant.
  useEffect(() => {
    if (onChange) onChange(initial ? rowFor(variants, initial) : null);
    // onChange is intentionally excluded: callers pass an inline function, and
    // depending on it would re-fire this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, variants]);

  if (!variants?.axes?.length || !picked) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {variants.axes.map((axis, ai) => {
        const avail = axisAvailability(variants, ai, picked);
        const anyUnavailable = axis.values.some((v) => !avail[v]);
        const otherChosen = picked.filter((_, i) => i !== ai).join(' · ');

        return (
          <div key={axis.name}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ font: `700 12.5px ${T.font}`, color: T.text }}>{axis.name}</span>
              <span style={{ font: `500 12px ${T.font}`, color: T.textDim }}>{picked[ai]}</span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {axis.values.map((val) => {
                const on = picked[ai] === val;
                const has = !!avail[val];
                return (
                  <button
                    key={val}
                    type="button"
                    // An unavailable value is still readable and still says
                    // what it is; it just cannot be selected.
                    disabled={!has}
                    aria-pressed={on}
                    onClick={() => choose(ai, val)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 48, height: 44, padding: '0 15px', borderRadius: 13,
                      cursor: has ? 'pointer' : 'default',
                      background: on ? T.text : 'transparent',
                      color: on ? T.bg : has ? T.text : T.textMute,
                      border: `1.5px solid ${on ? T.text : T.border}`,
                      font: `600 13px ${T.font}`,
                      textDecoration: has ? 'none' : 'line-through',
                    }}
                  >
                    {val}
                  </button>
                );
              })}
            </div>

            {anyUnavailable && (
              <div style={{ marginTop: 7, font: `400 11.5px/1.5 ${T.font}`, color: T.textMute }}>
                {variants.axes.length > 1
                  ? t('variant.struckWith', { other: otherChosen })
                  : t('variant.struckAlone')}
              </div>
            )}
          </div>
        );
      })}

      {stock > 0 && stock <= LOW_STOCK && (
        <Chip T={T} tone="warn">{t('variant.onlyLeft', { n: stock })}</Chip>
      )}
      {stock === 0 && (
        <Chip T={T} tone="danger">{t('variant.soldOut')}</Chip>
      )}
      {row?.price != null && Number(row.price) !== Number(basePrice) && (
        <div style={{ font: `500 12px ${T.font}`, color: T.textDim }}>
          {t('variant.priceForCombination')}
        </div>
      )}
    </div>
  );
}
