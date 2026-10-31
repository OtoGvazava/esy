// The design object's show/hide rules that more than one screen reads, kept
// pure so the storefront, Home's hero and the editor cannot disagree.

/**
 * Whether the home page draws the store's banner: its switch is on and it has
 * a heading. A banner with only a subtitle or a product has nothing to lead
 * with, so it waits for its heading rather than drawing a half-empty band.
 */
export function bannerShown(design) {
  return !!(design?.show?.banner && design?.banner?.title);
}

/** How long a product counts as new: the "New" badge (store design plan, Phase 3). */
export const NEW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a product was added in the last NEW_DAYS days. `createdAt` is the
 * list row's ISO local date-time ("2026-10-31T12:04:05.123456"); the server
 * keeps UTC, so it is read as UTC. Only the minutes are parsed: more than
 * three fractional digits is not a format every browser's Date accepts.
 * Anything unreadable is not new, because a badge must never be invented.
 */
export function addedRecently(createdAt, now = Date.now()) {
  if (typeof createdAt !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(createdAt);
  if (!m) return false;
  const at = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  // A clock running a little ahead of the server's still counts as new.
  return at - now < DAY_MS && now - at < NEW_DAYS * DAY_MS;
}
