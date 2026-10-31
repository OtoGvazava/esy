import { useEffect, useState } from 'react';
import { productApi } from '../utils/api';

/**
 * The current store's categories, most products first: [{ name, count }].
 *
 * Empty until they arrive, and empty when the read fails: every caller draws
 * nothing for "no categories", which is also the right thing to draw when they
 * could not be read. `refresh` re-reads them whenever it changes — the product
 * editor passes its open state, so a category typed in one save is offered in
 * the next.
 */
export function useStoreCategories(refresh) {
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    productApi.categories({ signal: ac.signal })
      .then((rows) => {
        if (ac.signal.aborted) return;
        setCategories(Array.isArray(rows) ? rows.filter((r) => r && r.name) : []);
      })
      .catch(() => {})
      .finally(() => { if (!ac.signal.aborted) setLoaded(true); });
    return () => ac.abort();
  }, [refresh]);

  return { categories, loaded };
}

export default useStoreCategories;
