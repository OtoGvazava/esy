// Decides whether the SPA renders the platform site (esy.ge) or a tenant
// storefront (<sub>.esy.ge). The same bundle serves both; this is the switch.
//
//  - esy.ge / www.esy.ge            → platform
//  - <sub>.esy.ge                   → storefront
//  - localhost without ?tenant=     → platform   (esy.ge dev)
//  - localhost with ?tenant=<sub>   → storefront  (dev store simulation)
//  - ?platform=1 / ?store=1         → explicit override
export function isPlatformHost() {
  if (typeof window === 'undefined') return true;
  const { hostname, search } = window.location;
  const params = new URLSearchParams(search);

  if (params.has('platform')) return true;
  if (params.has('store') || params.get('tenant')) return false;

  if (hostname === 'esy.ge' || hostname === 'www.esy.ge') return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname.endsWith('.esy.ge')) return false; // a tenant subdomain

  // Unknown host (e.g. *.onrender.com preview) → platform by default.
  return true;
}

export function usePlatformHost() {
  return isPlatformHost();
}
