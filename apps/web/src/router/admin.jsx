// admin.esy.ge — administration's routes, under its chrome (AdminShell).
//
// The table is its own chunk (router/index.jsx). The shell and the store list
// come with it; every other screen is a chunk of its own, fetched with its
// data when its entry is pointed at or pressed (prime.js).
import { Navigate } from 'react-router-dom';
import AdminShell from '../admin/AdminShell';
import AdminStores from '../admin/AdminStores';
import {
  adminsLoader, billingLoader, configLoader, configScreen, integrationsLoader, integrationsScreen,
  storeLoader, storesLoader,
} from './adminLoaders';
import { lazyScreen } from './prime';

// Every screen here keeps its state in the page, not the address, so only a
// move to another path runs a screen's loader again. A query string that
// changes on its own is a change within the page and never waits.
const samePage = ({ currentUrl, nextUrl, defaultShouldRevalidate }) => (
  currentUrl.pathname !== nextUrl.pathname ? defaultShouldRevalidate : false
);

export const routes = [
  // The OAuth round-trip must reach its own routes before any gate runs, or
  // signing in on this host can never complete.
  { path: 'signin', lazy: lazyScreen(() => import('../pages/SignIn')) },
  { path: 'auth/callback', lazy: lazyScreen(() => import('../pages/AuthCallback')) },
  {
    element: <AdminShell />,
    children: [
      // The front door and every unknown path (the sign-in callback lands on
      // /account) go on to the store list. Their loader starts its read with
      // the page, so the move finds the list cached instead of waiting on it.
      { index: true, element: <Navigate to="/stores" replace />, loader: storesLoader },
      { path: 'stores', element: <AdminStores />, loader: storesLoader, shouldRevalidate: samePage },
      { path: 'stores/:sub', lazy: lazyScreen(() => import('../admin/AdminStoreDetail')), loader: storeLoader, shouldRevalidate: samePage },
      { path: 'billing', lazy: lazyScreen(() => import('../admin/AdminBilling')), loader: billingLoader, shouldRevalidate: samePage },
      { path: 'integrations', lazy: lazyScreen(integrationsScreen), loader: integrationsLoader, shouldRevalidate: samePage },
      { path: 'config', lazy: lazyScreen(configScreen), loader: configLoader, shouldRevalidate: samePage },
      { path: 'admins', lazy: lazyScreen(() => import('../admin/AdminAdmins')), loader: adminsLoader, shouldRevalidate: samePage },
      { path: '*', element: <Navigate to="/stores" replace />, loader: storesLoader },
    ],
  },
];

/** Where an administrator goes next from the store list, warmed once the page is idle. */
export const next = ['/billing', '/admins'];
