/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantQuery } from '../core/query/queries';

// The backend resolves the tenant from the request Host header, so a single
// build serves every wildcard subdomain — this just surfaces that tenant's
// branding (name / colors / logo) to the UI. useGlow() reads the accent from
// here; null until the fetch resolves (glow falls back to its default brand).
//
// The store arrives with the page itself when the server could put it there
// (main.jsx seeds the cache from it), so a store's first paint is already its
// own. Otherwise it is one cached read, shared with the route loaders.
const TenantContext = createContext({ tenant: null, loading: true, refresh: () => {} });

export const useTenant = () => useContext(TenantContext);

export { TenantContext };

const applyTitle = (t) => {
  const title = t?.displayName || t?.name;
  if (title) document.title = title;
};

export const TenantProvider = ({ children }) => {
  const qc = useQueryClient();
  // No endpoint, or no network: keep the default branding rather than retry.
  const { data, isPending } = useQuery({ ...tenantQuery(), retry: false });
  const tenant = data || null;

  useEffect(() => { applyTitle(tenant); }, [tenant]);

  // Re-pull branding after the owner edits the store so the UI (header, glow
  // accent, title) reflects the change without a full reload.
  const refresh = useCallback(() => qc.fetchQuery({ ...tenantQuery(), staleTime: 0 }), [qc]);

  return (
    <TenantContext.Provider value={{ tenant, loading: isPending, refresh }}>
      {children}
    </TenantContext.Provider>
  );
};
