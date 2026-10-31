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
