// esy.ge — the platform front door. A route table of its own, apart from the
// storefront's, so the same path renders differently per host; its own chunk
// too (router/index.jsx). The landing page comes with it, every other screen
// is fetched when a link to it is pointed at or pressed.
import { Navigate } from 'react-router-dom';
import PlatformLanding from '../platform/PlatformLanding';
import { directoryLoader } from './platformLoaders';
import { accountRoute } from './accountRoutes';
import { lazyScreen } from './prime';

const directory = lazyScreen(() => import('../platform/PlatformDirectory'));
// The legal pages are one screen with a kind.
const legal = (kind) => lazyScreen(() => import('../platform/PlatformLegal').then((m) => {
  const Legal = m.default;
  return { default: () => <Legal kind={kind} /> };
}));

export const routes = [
  { index: true, element: <PlatformLanding />, loader: directoryLoader },
  { path: 'stores', lazy: directory, loader: directoryLoader },
  { path: 'stores/:subdomain', lazy: directory, loader: directoryLoader },
  { path: 'sell', lazy: lazyScreen(() => import('../platform/PlatformRegistration')) },
  { path: 'create-store', lazy: lazyScreen(() => import('../platform/PlatformRegistration')) },
  // The esy account (U2–U7), in esy.ge's own frame. Every app mounts the same
  // sections (accountRoutes.jsx).
  accountRoute(lazyScreen(() => import('../platform/account/AccountLayout')), {}, { esy: true }),
  // Language and display became an account section; old links land there.
  { path: 'settings/display', element: <Navigate to="/account/display" replace /> },
  { path: 'signin', lazy: lazyScreen(() => import('../platform/PlatformAuth')) },
  // The footer has always linked to these; until now every one 404'd.
  { path: 'help', lazy: lazyScreen(() => import('../platform/PlatformHelp')) },
  { path: 'terms', lazy: legal('terms') },
  { path: 'privacy', lazy: legal('privacy') },
  { path: 'returns', lazy: legal('returns') },
  { path: 'seller-terms', lazy: legal('seller') },
  { path: 'auth/callback', lazy: lazyScreen(() => import('../pages/AuthCallback')) },
  { path: '*', lazy: lazyScreen(() => import('../platform/PlatformNotFound')) },
];

/** Where a visitor goes next from the front door, warmed once the page is idle. */
export const next = ['/stores', '/sell', '/signin'];
