// What each storefront screen needs before it is shown (see prime.js). The
// promise a loader returns is what the screen cannot be drawn without; what
// it only starts is fetched behind the screen.
import { ensure, ensureInfinite, prime } from './prime';
import {
  addressesQuery, categoriesQuery, collectionInfinite, facetsQuery, myOrderQuery, myOrdersQuery,
  priceBoundsQuery, productPageQuery, productQuery, productsInfinite, publicContactsQuery,
  publicDeliveryQuery, tenantQuery, variantsQuery,
} from '../core/query/queries';
import { normalizeDesign } from '../core/design/normalize';
import { bannerShown } from '../core/design/show';
import { COLLECTION_PAGE_SIZE, collectionArgs, homeListArgs, readFilters } from '../pages/shopQuery';

/** Started, not waited for. */
const behind = (promise) => { promise.catch(() => {}); };

// The product the store's banner shows, when it shows one: its photo is part
// of the home page's first screen.
function bannerProduct(qc) {
  const design = normalizeDesign(qc.getQueryData(tenantQuery().queryKey)?.design);
  const id = bannerShown(design) ? design.banner?.productId : null;
  return id ? ensure(qc, productQuery(id)) : null;
}

// The home page, or a collection (/?category=…): the list as the URL states
// it, the category pills and, for a collection, its filter column.
export const homeLoader = prime(({ url, qc }) => {
  const params = url.searchParams;
  const categories = ensure(qc, categoriesQuery());
  if (params.get('category')) {
    const f = readFilters(params);
    return Promise.all([
      categories,
      ensureInfinite(qc, collectionInfinite(collectionArgs(f), COLLECTION_PAGE_SIZE)),
      ensure(qc, facetsQuery(f.category)),
      ensure(qc, priceBoundsQuery(f.category)),
    ]);
  }
  return Promise.all([
    categories,
    ensureInfinite(qc, productsInfinite(homeListArgs(params))),
    params.get('search') ? null : bannerProduct(qc),
  ]);
});

// A product: the product and its variants decide the page's shape; the
// "you may also like" row sits at the end of it.
export const productLoader = prime(({ params, qc }) => {
  behind(ensure(qc, productPageQuery({ page: 0, size: 6 })));
  return Promise.all([ensure(qc, productQuery(params.id)), ensure(qc, variantsQuery(params.id))]);
});

export const aboutLoader = prime(({ qc }) => Promise.all([
  ensure(qc, publicDeliveryQuery()),
  ensure(qc, productPageQuery({ page: 0, size: 1 })),
  ensure(qc, publicContactsQuery()),
]));

// A guest has no address book: that read answers 401 at once and the screen
// carries on without it.
export const checkoutLoader = prime(({ qc }) => Promise.all([
  ensure(qc, publicDeliveryQuery()),
  ensure(qc, addressesQuery()),
]));

export const ordersLoader = prime(({ qc }) => ensure(qc, myOrdersQuery()));

// The account board: the orders decide its shape (its figures, the recent
// ones); the address book only fills in a count at the end of its row.
export const accountLoader = prime(({ qc }) => {
  behind(ensure(qc, addressesQuery()));
  return ensure(qc, myOrdersQuery());
});

export const orderLoader = prime(({ params, qc }) => Promise.all([
  ensure(qc, myOrderQuery(params.orderNumber)),
  ensure(qc, publicDeliveryQuery()),
]));
