// esy.ge — the platform front door. A route table of its own, apart from the
// storefront's, so the same path renders differently per host; its own chunk
// too (router/index.jsx). The landing page comes with it, every other screen
// is fetched when a link to it is pointed at or pressed.
import PlatformLanding from '../platform/PlatformLanding';
import { accountLoader, addressesLoader, directoryLoader } from './platformLoaders';
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
  // The esy account (U2–U6): one frame, a section per route. The frame reads
  // the account, so a section opens on what the frame already has.
  {
    path: 'account',
    lazy: lazyScreen(() => import('../platform/account/AccountLayout')),
    loader: accountLoader,
    children: [
      { index: true, lazy: lazyScreen(() => import('../platform/account/AccountHome')) },
      { path: 'orders', lazy: lazyScreen(() => import('../platform/account/AccountOrders')) },
      { path: 'addresses', lazy: lazyScreen(() => import('../platform/account/AccountAddresses')), loader: addressesLoader },
      { path: 'stores', lazy: lazyScreen(() => import('../platform/account/AccountStores')) },
      { path: 'personal', lazy: lazyScreen(() => import('../platform/account/AccountPersonal')) },
    ],
  },
  // The display settings every store shares; the account's row leads here.
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
