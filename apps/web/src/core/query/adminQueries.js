// Administration's reads (admin.esy.ge), as TanStack Query options: one key
// and one fetch per thing, shared by the route loaders (router/adminLoaders.js),
// the hover prefetch and the screens themselves.
//
// Keys start with 'admin' and carry no store scope: administration is
// cross-store and names its target in the path, never by ?tenant (utils/api.js
// leaves this host alone), so the same read means the same thing everywhere.
import { queryOptions } from '@tanstack/react-query';
import { adminApi } from '../../utils/api';

const rows = (data) => (Array.isArray(data) ? data : []);

/** 'YYYY-MM' for the month `back` months before this one, on this browser's clock. */
export function billingMonth(back = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** What every cached store list's key starts with: one list per search. */
export const adminStoreLists = ['admin', 'stores', 'list'];

/** Every store on the platform, or the ones `q` matches (name, subdomain, owner email). */
export const adminStoresQuery = (q = '') => queryOptions({
  queryKey: [...adminStoreLists, q],
  queryFn: ({ signal }) => adminApi.listStores(q, { signal }).then(rows),
});

/** One store's record: the list's fields, its members and its last orders. */
export const adminStoreQuery = (sub) => queryOptions({
  queryKey: ['admin', 'stores', 'one', String(sub)],
  queryFn: ({ signal }) => adminApi.getStore(sub, { signal }),
});

/** One month's sales and commission per store; `month` is 'YYYY-MM'. */
export const adminBillingQuery = (month = billingMonth(0)) => queryOptions({
  queryKey: ['admin', 'billing', month],
  queryFn: ({ signal }) => adminApi.getBilling({ month, signal }),
});

/** Who can open this host: ADMIN_EMAILS, and any older grant made from the screen. */
export const adminAdminsQuery = () => queryOptions({
  queryKey: ['admin', 'admins'],
  queryFn: ({ signal }) => adminApi.listAdmins({ signal }).then(rows),
});

/** The audit log, newest first. No screen draws it yet. */
export const adminAuditQuery = (limit = 50) => queryOptions({
  queryKey: ['admin', 'audit', limit],
  queryFn: ({ signal }) => adminApi.listAudit(limit, { signal }).then(rows),
});

// The two live-config reads take no signal (utils/api.js does not pass one),
// so a fetch that is no longer wanted runs to its end and is dropped.

/** The live platform configuration, where each value comes from, and the reserved names. */
export const adminConfigQuery = () => queryOptions({
  queryKey: ['admin', 'config'],
  queryFn: ({ signal }) => adminApi.getConfig({ signal }),
});

/** SMS and email: the switches, the senders, whether a key is set, every message. */
export const adminIntegrationsQuery = () => queryOptions({
  queryKey: ['admin', 'integrations'],
  queryFn: ({ signal }) => adminApi.getIntegrations({ signal }),
});
