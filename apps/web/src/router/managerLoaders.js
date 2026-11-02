// What each back-office screen needs before it is shown (see prime.js). The
// promise a loader returns is what the screen cannot be drawn without; what
// it only starts is fetched behind the screen.
//
// With no store chosen (no ?tenant=) ManagerShell draws the front door
// whatever the path, so a store's reads are not started for it.
import { ensure, prime } from './prime';
import { accountQuery, publicDeliveryQuery, tenantQuery } from '../core/query/queries';
import {
  contactsQuery, deliveryQuery, designQuery, monthStatsQuery, periodStatsQuery, previewProductsQuery,
  storeOrderQuery, storeOrdersQuery, storeProductsQuery, storeStatsQuery, teamQuery,
} from '../core/query/managerQueries';
import { periodOf } from '../manager/useStoreStats';

const inStore = (url) => !!url.searchParams.get('tenant');

/** A store's screen: its reads, or nothing on the front door. */
const storeLoader = (load) => prime((args) => (inStore(args.url) ? load(args) : undefined));

// The overview: its four figures and the orders its to-do list is made of. A
// live store with no order yet opens on its checklist instead (FirstVisit),
// which also reads the delivery shoppers are offered. With no store chosen
// this is the front door, which lists the stores the account runs.
export const overviewLoader = prime(({ url, qc }) => {
  if (!inStore(url)) return ensure(qc, accountQuery());
  const figures = ensure(qc, storeStatsQuery())
    .then((s) => (Number(s?.orders) === 0 ? ensure(qc, publicDeliveryQuery()) : null));
  return Promise.all([figures, ensure(qc, storeOrdersQuery())]);
});

export const productsLoader = storeLoader(({ qc }) => ensure(qc, storeProductsQuery()));

export const ordersLoader = storeLoader(({ qc }) => ensure(qc, storeOrdersQuery()));

export const orderLoader = storeLoader(({ params, qc }) => ensure(qc, storeOrderQuery(params.orderId)));

export const statsLoader = storeLoader(({ url, qc }) => ensure(qc, periodStatsQuery(periodOf(url.searchParams))));

export const moneyLoader = storeLoader(({ qc }) => ensure(qc, monthStatsQuery()));

export const teamLoader = storeLoader(({ qc }) => ensure(qc, teamQuery()));

// Settings: the store itself under every tab (the form tabs edit it), and the
// tab's own reads. Card payments show the latest card payment once the bank
// is connected, which only the store can say.
export const settingsLoader = storeLoader(({ url, qc }) => {
  const store = ensure(qc, tenantQuery());
  switch (url.pathname.split('/')[2] || 'shop') {
    case 'design':
      return Promise.all([store, ensure(qc, designQuery()), ensure(qc, previewProductsQuery())]);
    case 'delivery':
      return Promise.all([store, ensure(qc, deliveryQuery())]);
    case 'contact':
      return ensure(qc, contactsQuery());
    case 'integrations':
      return store.then((tn) => (tn?.bogConfigured ? ensure(qc, storeOrdersQuery()) : null));
    default:
      return store;
  }
});
