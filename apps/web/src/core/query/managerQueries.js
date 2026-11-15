// The back office's reads (manager.esy.ge), as TanStack Query options beside
// the ones every host shares (queries.js): one key and one fetch per thing,
// so a route loader (router/managerLoaders.js) can fetch it ahead of the
// screen, a hover can prefetch it, and two screens showing the same thing —
// the overview's to-do list and the orders screen — share one request.
//
// Every key is its name, then the store (scope(): the ?tenant= this host
// carries), then what narrows it. A write marks them all stale (client.js),
// so none needs invalidating by hand.
import { queryOptions } from '@tanstack/react-query';
import { contactApi, deliveryApi, productApi, teamApi, tenantApi } from '../../utils/api';
import { productPageQuery, scope } from './queries';

/** The store a request is for; utils/api.js would add it to the URL anyway. */
const tenant = () => scope() || undefined;
const rowsOf = (rows) => (Array.isArray(rows) ? rows : []);

// ---- orders ------------------------------------------------------------------

/** The store's orders, newest first, in the list's shape (a line count, no lines). */
export const storeOrdersQuery = () => queryOptions({
  queryKey: ['orders', scope(), 'store'],
  queryFn: ({ signal }) => tenantApi.orders(tenant(), { signal }).then(rowsOf),
});

/** One of the store's orders, with its lines and the figures its screen shows. */
export const storeOrderQuery = (id) => queryOptions({
  queryKey: ['orders', scope(), 'store', String(id)],
  queryFn: ({ signal }) => tenantApi.order(id, tenant(), { signal }),
});

/** Placed orders nobody has moved yet: the count on the nav's orders entry. */
export const newOrderCountQuery = () => queryOptions({
  queryKey: ['orders', scope(), 'new-count'],
  queryFn: ({ signal }) => tenantApi.newOrderCount(tenant(), { signal })
    .then((n) => Number(n?.count ?? n ?? 0) || 0),
});

/**
 * What the shopper would be told if the order moved to `status` now. Read
 * afresh each time it is asked for and never kept: the server renders it from
 * the admin's live template, and the preview has to be the message that goes.
 */
export const orderNoticeQuery = (id, status) => queryOptions({
  queryKey: ['orders', scope(), 'notice', String(id), status],
  queryFn: ({ signal }) => tenantApi.orderNotice(id, status, tenant(), { signal }),
  staleTime: 0,
  gcTime: 0,
});

// ---- figures -----------------------------------------------------------------

/** Lifetime totals (GET /api/tenant/stats): the overview's cards. */
export const storeStatsQuery = () => queryOptions({
  queryKey: ['stats', scope()],
  queryFn: ({ signal }) => tenantApi.stats(tenant(), { signal }),
});

/** Analytics (X1): a window of `days` (7, 30, 90), or all time with none. */
export const periodStatsQuery = (days) => queryOptions({
  queryKey: ['stats', scope(), 'period', days || 'all'],
  queryFn: ({ signal }) => tenantApi.periodStats(days, tenant(), { signal }),
});

/** Finances (X2): month by month, newest first, with today's commission rate. */
export const monthStatsQuery = () => queryOptions({
  queryKey: ['stats', scope(), 'months'],
  queryFn: ({ signal }) => tenantApi.monthStats(tenant(), { signal }),
});

// ---- products ----------------------------------------------------------------

// Pages of 100. The ceiling is only a guard against a page count gone wrong;
// no store comes near 100 pages.
const STORE_PAGE = 100;
const STORE_PAGES_MAX = 100;

/**
 * The products screen: the WHOLE catalogue, read page by page.
 *
 * Search, the stock filters and both pagers run over this list in the
 * browser, so it has to hold everything. It used to be the first page of 100
 * alone, which left products 101 and up invisible, unsearchable and
 * undeletable in the back office while shoppers could still buy them (review
 * H5). Same shape as one page of productApi.list, with hasMore false.
 */
export const storeProductsQuery = () => queryOptions({
  queryKey: ['products', scope(), 'store-all'],
  queryFn: async ({ signal }) => {
    // Page 0 says how many pages there are; the rest are read in parallel,
    // so a big catalogue costs one round trip after the first, not N.
    const first = await productApi.list({ page: 0, size: STORE_PAGE, signal });
    const pages = Math.min(first.hasMore ? Math.max(first.totalPages, 2) : 1, STORE_PAGES_MAX);
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => productApi.list({ page: i + 1, size: STORE_PAGE, signal })),
    );
    const products = [first, ...rest].flatMap((p) => p.products);
    return {
      products,
      hasMore: false,
      page: 0,
      totalPages: 1,
      totalElements: Math.max(products.length, first.totalElements ?? 0),
    };
  },
});

/** The first page buyers see, which the design tab's preview draws. */
export const previewProductsQuery = () => productPageQuery({ page: 0, size: 12 });

/**
 * A product's variant document for its editor; null for one sold without
 * variants. Unlike the storefront's read (queries.js variantsQuery) a failure
 * stays a failure: an editor that took a document it could not load for "no
 * variants" would offer to start them over.
 */
export const editVariantsQuery = (id) => queryOptions({
  queryKey: ['products', scope(), 'variants', String(id), 'edit'],
  queryFn: ({ signal }) => productApi.getVariants(id, { signal }),
});

// ---- the store's people and settings -------------------------------------------

/** Who runs the store, each with their role. */
export const teamQuery = () => queryOptions({
  queryKey: ['team', scope()],
  queryFn: ({ signal }) => teamApi.list(tenant(), { signal }).then(rowsOf),
});

/** Every contact channel, hidden ones included: the owner's list, not the shopper's. */
export const contactsQuery = () => queryOptions({
  queryKey: ['contacts', scope(), 'all'],
  queryFn: ({ signal }) => contactApi.list(tenant(), { signal }).then(rowsOf),
});

/** Every delivery route, those switched off included: the owner's list. */
export const deliveryQuery = () => queryOptions({
  queryKey: ['delivery', scope(), 'all'],
  queryFn: ({ signal }) => deliveryApi.list(tenant(), { signal }).then(rowsOf),
});

/** The store's design as the server keeps it: { draft, published, … }. */
export const designQuery = () => queryOptions({
  queryKey: ['design', scope()],
  queryFn: ({ signal }) => tenantApi.design(tenant(), { signal }),
});
