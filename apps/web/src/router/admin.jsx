// admin.esy.ge — administration's routes, under its chrome (AdminShell).
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import AdminShell from '../admin/AdminShell';
import AdminStores from '../admin/AdminStores';
import AdminStoreDetail from '../admin/AdminStoreDetail';
import AdminBilling from '../admin/AdminBilling';
import AdminAdmins from '../admin/AdminAdmins';
import SignIn from '../pages/SignIn';
import AuthCallback from '../pages/AuthCallback';
import {
  adminsLoader, billingLoader, configLoader, configScreen, integrationsLoader, integrationsScreen,
  storeLoader, storesLoader,
} from './adminLoaders';

const AdminConfig = lazy(configScreen);
const AdminIntegrations = lazy(integrationsScreen);

// Every screen here keeps its state in the page, not the address, so only a
// move to another path runs a screen's loader again. A query string that
// changes on its own is a change within the page and never waits.
const samePage = ({ currentUrl, nextUrl, defaultShouldRevalidate }) => (
  currentUrl.pathname !== nextUrl.pathname ? defaultShouldRevalidate : false
);

export const adminRoutes = [
  // The OAuth round-trip must reach its own routes before any gate runs, or
  // signing in on this host can never complete.
  { path: 'signin', element: <SignIn /> },
  { path: 'auth/callback', element: <AuthCallback /> },
  {
    element: <AdminShell />,
    children: [
      // The front door and every unknown path (the sign-in callback lands on
      // /account) go on to the store list. Their loader starts its read with
      // the page, so the move finds the list cached instead of waiting on it.
      { index: true, element: <Navigate to="/stores" replace />, loader: storesLoader },
      { path: 'stores', element: <AdminStores />, loader: storesLoader, shouldRevalidate: samePage },
      { path: 'stores/:sub', element: <AdminStoreDetail />, loader: storeLoader, shouldRevalidate: samePage },
      { path: 'billing', element: <AdminBilling />, loader: billingLoader, shouldRevalidate: samePage },
      { path: 'integrations', element: <AdminIntegrations />, loader: integrationsLoader, shouldRevalidate: samePage },
      { path: 'config', element: <AdminConfig />, loader: configLoader, shouldRevalidate: samePage },
      { path: 'admins', element: <AdminAdmins />, loader: adminsLoader, shouldRevalidate: samePage },
      { path: '*', element: <Navigate to="/stores" replace />, loader: storesLoader },
    ],
  },
];
