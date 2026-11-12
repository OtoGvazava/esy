// The account's routes, the same in every app (account/): /account and its
// sections, under the app's own frame. Each host's table mounts this with the
// frame that app draws around them, so the four can never list different
// sections.
import { accountQuery, addressesQuery } from '../core/query/queries';
import { ensure, lazyScreen, prime } from './prime';

// Signed out, the account answers 401 at once and the body asks to sign in.
export const accountLoader = prime(({ qc }) => ensure(qc, accountQuery()));
export const addressesLoader = prime(({ qc }) => ensure(qc, addressesQuery()));

/**
 * `/account` with its sections, under `frame` (a route's `lazy`). `extra` is
 * merged into each route. Orders from every store and the stores you run are
 * esy.ge's alone (`esy`): the other apps link there in a new tab instead. A
 * store (`store`) has orders of its own: those placed at that store.
 */
export function accountRoute(frame, extra = {}, { esy = false, store = false } = {}) {
  const section = (route) => ({ ...extra, ...route });
  return {
    ...extra,
    path: 'account',
    lazy: frame,
    loader: accountLoader,
    children: [
      section({ index: true, lazy: lazyScreen(() => import('../account/AccountHome')) }),
      esy && section({ path: 'orders', lazy: lazyScreen(() => import('../account/AccountOrders')) }),
      store && section({ path: 'orders', lazy: lazyScreen(() => import('../account/HereOrders')) }),
      section({ path: 'addresses', lazy: lazyScreen(() => import('../account/AccountAddresses')), loader: addressesLoader }),
      esy && section({ path: 'stores', lazy: lazyScreen(() => import('../account/AccountStores')) }),
      section({ path: 'personal', lazy: lazyScreen(() => import('../account/AccountPersonal')) }),
      section({ path: 'display', lazy: lazyScreen(() => import('../account/AccountDisplay')) }),
    ].filter(Boolean),
  };
}
