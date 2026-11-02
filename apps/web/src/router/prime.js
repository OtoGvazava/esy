// Route loaders that fill the query cache before a screen is shown, and the
// prefetch that runs the same fetches when a link is pointed at.
//
// A navigation keeps the old screen on display until the new one's data is in
// the cache, with the progress bar (NavProgress) showing that something is
// on its way, so the new screen arrives whole instead of piece by piece. The
// wait is capped: on a slow connection the new screen comes after WAIT_MS and
// shows its skeleton for what is still missing. Data already cached (going
// back, a link pointed at first) is there at once and nothing waits.
//
// The first load of the page never waits: there is no old screen to keep, so
// the shell draws at once and the screen fills its own skeleton.
//
// A loader never fails the navigation. A read that fails is left in the cache
// as an error, and the screen shows its own message for it, as it always did.
import { matchRoutes } from 'react-router-dom';
import { queryClient } from '../core/query/client';

const WAIT_MS = 1200;

let router = null;

/** The app's router, once made: until its first load is done, nothing waits. */
export function setRouter(r) {
  router = r;
}

const booted = () => !!router && router.state.initialized;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * A route loader from `load({ params, url, qc })`, which fetches the screen's
 * data into the cache and returns a promise for the part the screen cannot be
 * drawn without. Anything it starts and does not return is fetched in the
 * background.
 */
export function prime(load) {
  const run = (params, url) => Promise.resolve()
    .then(() => load({ params, url, qc: queryClient }))
    .catch(() => {});
  const loader = async ({ params, request }) => {
    const work = run(params, new URL(request.url));
    if (booted()) await Promise.race([work, sleep(WAIT_MS)]);
    return null;
  };
  loader.prefetch = run;
  return loader;
}

/**
 * A route's shouldRevalidate for a screen whose address keeps in-page state
 * (a step, a tab, a filter): a change to that alone never waits on the
 * loader, the screen answers it in place.
 */
export const searchStays = ({ currentUrl, nextUrl, defaultShouldRevalidate }) => (
  currentUrl.pathname === nextUrl.pathname ? false : defaultShouldRevalidate
);

/**
 * Cached or fetched now. A cached entry that has merely aged is shown as it is
 * and refreshed behind it; one a write has invalidated (core/query/client.js)
 * is fetched again first, so a list never opens on what an edit just changed.
 */
export function ensure(qc, options) {
  if (qc.getQueryState(options.queryKey)?.isInvalidated) return qc.fetchQuery(options);
  return qc.ensureQueryData({ ...options, revalidateIfStale: true });
}

export function ensureInfinite(qc, options) {
  if (qc.getQueryState(options.queryKey)?.isInvalidated) return qc.fetchInfiniteQuery(options);
  return qc.ensureInfiniteQueryData({ ...options, revalidateIfStale: true });
}

// ---- prefetch on intent ----------------------------------------------------

let table = [];
const recent = new Map();
const AGAIN_MS = 10_000;

/** The host's route table, for prefetchRoute to match against. */
export function setPrefetchRoutes(routes) {
  table = routes;
}

/**
 * Starts what a screen needs when a link to it is pointed at, focused or
 * pressed, so the click finds it ready: its code (a lazy route) and its data.
 */
export function prefetchRoute(href) {
  let url;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }
  if (url.origin !== window.location.origin) return;
  const key = url.pathname + url.search;
  const now = Date.now();
  if (now - (recent.get(key) || 0) < AGAIN_MS) return;
  recent.set(key, now);
  const matches = matchRoutes(table, url.pathname) || [];
  matches.forEach(({ route, params }) => {
    if (typeof route.lazy === 'function') route.lazy().catch(() => {});
    if (route.loader?.prefetch) route.loader.prefetch(params, url);
  });
}

/**
 * Prefetch for every same-site link on the page and for anything else marked
 * with data-prefetch="<path>" (a card or a menu button that navigates by
 * hand): on hover, keyboard focus and the press itself, which on a phone
 * comes a moment before the click.
 */
export function listenForIntent() {
  const onIntent = (e) => {
    const el = e.target instanceof Element ? e.target.closest('[data-prefetch], a[href]') : null;
    if (!el || el.closest('[data-no-prefetch]')) return;
    const href = el.getAttribute('data-prefetch') || el.getAttribute('href');
    if (!href || href.startsWith('#') || el.getAttribute('target') === '_blank') return;
    prefetchRoute(href);
  };
  document.addEventListener('pointerover', onIntent, { passive: true });
  document.addEventListener('pointerdown', onIntent, { passive: true });
  document.addEventListener('focusin', onIntent);
  return () => {
    document.removeEventListener('pointerover', onIntent);
    document.removeEventListener('pointerdown', onIntent);
    document.removeEventListener('focusin', onIntent);
  };
}
