// The verified tick beside a store's name (the design's `vtick`): a scalloped
// badge in the store's colour with a white check. It shows only when esy has
// verified the store (`tenant.verifiedAt`, set by an admin) and the store's
// design keeps `show.tick` on, so a store can never claim it on its own.
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../contexts/TenantContext';
import { useDesign } from '../../core/design/useDesign';
import { useGlow } from '../../styles/glow';

const ellipsis = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

/** The tick alone, or nothing when the store is not verified or hides it. */
export function VerifiedTick({ size = 16 }) {
  const { t } = useTranslation('design');
  const { tenant } = useTenant();
  const { show } = useDesign();
  const { dark } = useGlow();
  if (!tenant?.verifiedAt || !show.tick) return null;
  const label = t('store.verified');
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={label}
      // The kit draws it in the accent ink on light grounds and in the store
      // colour itself on dark ones.
      style={{ flex: 'none', display: 'block', color: dark ? 'var(--k-brand)' : 'var(--k-acc)' }}
    >
      <title>{label}</title>
      <path fill="currentColor" d="m12 2.5 2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.9-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z" />
      <path d="m8.5 12 2.3 2.3 4.7-4.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A store name with its tick after it. A name too long for its room shortens
 * with an ellipsis; the tick never does, so a long name cannot push it out.
 * `style` sets the row's type and alignment (the name inherits the font).
 */
export function StoreName({ name, size = 16, style }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, ...style }}>
      <span style={ellipsis}>{name}</span>
      <VerifiedTick size={size} />
    </span>
  );
}
