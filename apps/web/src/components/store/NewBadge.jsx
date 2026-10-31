// The "New" badge on a product's photo (the design's `tag`, and T2Screens'
// product page): only for a product added in the last 14 days, and only while
// the store's design keeps `show.badge` on, so it is never a claim the data
// does not back. Placed by its parent, which is `position: relative`.
import { useTranslation } from 'react-i18next';
import { useDesign } from '../../core/design/useDesign';
import { addedRecently } from '../../core/design/show';
import { useGlow } from '../../styles/glow';

// Each theme's tag: dark glass on Liquid Glass, the second neon on Neon, the
// store colour on Soft.
const LOOK = {
  glow: { background: 'rgba(10,10,14,0.74)', color: '#fff' },
  neon: { background: 'var(--k-neon2)', color: 'var(--k-on-neon2)' },
  soft: { background: 'var(--k-pri)', color: 'var(--k-on-pri)' },
};

export default function NewBadge({ createdAt, style }) {
  const { t } = useTranslation('product');
  const { theme, show } = useDesign();
  const { T } = useGlow();
  if (!show.badge || !addedRecently(createdAt)) return null;
  return (
    <span style={{
      position: 'absolute', top: 10, left: 10, padding: '3px 8px', borderRadius: 999,
      // 11px in sentence case, as the design's tag: capitals would turn
      // Georgian into tiny Mtavruli.
      font: `700 11px ${T.font}`, whiteSpace: 'nowrap',
      ...(LOOK[theme] || LOOK.soft), ...style,
    }}>{t('tagNew')}</span>
  );
}
