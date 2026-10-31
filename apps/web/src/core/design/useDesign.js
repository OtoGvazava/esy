// The current store's published design, normalised. A store without one, or a
// platform with the design switch off (the API then sends `design: null`),
// resolves to the default: today's Liquid Glass storefront.
import { useContext, useMemo } from 'react';
import { TenantContext } from '../../contexts/TenantContext';
import { normalizeDesign } from './normalize';

export function useDesign() {
  const { tenant } = useContext(TenantContext);
  const raw = tenant?.design;
  return useMemo(() => normalizeDesign(raw), [raw]);
}

/**
 * How far a fixed bottom bar (the bag's checkout bar, a confirmation's
 * actions) sits up from the screen's edge: clear of a bottom menu (the tab
 * bar, capsule or icon island, and the action button, which sits under the
 * bar), or on the edge when the store's menu lives at the top or the side.
 */
export function useBottomClearance() {
  const { menu } = useDesign();
  return menu === 'top' || menu === 'drawer' ? 0 : 92;
}
