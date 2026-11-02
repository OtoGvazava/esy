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

// The tab icon index.html ships (esy's own), kept for the platform host.
const PLATFORM_ICON = '/favicon.svg';

const escapeXml = (s) =>
  s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

// A store with no logo gets the same badge the storefront header draws: its
// initial on its accent colour. Latin initials are capitalised; a Georgian
// one stays as it is (its "capital" is Mtavruli, which the design never uses).
const initialIcon = (name, color) => {
  const initial = (Array.from(name.trim())[0] || '?').replace(/[a-z]/, (c) => c.toUpperCase());
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    `<rect width="64" height="64" rx="16" fill="${escapeXml(color || '#6366f1')}"/>` +
    '<text x="32" y="44" text-anchor="middle" font-family="system-ui,-apple-system,\'Segoe UI\',sans-serif" ' +
    `font-size="36" font-weight="800" fill="#fff">${escapeXml(initial)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const setFavicon = (href) => {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  // Logos are uploaded as PNG/JPEG/WebP; let the browser sniff the type
  // rather than keep index.html's svg declaration on a raster file.
  link.removeAttribute('type');
  link.href = href;
};

const applyBranding = (t) => {
  const title = t?.displayName || t?.name;
  if (title) document.title = title;
  if (!t || t.isPlatform) {
    setFavicon(PLATFORM_ICON);
  } else if (t.logoUrl) {
    setFavicon(t.logoUrl);
  } else if (title) {
    setFavicon(initialIcon(title, t.primaryColor));
  }
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
        applyBranding(t);
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
      applyBranding(t);
    }
    return t;
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, refresh }}>
      {children}
    </TenantContext.Provider>
  );
};
