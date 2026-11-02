import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesQuery } from '../core/query/queries';

const NONE = [];

/**
 * The current store's categories, most products first: [{ name, count }].
 *
 * Empty until they arrive, and empty when the read fails: every caller draws
 * nothing for "no categories", which is also the right thing to draw when they
 * could not be read. One cached read shared by every caller (the home page,
 * a collection, the product editor), so moving between them never asks again.
 * `refresh` re-reads them whenever it changes — the product editor passes its
 * open state, so a category typed in one save is offered in the next.
 */
export function useStoreCategories(refresh) {
  const { data, isFetched, refetch } = useQuery(categoriesQuery());
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    refetch();
  }, [refresh, refetch]);

  return { categories: data || NONE, loaded: isFetched };
}

export default useStoreCategories;
