// Every read the screens share, as TanStack Query options: one key and one
// fetch per thing, so a route loader can fetch it ahead of the screen
// (router/prime.js), a hover can prefetch it, and two components asking for
// the same thing share one request and one copy.
//
// Keys start with the store the read is scoped to. On a storefront that is
// the Host's and never changes within a page; the back office (and bare
// localhost) carry it as ?tenant=, which utils/api.js appends to the request,
// so the key carries it too and two stores can never share an entry.
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import {
  accountApi, addressApi, contactApi, deliveryApi, orderApi, productApi, tenantApi,
} from '../../utils/api';

const devTenant = () => {
  try { return new URLSearchParams(window.location.search).get('tenant') || undefined; } catch { return undefined; }
};

/** The store a read is scoped to, for its key: '' where the Host decides it. */
export const scope = () => devTenant() || '';

// ---- the store itself ------------------------------------------------------

export const tenantQuery = () => queryOptions({
  queryKey: ['tenant', scope()],
  queryFn: ({ signal }) => tenantApi.current(devTenant(), { signal }),
  staleTime: 5 * 60_000,
});

/** The store's categories, most products first: [{ name, count }]. */
export const categoriesQuery = () => queryOptions({
  queryKey: ['categories', scope()],
  queryFn: ({ signal }) => productApi.categories({ signal })
    .then((rows) => (Array.isArray(rows) ? rows.filter((r) => r && r.name) : [])),
  staleTime: 60_000,
});

/** The channels a shopper may reach the store on (never a hidden one). */
export const publicContactsQuery = () => queryOptions({
  queryKey: ['contacts', 'public', scope()],
  queryFn: ({ signal }) => contactApi.listPublic(devTenant(), { signal })
    .then((rows) => (Array.isArray(rows) ? rows : [])),
  staleTime: 60_000,
});

/** The enabled delivery routes and whether checkout asks for an address. */
export const publicDeliveryQuery = () => queryOptions({
  queryKey: ['delivery', 'public', scope()],
  queryFn: ({ signal }) => deliveryApi.listPublic(devTenant(), { signal }),
  staleTime: 60_000,
});

// ---- products --------------------------------------------------------------

/** One page of the store's products: { products, hasMore, totalElements, … }. */
export const productPageQuery = ({ page = 0, size = 20, q = '', sortBy, sortDir } = {}) => queryOptions({
  queryKey: ['products', scope(), 'page', { page, size, q, sortBy, sortDir }],
  queryFn: ({ signal }) => productApi.list({ page, size, q, sortBy, sortDir, signal }),
});

/** The home page's endless grid, page by page. */
export const productsInfinite = ({ size, q = '', sortBy, sortDir }) => infiniteQueryOptions({
  queryKey: ['products', scope(), 'list', { size, q, sortBy, sortDir }],
  queryFn: ({ pageParam, signal }) => productApi.list({ page: pageParam, size, q, sortBy, sortDir, signal }),
  initialPageParam: 0,
  getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
});

/** A collection page (A3): one category under its filters, page by page. */
export const collectionInfinite = (filters, size) => infiniteQueryOptions({
  queryKey: ['products', scope(), 'collection', { ...filters, size }],
  queryFn: ({ pageParam, signal }) => productApi.collection({ ...filters, page: pageParam, size, signal }),
  initialPageParam: 0,
  getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
});

/** The variant axes a category's products offer: [{ name, values }]. */
export const facetsQuery = (category) => queryOptions({
  queryKey: ['products', scope(), 'facets', category],
  queryFn: ({ signal }) => productApi.optionFacets(category, { signal })
    .then((rows) => (Array.isArray(rows) ? rows.filter((r) => r?.name && r.values?.length) : [])),
  staleTime: 60_000,
});

/** A category's cheapest and dearest price, for the price slider; null when empty. */
export const priceBoundsQuery = (category) => queryOptions({
  queryKey: ['products', scope(), 'bounds', category],
  queryFn: async ({ signal }) => {
    const edge = (sortDir) => productApi
      .collection({ category, size: 1, sortBy: 'price', sortDir, signal })
      .then((r) => r.products[0]?.price);
    const [lo, hi] = await Promise.all([edge('asc'), edge('desc')]);
    return lo != null && hi != null ? { lo: Number(lo), hi: Number(hi) } : null;
  },
  staleTime: 60_000,
});

export const productQuery = (id) => queryOptions({
  queryKey: ['products', scope(), 'one', String(id)],
  queryFn: ({ signal }) => productApi.get(id, { signal }),
});

/** A product's variant document, or null for one that is sold without variants. */
export const variantsQuery = (id) => queryOptions({
  queryKey: ['products', scope(), 'variants', String(id)],
  queryFn: ({ signal }) => productApi.getVariants(id, { signal }).catch((e) => {
    if (e?.name === 'AbortError') throw e;
    return null;
  }),
});

// ---- the shopper -----------------------------------------------------------

/** The signed-in shopper's orders (raw rows; OrdersContext normalises them). */
export const myOrdersQuery = () => queryOptions({
  queryKey: ['orders', scope(), 'mine'],
  queryFn: () => orderApi.list().then((rows) => (Array.isArray(rows) ? rows : [])),
});

/** One of the shopper's orders, with its lines. */
export const myOrderQuery = (orderNumber) => queryOptions({
  queryKey: ['orders', scope(), 'one', String(orderNumber)],
  queryFn: () => orderApi.get(orderNumber),
});

export const accountQuery = () => queryOptions({
  queryKey: ['account'],
  queryFn: () => accountApi.get(),
});

/** The public store directory (active stores), on the platform. */
export const directoryQuery = () => queryOptions({
  queryKey: ['directory'],
  queryFn: () => tenantApi.list().then((rows) => (Array.isArray(rows) ? rows : [])),
  staleTime: 60_000,
});

export const addressesQuery = () => queryOptions({
  queryKey: ['addresses'],
  queryFn: () => addressApi.list().then((rows) => (Array.isArray(rows) ? rows : [])),
});
