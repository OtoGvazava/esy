// The translation namespaces each face of the app reads (core/hostKey.js).
// A page loads its host's namespaces, in its language only (i18n.js), so a
// shopper never downloads the back office's strings and a Georgian page never
// downloads the English ones.
//
// The build checks these lists against the code (vite.config.js): a screen a
// host can reach that reads a namespace missing here fails the build, rather
// than showing its raw keys.

/** Read on every host: one chunk per language (shared.<lang>.js). */
export const SHARED_NS = ['common', 'design', 'home', 'navbar', 'owner', 'product', 'storefront'];

/** Each host's own, beside the shared ones: a chunk per namespace and language. */
export const HOST_NS = {
  store: ['account', 'cart', 'display'],
  platform: ['display', 'platform'],
  manager: ['manager'],
  admin: ['admin', 'cart'],
};

/** Every namespace there is (the design-sync previews load them all). */
export const ALL_NS = [
  ...SHARED_NS, 'account', 'admin', 'auth', 'cart', 'display', 'manager', 'orders', 'platform',
];

/** What a host loads: the shared namespaces and its own. */
export const hostNamespaces = (host) => [...SHARED_NS, ...(HOST_NS[host] || [])];
