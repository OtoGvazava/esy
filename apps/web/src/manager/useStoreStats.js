// Shared loaders for the store's own figures. Their own module because
// Overview, Analytics and Finances read them, and a hook exported from a
// component file breaks fast refresh.
import { useCallback, useEffect, useState } from 'react';
import { tenantApi } from '../utils/api';

/** Lifetime totals (GET /api/tenant/stats): the overview's cards. */
export function useStoreStats(devTenant) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await tenantApi.stats(devTenant));
    } catch (e) {
      // Cleared rather than kept: a figure that may be out of date reads as
      // current, and these are the numbers a merchant decides on.
      setData(null);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [devTenant]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

/**
 * One request's answer, kept per key: a new key (another window, another
 * store) clears the old figures at once rather than showing them under the
 * new label while the request is out.
 */
function useFetched(key, fetcher) {
  const [state, setState] = useState({ key: null, data: null, error: '' });
  useEffect(() => {
    const ac = new AbortController();
    fetcher({ signal: ac.signal })
      .then((data) => { if (!ac.signal.aborted) setState({ key, data, error: '' }); })
      .catch((e) => { if (!ac.signal.aborted && e?.name !== 'AbortError') setState({ key, data: null, error: e }); });
    return () => ac.abort();
    // fetcher is rebuilt every render; the key is what names the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = state.key === key;
  return { data: current ? state.data : null, error: current ? state.error : '', loading: !current };
}

/** Analytics (X1): a window of `days` (7, 30, 90) or all time (null). */
export function usePeriodStats(days, devTenant) {
  return useFetched(`${devTenant || ''}|${days || 'all'}`, (opts) => tenantApi.periodStats(days, devTenant, opts));
}

/** Finances (X2): month by month, newest first. */
export function useMonthStats(devTenant) {
  return useFetched(devTenant || '', (opts) => tenantApi.monthStats(devTenant, opts));
}
