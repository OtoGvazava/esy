// esy.ge — the platform front door. A route table of its own, apart from the
// storefront's, so the same path renders differently per host; its own chunk
// too (router/index.jsx). The landing page comes with it, every other screen
// is fetched when a link to it is pointed at or pressed.
import PlatformLanding from '../platform/PlatformLanding';
import { accountLoader, directoryLoader } from './platformLoaders';
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
  { path: 'account', lazy: lazyScreen(() => import('../platform/PlatformAccount')), loader: accountLoader },
  // The account's two settings rows (L4): the one identity's details, and the
  // display settings every store shares.
  { path: 'account/personal', lazy: lazyScreen(() => import('../platform/PlatformPersonal')) },
  { path: 'settings/display', lazy: lazyScreen(() => import('../pages/DisplaySettings')) },
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
