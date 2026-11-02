// The app's router: react-router's data router, with one route table per host
// under the shared root (App.jsx's AppRoot).
//
// The data router is what lets a navigation keep the old screen until the new
// one is ready (route loaders fill the query cache first, prime.js), report
// that it is waiting (useNavigation, behind NavProgress), restore the scroll
// position on back and forward, and cross-fade from one page to the next.
//
// Each host's table is its own chunk, so a shopper never downloads the back
// office and an admin never downloads the shop: only the table for this host
// is fetched (the page's pre-paint script, boot/paint.js, starts that fetch
// alongside the app's own). Within a table, screens off the first path are
// chunks of their own too, warmed once the page is idle.
import { createBrowserRouter } from 'react-router-dom';
import AppRoot from '../App';
import { isAdminHost, isManagerHost, isPlatformHost } from '../hooks/usePlatformHost';
import { motionAllowed } from '../core/motion';
import { prefetchRoute, setPrefetchRoutes, setRouter } from './prime';

// esy.ge → the platform front door; manager.esy.ge → the back office;
// admin.esy.ge → administration; <sub>.esy.ge → a storefront.
const HOSTS = {
  store: () => import('./store'),
  platform: () => import('./platform'),
  manager: () => import('./manager'),
  admin: () => import('./admin'),
};

export function hostKey() {
  if (isAdminHost()) return 'admin';
  if (isManagerHost()) return 'manager';
  return isPlatformHost() ? 'platform' : 'store';
}

const pathOf = (to) => {
  if (typeof to === 'string') {
    try { return new URL(to, window.location.href).pathname; } catch { return null; }
  }
  return to?.pathname ?? window.location.pathname;
};

// Every move to another page cross-fades (styles/motion.css), unless the
// shopper or the device asks for less motion. A change within one page — a
// filter, a sort, a tab kept in the address — swaps in place instead, and a
// caller can still decide for itself by passing viewTransition.
function crossFade(router) {
  const go = router.navigate;
  router.navigate = (to, opts) => {
    if (typeof to === 'number' || opts?.viewTransition !== undefined || !motionAllowed()) return go(to, opts);
    const next = pathOf(to);
    return go(to, { ...opts, viewTransition: next != null && next !== window.location.pathname });
  };
}

// The screens a visitor most likely opens next, fetched once the page has
// nothing better to do, so the tap that opens one rarely waits for code.
function warm(next, base) {
  const run = () => next.forEach((path) => prefetchRoute(`${path}${base}`, { data: false }));
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}

export async function createAppRouter() {
  const host = await HOSTS[hostKey()]();
  const routes = [{
    path: '/',
    element: <AppRoot />,
    // Drawn for the moment before the first loaders answer (they do not wait
    // on the first load): the page's own ground, so nothing flashes.
    hydrateFallbackElement: <div style={{ minHeight: '100vh' }} />,
    children: host.routes,
  }];
  const router = createBrowserRouter(routes);
  crossFade(router);
  setRouter(router);
  setPrefetchRoutes(routes);
  if (host.next?.length) warm(host.next, window.location.search);
  return router;
}
