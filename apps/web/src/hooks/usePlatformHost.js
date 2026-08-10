// Decides which face of the SPA a hostname gets. One bundle serves all four;
// these are the switches. The host rules themselves live in utils/hosts.js,
// which mirrors the backend's PlatformHosts.java — do not re-list hosts here.
//
//  - esy.ge / www.esy.ge            → platform
//  - manager.esy.ge                 → manager        (back office)
//  - admin.esy.ge                   → admin          (platform administration)
//  - <sub>.esy.ge                   → storefront
//  - the same four on lvh.me and localhost, for local dev
//  - localhost with ?tenant=<sub>   → storefront    (dev store simulation)
//  - ?platform=1 / ?store=1 / ?manager=1 / ?admin=1 → explicit override
import {
  isAdminHostname,
  isApexHostname,
  isManagerHostname,
  overrides,
  storefrontSubdomain,
  adminUrl,
  managerUrl,
} from '../utils/hosts';

export function isManagerHost() {
  if (typeof window === 'undefined') return false;
  if (overrides.manager()) return true;
  return isManagerHostname();
}

export function isAdminHost() {
  if (typeof window === 'undefined') return false;
  if (overrides.admin()) return true;
  return isAdminHostname();
}

export function isPlatformHost() {
  if (typeof window === 'undefined') return true;
  // The back office and administration are their own faces, not the front door.
  if (isManagerHost() || isAdminHost()) return false;
  if (overrides.platform()) return true;
  if (overrides.store()) return false;
  try {
    if (new URLSearchParams(window.location.search).get('tenant')) return false;
  } catch { /* SSR */ }

  const { hostname } = window.location;
  const h = hostname.toLowerCase();
  if (isApexHostname(h)) return true;
  if (h === 'localhost' || h === '127.0.0.1') return true;
  if (storefrontSubdomain(h)) return false; // a tenant subdomain
  // Unknown host (e.g. *.onrender.com preview) → platform by default.
  return true;
}

export function usePlatformHost() {
  return isPlatformHost();
}

export { managerUrl, adminUrl };
