// Shared reads for the store's own figures, from the query cache
// (core/query/managerQueries.js). Their own module because Overview,
// Analytics and Finances read them, and a hook exported from a component file
// breaks fast refresh.
import { useQuery } from '@tanstack/react-query';
import { monthStatsQuery, periodStatsQuery, storeStatsQuery } from '../core/query/managerQueries';

/** The windows Analytics offers: 7, 30 or 90 days, or all time (null). */
export const PERIODS = [7, 30, 90, null];

/**
 * The window the address asks for (?days=7|30|90|all), so a reload or a
 * shared link keeps it; 30 days when none is given, as the board opens. The
 * screen and its route loader read it the same way.
 */
export function periodOf(params) {
  const asked = params.get('days');
  if (asked === 'all') return null;
  return PERIODS.includes(Number(asked)) ? Number(asked) : 30;
}

/**
 * A read as the screens take it: `data` null until it is in, and null again
 * after a failure. Cleared rather than kept: a figure that may be out of date
 * reads as current, and these are the numbers a merchant decides on.
 */
function figures(query) {
  return {
    data: query.isError ? null : query.data ?? null,
    loading: query.isPending,
    error: query.isError ? query.error : '',
  };
}

/** Lifetime totals (GET /api/tenant/stats): the overview's cards. */
export function useStoreStats() {
  const query = useQuery(storeStatsQuery());
  return { ...figures(query), reload: query.refetch };
}

/**
 * Analytics (X1): a window of `days` (7, 30, 90) or all time (null). Each
 * window is its own read: a window not read before shows nothing until its
 * figures arrive, rather than the last window's under the new label.
 */
export function usePeriodStats(days) {
  return figures(useQuery(periodStatsQuery(days)));
}

/** Finances (X2): month by month, newest first. */
export function useMonthStats() {
  return figures(useQuery(monthStatsQuery()));
}
