/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { tenantApi } from '../utils/api';

// The backend resolves the tenant from the request Host header, so a single
// build serves every wildcard subdomain — this just surfaces that tenant's
// branding (name / colors / logo) to the UI. useGlow() reads the accent from
// here; null until the fetch resolves (glow falls back to its default brand).
const TenantContext = createContext({ tenant: null, loading: true, refresh: () => {} });

export const useTenant = () => useContext(TenantContext);

export { TenantContext };

const devTenantParam = () =>
  new URLSearchParams(window.location.search).get('tenant');

const applyTitle = (t) => {
  const title = t?.displayName || t?.name;
  if (title) document.title = title;
};

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    tenantApi
      .current(devTenantParam())
      .then((t) => {
        if (!alive || !t) return;
        setTenant(t);
        applyTitle(t);
      })
      .catch(() => {
        /* no tenant endpoint / network — keep default branding */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Re-pull branding after the owner edits the store so the UI (header, glow
  // accent, title) reflects the change without a full reload.
  const refresh = useCallback(async () => {
    const t = await tenantApi.current(devTenantParam());
    if (t) {
      setTenant(t);
      applyTitle(t);
    }
    return t;
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, refresh }}>
      {children}
    </TenantContext.Provider>
  );
};
