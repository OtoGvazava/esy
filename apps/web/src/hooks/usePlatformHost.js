// Decides which face of the SPA a hostname gets. The same bundle serves all
// three; these are the switches.
//
//  - esy.ge / www.esy.ge            → platform
//  - manager.esy.ge                 → manager        (back office)
//  - <sub>.esy.ge                   → storefront
//  - lvh.me / www.lvh.me            → platform      (local dev)
//  - manager.lvh.me                 → manager        (local dev)
//  - <sub>.lvh.me                   → storefront    (local wildcard dev)
//  - <sub>.localhost                → storefront   (local wildcard, Chrome)
//  - www.localhost / localhost      → platform      (esy.ge dev)
//  - localhost with ?tenant=<sub>   → storefront    (dev store simulation)
//  - ?platform=1 / ?store=1 / ?manager=1 → explicit override
export function isManagerHost() {
  if (typeof window === 'undefined') return false;
  const { hostname, search } = window.location;
  if (new URLSearchParams(search).has('manager')) return true;
  return hostname === 'manager.esy.ge'
    || hostname === 'manager.lvh.me'
    || hostname === 'manager.localhost';
}

export function isPlatformHost() {
  if (typeof window === 'undefined') return true;
  const { hostname, search } = window.location;
  const params = new URLSearchParams(search);

  if (isManagerHost()) return false; // manager is its own face, not the front door
  if (params.has('platform')) return true;
  if (params.has('store') || params.get('tenant')) return false;

  if (hostname === 'esy.ge' || hostname === 'www.esy.ge' || hostname === 'www.localhost'
      || hostname === 'lvh.me' || hostname === 'www.lvh.me') return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname.endsWith('.esy.ge') || hostname.endsWith('.localhost')
      || hostname.endsWith('.lvh.me')) return false; // a tenant subdomain

  // Unknown host (e.g. *.onrender.com preview) → platform by default.
  return true;
}

export function usePlatformHost() {
  return isPlatformHost();
}

/** Absolute URL of the back office for the current environment. */
export function managerUrl(path = '/') {
  if (typeof window === 'undefined') return `https://manager.esy.ge${path}`;
  const { hostname, port, protocol } = window.location;
  const p = port ? `:${port}` : '';
  if (hostname.endsWith('lvh.me')) return `${protocol}//manager.lvh.me${p}${path}`;
  if (hostname.endsWith('localhost') || hostname === '127.0.0.1') {
    return `${protocol}//manager.localhost${p}${path}`;
  }
  return `https://manager.esy.ge${path}`;
}
