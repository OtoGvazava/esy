// Links from an app to the account, which lives on esy.ge alone
// (platform/account/). A link says where it came from, so the account can show
// what this person has in that place and offer the way back
// (platform/account/origin.js reads it).
import { platformUrl } from '../../utils/hosts';

/** `?from=…&sub=…` for a link out of `app`; nothing from esy.ge itself. */
export function originQuery(app, sub) {
  if (app === 'store' && sub) return `?from=store&sub=${encodeURIComponent(sub)}`;
  if (app === 'manager' && sub) return `?from=manager&sub=${encodeURIComponent(sub)}`;
  if (app === 'admin') return '?from=admin';
  return '';
}

/** The account's page `path` on esy.ge, as reached from `app` (and its store). */
export const hubUrl = (path, app, sub) => platformUrl(`${path}${originQuery(app, sub)}`);
