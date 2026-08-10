// Shared loader for the store's own figures. Its own module because Stats and
// Money both read it, and a hook exported from a component file breaks fast
// refresh.
import { useCallback, useEffect, useState } from 'react';
import { tenantApi } from '../utils/api';

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
