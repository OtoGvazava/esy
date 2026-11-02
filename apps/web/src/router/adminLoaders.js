// What each admin screen needs before it is shown (see prime.js). The promise
// a loader returns is what the screen cannot be drawn without.
//
// The first load starts its read before the shell's gate knows who is signed
// in. When the visitor is not an administrator the read is refused (signed
// out, the server redirects it to its sign-in page, which utils/api.js reads
// as a 401), the failure sits in the cache unused, and the gate is drawn as
// before.
import { ensure, prime } from './prime';
import {
  adminAdminsQuery, adminBillingQuery, adminConfigQuery, adminIntegrationsQuery, adminStoreQuery,
  adminStoresQuery, billingMonth,
} from '../core/query/adminQueries';

// Two of the screens kept out of the first download (router/admin.jsx loads
// them as lazy routes). Their loaders fetch the code with the data, so a link
// pointed at brings both, and the old screen stays up until both are here.
export const configScreen = () => import('../admin/AdminConfig');
export const integrationsScreen = () => import('../admin/AdminIntegrations');

// The list as it opens: no search typed yet.
export const storesLoader = prime(({ qc }) => ensure(qc, adminStoresQuery('')));

export const storeLoader = prime(({ params, qc }) => ensure(qc, adminStoreQuery(params.sub)));

// Billing opens on this month (AdminBilling's first choice).
export const billingLoader = prime(({ qc }) => ensure(qc, adminBillingQuery(billingMonth(0))));

export const adminsLoader = prime(({ qc }) => ensure(qc, adminAdminsQuery()));

export const configLoader = prime(({ qc }) => Promise.all([ensure(qc, adminConfigQuery()), configScreen()]));

export const integrationsLoader = prime(({ qc }) => Promise.all([
  ensure(qc, adminIntegrationsQuery()),
  integrationsScreen(),
]));
