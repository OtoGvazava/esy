// manager.esy.ge — the back office's routes. The OAuth round trip comes back
// outside the chrome; every other path is drawn inside it (ManagerShell), which
// first decides whether a store's screens may be shown at all.
//
// The table is its own chunk (router/index.jsx). The shell, the store picker
// and the overview come with it; every other screen is a chunk of its own,
// fetched with its data when its entry is pointed at or pressed (prime.js).
import ManagerShell, { ToStoreStart } from '../manager/ManagerShell';
import { ManagerCallback } from '../manager/ManagerHome';
import ManagerOverview from '../manager/ManagerOverview';
import {
  moneyLoader, orderLoader, ordersLoader, overviewLoader, productsLoader, settingsLoader, statsLoader,
  teamLoader,
} from './managerLoaders';
import { lazyScreen } from './prime';

// A change of the search alone (Analytics' ?days=, the products import's
// ?import=) is a change within the page: the screen's own reads follow it,
// and the navigation never waits on its loader again.
const samePage = ({ currentUrl, nextUrl, defaultShouldRevalidate }) => (
  currentUrl.pathname === nextUrl.pathname ? false : defaultShouldRevalidate
);

const screen = (route) => ({ shouldRevalidate: samePage, ...route });

export const routes = [
  // Google sends the sign-in back here, before any of the shell's gates.
  { path: 'auth/callback', element: <ManagerCallback /> },
  {
    element: <ManagerShell />,
    children: [
      screen({ index: true, element: <ManagerOverview />, loader: overviewLoader }),
      screen({ path: 'products', lazy: lazyScreen(() => import('../manager/ManagerProducts')), loader: productsLoader }),
      screen({ path: 'orders', lazy: lazyScreen(() => import('../manager/ManagerOrders')), loader: ordersLoader }),
      screen({ path: 'orders/:orderId', lazy: lazyScreen(() => import('../manager/ManagerOrderDetail')), loader: orderLoader }),
      screen({ path: 'stats', lazy: lazyScreen(() => import('../manager/ManagerStats')), loader: statsLoader }),
      screen({ path: 'money', lazy: lazyScreen(() => import('../manager/ManagerMoney')), loader: moneyLoader }),
      screen({ path: 'team', lazy: lazyScreen(() => import('../manager/ManagerTeam')), loader: teamLoader }),
      // Its six tabs are its own routes (ManagerSettings); the loader reads
      // the tab from the path.
      screen({ path: 'settings/*', lazy: lazyScreen(() => import('../manager/ManagerSettings')), loader: settingsLoader }),
      // Signed in already: the old sign-in path leads to the store's first screen.
      { path: 'signin', element: <ToStoreStart /> },
      { path: '*', element: <ToStoreStart /> },
    ],
  },
];

/** Where a merchant goes next from the overview, warmed once the page is idle. */
export const next = ['/orders', '/products'];
