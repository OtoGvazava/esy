// The app's router: react-router's data router, with one route table per host
// under the shared root (App.jsx's AppRoot).
//
// The data router is what lets a navigation keep the old screen until the new
// one is ready (route loaders fill the query cache first, prime.js), report
// that it is waiting (useNavigation, behind NavProgress), restore the scroll
// position on back and forward, and cross-fade from one page to the next.
import { createBrowserRouter } from 'react-router-dom';
import AppRoot from '../App';
import { isAdminHost, isManagerHost, isPlatformHost } from '../hooks/usePlatformHost';
import { motionAllowed } from '../core/motion';
import { setPrefetchRoutes, setRouter } from './prime';
import { storeRoutes } from './store';
import { platformRoutes } from './platform';
import { managerRoutes } from './manager';
import { adminRoutes } from './admin';

// esy.ge → the platform front door; manager.esy.ge → the back office;
// admin.esy.ge → administration; <sub>.esy.ge → a storefront.
function hostRoutes() {
  if (isAdminHost()) return adminRoutes;
  if (isManagerHost()) return managerRoutes;
  return isPlatformHost() ? platformRoutes : storeRoutes;
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

export function createAppRouter() {
  const routes = [{
    path: '/',
    element: <AppRoot />,
    // Drawn for the moment before the first loaders answer (they do not wait
    // on the first load): the page's own ground, so nothing flashes.
    hydrateFallbackElement: <div style={{ minHeight: '100vh' }} />,
    children: hostRoutes(),
  }];
  const router = createBrowserRouter(routes);
  crossFade(router);
  setRouter(router);
  setPrefetchRoutes(routes);
  return router;
}
