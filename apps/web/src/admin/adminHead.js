// The page's own line in the admin top bar (the design's Shell: a title, a
// subtitle under it, and on a phone a subtitle of its own). Each screen says
// what it is with useAdminHead(); the shell draws it, so the name of the page
// sits in one place on every screen instead of being repeated in the body.
import { createContext, useContext, useEffect } from 'react';

export const AdminHeadContext = createContext(() => {});

/**
 * { title, sub, phoneSub, back } — `back` is a path for the top bar's back
 * button (a record opened from a list). Plain values only: they are compared
 * as JSON, so a new object with the same content does not redraw the bar.
 */
export function useAdminHead(head) {
  const set = useContext(AdminHeadContext);
  const key = JSON.stringify(head || {});
  useEffect(() => { set(JSON.parse(key)); }, [key, set]);
}
