// Whether the page may move right now.
//
// A storefront follows the shopper's reduce-motion setting, which starts from
// the device's and is drawn on <html> as data-motion="reduce"
// (DisplayPrefsContext). The other hosts have no such setting and follow the
// device alone. A storefront is told apart by data-text, which the display
// settings put on every storefront and nowhere else.
const REDUCE = '(prefers-reduced-motion: reduce)';

export function motionAllowed() {
  if (typeof document === 'undefined') return false;
  const html = document.documentElement;
  if (html.hasAttribute('data-text')) return html.getAttribute('data-motion') !== 'reduce';
  try {
    return !window.matchMedia(REDUCE).matches;
  } catch {
    return true;
  }
}
