// The one cache every screen reads the API through (TanStack Query).
//
// Before this, each screen fetched in its own useEffect: nothing was shared,
// so every navigation refetched, each piece popped in when its own request
// came back, and going back started from empty. Now a read is made once,
// kept, and shown again at once the next time a screen asks for it, while a
// quiet refetch brings it up to date.
//
//  - staleTime: a screen opened right after its route loader fetched (see
//    router/prime.js) must not fetch the same thing again on mount, so data
//    counts as fresh for a few seconds. After that it is shown from the cache
//    and refetched behind it.
//  - No refetch on window focus: screens that copy a read into a form would
//    have it replaced while someone is typing.
//  - A 4xx is an answer, not a hiccup: retrying it only delays the screen
//    that has to show it. Anything else gets one more try.
//  - Every successful write marks the whole cache stale (utils/api.js calls
//    onApiWrite), so a list never shows what an edit has just changed: the
//    screen on display refetches at once, the rest when they are next shown.
//    That is what each screen's fetch-on-mount used to guarantee.
import { QueryClient } from '@tanstack/react-query';
import { onApiWrite } from '../../utils/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failures, error) => failures < 1 && !(error?.status >= 400 && error?.status < 500),
    },
  },
});

onApiWrite(() => { queryClient.invalidateQueries(); });
