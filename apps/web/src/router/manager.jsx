// manager.esy.ge — the back office's routes. The OAuth round trip comes back
// outside the chrome; every other path is drawn inside it (ManagerShell), which
// first decides whether a store's screens may be shown at all.
import ManagerShell, { ToStoreStart } from '../manager/ManagerShell';
import { ManagerCallback } from '../manager/ManagerHome';
import ManagerOverview from '../manager/ManagerOverview';
import ManagerProducts from '../manager/ManagerProducts';
import ManagerOrders from '../manager/ManagerOrders';
import ManagerOrderDetail from '../manager/ManagerOrderDetail';
import ManagerStats from '../manager/ManagerStats';
import ManagerMoney from '../manager/ManagerMoney';
import ManagerTeam from '../manager/ManagerTeam';
import ManagerSettings from '../manager/ManagerSettings';
import {
  moneyLoader, orderLoader, ordersLoader, overviewLoader, productsLoader, settingsLoader, statsLoader,
  teamLoader,
} from './managerLoaders';

// A change of the search alone (Analytics' ?days=, the products import's
// ?import=) is a change within the page: the screen's own reads follow it,
// and the navigation never waits on its loader again.
const samePage = ({ currentUrl, nextUrl, defaultShouldRevalidate }) => (
  currentUrl.pathname === nextUrl.pathname ? false : defaultShouldRevalidate
);

const screen = (route) => ({ shouldRevalidate: samePage, ...route });

export const managerRoutes = [
  // Google sends the sign-in back here, before any of the shell's gates.
  { path: 'auth/callback', element: <ManagerCallback /> },
  {
    element: <ManagerShell />,
    children: [
      screen({ index: true, element: <ManagerOverview />, loader: overviewLoader }),
      screen({ path: 'products', element: <ManagerProducts />, loader: productsLoader }),
      screen({ path: 'orders', element: <ManagerOrders />, loader: ordersLoader }),
      screen({ path: 'orders/:orderId', element: <ManagerOrderDetail />, loader: orderLoader }),
      screen({ path: 'stats', element: <ManagerStats />, loader: statsLoader }),
      screen({ path: 'money', element: <ManagerMoney />, loader: moneyLoader }),
      screen({ path: 'team', element: <ManagerTeam />, loader: teamLoader }),
      // Its six tabs are its own routes (ManagerSettings); the loader reads
      // the tab from the path.
      screen({ path: 'settings/*', element: <ManagerSettings />, loader: settingsLoader }),
      // Signed in already: the old sign-in path leads to the store's first screen.
      { path: 'signin', element: <ToStoreStart /> },
      { path: '*', element: <ToStoreStart /> },
    ],
  },
];
