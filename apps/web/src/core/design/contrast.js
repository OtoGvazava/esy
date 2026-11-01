// The colour check (store plan, Phase 6), first used by quick setup's logo
// and colour step: whether a store colour holds up on the pages it is drawn
// on, in light and in dark mode, with WCAG 2 contrast ratios.
//
// Button labels are not checked here because they cannot fail: the themes pick
// the label colour by the brand's lightness (themes.css, --k-on-pri), so a
// light brand gets dark text and a dark one white, and the better of the two
// never falls below 4.3:1. What can fail is the colour itself disappearing
// into the page, which is what this measures.

const HEX = /^#[0-9a-f]{6}$/i;
const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const linear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of `#rrggbb`. */
export function luminance(hex) {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two `#rrggbb` colours, 1 to 21. */
export function ratio(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** `a` moved `p` (0–1) of the way to `b`, as `#rrggbb`. */
export function mix(a, b, p) {
  const to = channels(b);
  return `#${channels(a).map((v, i) => Math.round(v + (to[i] - v) * p).toString(16).padStart(2, '0')).join('')}`;
}

// The lightest and the darkest ground a store colour sits on across the
// themes: white cards in light mode, the dark pages' cards in dark mode.
export const LIGHT_GROUND = '#ffffff';
export const DARK_GROUND = '#141416';

// Below these the colour all but vanishes into the ground; a fix walks it
// until it reaches 3:1, the WCAG minimum for a control against its page.
const VANISHES = { light: 1.6, dark: 2.2 };
const FIXED = 3;

function walk(hex, toward, ground) {
  let c = hex;
  for (let i = 0; i < 40 && ratio(c, ground) < FIXED; i += 1) c = mix(c, toward, 0.08);
  return c;
}

/**
 * Whether `hex` stays visible in light and dark mode.
 *
 * @returns {{ ok: true } | { ok: false, issue: 'light' | 'dark', fix: string }}
 *   `issue` names the mode it disappears in, `fix` the nearest colour that
 *   does not (darker for light mode, lighter for dark).
 */
export function colourCheck(hex) {
  if (!HEX.test(hex || '')) return { ok: true };
  const c = hex.toLowerCase();
  if (ratio(c, LIGHT_GROUND) < VANISHES.light) return { ok: false, issue: 'light', fix: walk(c, '#000000', LIGHT_GROUND) };
  if (ratio(c, DARK_GROUND) < VANISHES.dark) return { ok: false, issue: 'dark', fix: walk(c, '#ffffff', DARK_GROUND) };
  return { ok: true };
}
