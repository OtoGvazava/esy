// The back office's navigation, ported from the design's s-manager.jsx.
//
// Seven destinations, one of them (settings) split into five sub-screens.
// The design keeps these as flat arrays rather than a nested tree because the
// same list is rendered three different ways — a sidebar, an icon rail and a
// five-item dock — and a tree would have to be flattened for two of them.

/** [key, icon name, route]. Order is the sidebar order. */
export const MNAV = [
  ['overview', 'grid', '/'],
  ['orders', 'bag', '/orders'],
  ['products', 'box', '/products'],
  ['stats', 'chart', '/stats'],
  ['money', 'card', '/money'],
  ['team', 'users', '/team'],
  ['settings', 'gear', '/settings'],
];

/**
 * The five that fit a phone dock. Stats and team are the ones dropped: both
 * are reading tasks rather than doing tasks, and a merchant on a phone is
 * usually mid-task.
 */
export const MDOCK = ['overview', 'orders', 'products', 'money', 'settings'];

/**
 * Reachable by the OWNER alone (D5). A MANAGER runs the shop day to day;
 * who else can run it, and how it is configured, stays with the owner.
 * These are shown but locked rather than hidden, so a manager can see the
 * capability exists and ask for it.
 */
export const OWNER_ONLY = ['team', 'settings'];

/**
 * Settings is the one screen too long to survive as a single page, so it is
 * five sub-screens behind a sub-nav. [key, icon, route].
 *
 * Delivery and contact are sub-screens in their own right — they were briefly
 * appended as sections to one long page, which is the drift this re-sync is
 * correcting.
 */
export const SET_TABS = [
  ['shop', 'box', '/settings/shop'],
  ['brand', 'spark', '/settings/brand'],
  ['delivery', 'truck', '/settings/delivery'],
  ['contact', 'phone', '/settings/contact'],
  ['integrations', 'card', '/settings/integrations'],
];

/** Grid columns per viewport, matching the design's gcols(size, w, t, m). */
export const gcols = (mode, w, t, m) =>
  `repeat(${mode === 'desktop' ? w : mode === 'tablet' ? t : m}, 1fr)`;
