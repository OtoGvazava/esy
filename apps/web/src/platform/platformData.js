// Platform-site data: bilingual strings (EN/KA), category list, and the
// account-hub mock. Store data itself comes from the real backend
// (GET /api/tenant) — see PlatformShared useStores().

export const PLATFORM_ACCENT = '#6366f1'; // indigo · hue 250 · platform default

export const CATEGORIES = [
  { id: 'all', label: 'All stores' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'home', label: 'Home' },
  { id: 'food', label: 'Food' },
  { id: 'art', label: 'Art' },
];

// Featured carousel — by subdomain, falls back to first N stores if absent.
export const FEATURED_SUBDOMAINS = [
  'aurora', 'okra', 'studio-form', 'foglio', 'noor-rugs', 'lemon-press', 'verde', 'kura',
];

// The account hub has no backend yet (the per-tenant user model contradicts
// the one-account design). This mock is the seam: replace with a real
// /api/account aggregation when the global-user model lands.
export const ACCOUNT = {
  name: 'Mariam Harlow',
  email: 'm.harlow@gmail.com',
  initials: 'MH',
  since: '2023',
  ownedStores: {
    seller: [
      { subdomain: 'aurora', status: 'live', orders: 412, revenue: '$18,240', views: '12.4k' },
      { subdomain: 'meadow', status: 'live', orders: 86, revenue: '$3,120', views: '4.8k' },
      { subdomain: 'plana', status: 'draft', orders: 0, revenue: '$0', views: '—' },
    ],
    both: [
      { subdomain: 'aurora', status: 'live', orders: 412, revenue: '$18,240', views: '12.4k' },
      { subdomain: 'meadow', status: 'live', orders: 86, revenue: '$3,120', views: '4.8k' },
    ],
  },
  orders: [
    { id: 'ESY-4019-7', subdomain: 'verde', items: 3, total: '$58.00', status: 'delivered', placed: 'Mar 14' },
    { id: 'ESY-4015-2', subdomain: 'studio-form', items: 1, total: '$72.00', status: 'shipped', placed: 'Mar 11' },
    { id: 'ESY-4011-9', subdomain: 'salt-stoneware', items: 2, total: '$94.00', status: 'out for delivery', placed: 'Mar 10' },
    { id: 'ESY-3998-1', subdomain: 'maris', items: 4, total: '$112.40', status: 'delivered', placed: 'Feb 28' },
  ],
  saved: [
    { id: 's1', label: 'Marigold risograph · A3', price: '$24', subdomain: 'foglio' },
    { id: 's2', label: 'Petty knife · 130mm', price: '$184', subdomain: 'kura' },
    { id: 's3', label: 'Linen workshirt · clay', price: '$118', subdomain: 'okra' },
  ],
  followedStores: ['noor-rugs', 'okra', 'foglio', 'kura', 'salt-stoneware'],
};

export function storeInitials(store) {
  return (store.name || store.subdomain || '?')
    .split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// Public URL for a store. Prod → https://<sub>.esy.ge. Locally → a real
// wildcard subdomain (http://<sub>.lvh.me[:port], or http://<sub>.localhost
// [:port]); the backend parses the label from the Host header. 127.0.0.1 /
// unknown host has no wildcard → ?tenant= fallback.
export function storeUrl(store) {
  const sub = encodeURIComponent(store.subdomain);
  if (typeof window === 'undefined') return `https://${store.subdomain}.esy.ge`;
  const { hostname, origin, protocol, port } = window.location;
  if (hostname.endsWith('esy.ge')) return `https://${store.subdomain}.esy.ge`;
  if (hostname === 'lvh.me' || hostname.endsWith('.lvh.me')) {
    return `${protocol}//${store.subdomain}.lvh.me${port ? `:${port}` : ''}`;
  }
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return `${protocol}//${store.subdomain}.localhost${port ? `:${port}` : ''}`;
  }
  return `${origin}/?tenant=${sub}`; // 127.0.0.1 / unknown host
}
