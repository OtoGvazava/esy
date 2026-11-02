// The shop's two product lists as their URL states them: the home page's sort
// and search, and a collection's category and filters. The pages and their
// route loaders (router/loaders.js) both read the URL through these, so a
// loader fetches exactly the list its page is about to ask for.

export const HOME_PAGE_SIZE = 12;
export const COLLECTION_PAGE_SIZE = 24;

// The three sorts a list offers (A3), kept in the URL as ?sort= so back and
// forward and a shared link keep it. Newest is the default.
export const SORTS = {
  new: { sortBy: 'id', sortDir: 'desc', key: 'new' },
  'price-asc': { sortBy: 'price', sortDir: 'asc', key: 'priceAsc' },
  'price-desc': { sortBy: 'price', sortDir: 'desc', key: 'priceDesc' },
};

export const sortIdOf = (params) => (SORTS[params.get('sort')] ? params.get('sort') : 'new');

/** The home page's list, as productsInfinite takes it. */
export function homeListArgs(params, q = (params.get('search') || '').trim()) {
  const { sortBy, sortDir } = SORTS[sortIdOf(params)];
  return { size: HOME_PAGE_SIZE, q, sortBy, sortDir };
}

// The query keys a collection owns. Anything else in the URL is left as it is.
const OWN = ['category', 'min', 'max', 'stock', 'o', 'sort'];

const priceParam = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** A collection's filters as the URL states them. */
export function readFilters(params) {
  const opts = {};
  params.getAll('o').forEach((raw) => {
    const at = raw.indexOf(':');
    if (at <= 0) return;
    const axis = raw.slice(0, at).trim();
    const value = raw.slice(at + 1).trim();
    if (!axis || !value) return;
    if (!opts[axis]) opts[axis] = [];
    if (!opts[axis].some((v) => v.toLowerCase() === value.toLowerCase())) opts[axis].push(value);
  });
  return {
    category: (params.get('category') || '').trim(),
    min: priceParam(params.get('min')),
    max: priceParam(params.get('max')),
    stock: params.get('stock') === '1',
    opts,
    sort: sortIdOf(params),
  };
}

/** `prev` with a collection's keys replaced by `f`, in one fixed order. */
export function writeFilters(prev, f) {
  const next = new URLSearchParams(prev);
  OWN.forEach((k) => next.delete(k));
  if (f.category) next.set('category', f.category);
  if (f.min != null) next.set('min', String(f.min));
  if (f.max != null) next.set('max', String(f.max));
  if (f.stock) next.set('stock', '1');
  Object.entries(f.opts).forEach(([axis, values]) => values.forEach((v) => next.append('o', `${axis}:${v}`)));
  if (f.sort && f.sort !== 'new') next.set('sort', f.sort);
  return next;
}

/** A collection's filters as productApi.collection (and its query key) takes them. */
export function collectionArgs(f) {
  return {
    category: f.category, minPrice: f.min, maxPrice: f.max, inStock: f.stock, options: f.opts,
    sortBy: SORTS[f.sort].sortBy, sortDir: SORTS[f.sort].sortDir,
  };
}
