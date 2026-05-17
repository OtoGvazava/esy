import { createContext, useContext, useEffect, useState } from 'react';
import { tenantApi } from '../utils/api';

// The backend resolves the tenant from the request Host header, so a single
// build serves every wildcard subdomain — this just surfaces that tenant's
// branding (name / colors / logo) to the UI. useGlow() reads the accent from
// here; null until the fetch resolves (glow falls back to its default brand).
const TenantContext = createContext({ tenant: null, loading: true });

export const useTenant = () => useContext(TenantContext);

export { TenantContext };

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const devTenant = new URLSearchParams(window.location.search).get('tenant');
    tenantApi
      .current(devTenant)
      .then((t) => {
        if (!alive || !t) return;
        setTenant(t);
        const title = t.displayName || t.name;
        if (title) document.title = title;
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

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
};
