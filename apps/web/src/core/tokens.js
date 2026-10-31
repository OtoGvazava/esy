// Design tokens and pure style helpers, ported from the Claude Design project's
// esy-core.jsx (its TK token factory, mixHex, track, and the canvas size
// constants). Colour values now live in styles/themes.css, ported from the
// "esy Full Design" kit; only the module shape is
// adapted — ESM named exports, no canvas harness, no design-local string table,
// no fixtures. This sits BESIDE the existing glowTokens() in ../styles/glow.js
// and does not replace it; see the port notes for where the two disagree.

// Canvas sizes the design draws every screen at. These are reference viewport
// dimensions for the three device classes, NOT media-query breakpoints — the
// app's real breakpoints stay in ../constants (DEVICE_BREAKPOINTS) and MUI's
// theme.breakpoints. esy-core defines no breakpoint values of its own.
export const WEB = { w: 1440, h: 900 };
export const TAB = { w: 834, h: 1194 };
export const MOB = { w: 390, h: 844 };

// Mix two hex colours and return an rgb() string. `t` is the blend factor
// toward `b` (0 = all `a`, 1 = all `b`). Both inputs must be 6-digit `#rrggbb`.
export function mixHex(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const m = (x, y) => Math.round(x * (1 - t) + y * t);
  return `rgb(${m(r1, r2)}, ${m(g1, g2)}, ${m(b1, b2)})`;
}

// Georgian typography needs a touch less negative tracking than Latin: Mkhedruli
// letterforms are rounder and lose legibility when tightened the way Latin
// display text can be. Pass the active i18n language and the letter-spacing you
// want for Latin; Georgian is pinned to -0.005em regardless.
export function track(lang, latin) {
  return String(lang || '').toLowerCase().startsWith('ka') ? '-0.005em' : latin;
}

// The default platform accent, used whenever a tenant brand is unset or unusable.
export const DEFAULT_ACCENT = '#6366f1';

// The design's type stacks, named so they can be applied outside a TK() call —
// MUI's createTheme needs the same family, or every Button, TextField and
// Dialog falls back to MUI's default Roboto while the surrounding inline-styled
// markup uses this. Geist draws Latin and Noto Sans Georgian draws Mkhedruli
// (Geist has no Georgian glyphs, so each letter falls through to the face that
// has it); both are loaded in index.html. Inline styles read the theme's own
// stack through T.font, because Soft leads with Noto for Latin too.
export const FONT = "'Geist', 'Noto Sans Georgian', -apple-system, system-ui, sans-serif";
export const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

// The platform's own colour (esy.ge), and administration teal (admin.esy.ge).
export const PLATFORM_BRAND = '#2b59ff';
export const ADMIN_BRAND = '#0f766e';

// A token colour at `a` opacity (0–1). Tokens are CSS custom properties, so the
// old `${T.accent}` + hex-alpha suffix produced `var(--k-accent)55`, which is
// not a colour; color-mix works for a var() and a hex alike.
export function alpha(color, a) {
  return `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;
}

// WCAG relative luminance of a `#rrggbb` colour.
function luminance(hex) {
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Text colour for a label sitting on `hex`: white while white reaches 4.5:1,
// otherwise near-black. Orange, light green and yellow brands fail with white,
// which is why the design's buttons flip their text instead of always being white.
export function onColor(hex) {
  const l = luminance(hex);
  return 1.05 / (l + 0.05) >= 4.5 ? '#ffffff' : '#111113';
}

// mixHex parses hex pairs positionally, so a malformed accent silently produces
// `rgb(NaN, NaN, NaN)` for accentFg and a broken gradient. tenant.primaryColor is
// owner-editable and arrives from the API, so every caller of TK() must validate
// at that boundary rather than trusting it — TK routes the accent through mixHex
// twice. This lives here, beside TK, because it guards TK's one precondition.
const HEX6 = /^#[0-9a-f]{6}$/i;

export function safeAccent(value, fallback = DEFAULT_ACCENT) {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (HEX6.test(v)) return v;
  // Expand #abc → #aabbcc rather than discarding a usable shorthand.
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return fallback;
}

// The design's token factory. Every colour is a CSS custom property that
// styles/themes.css defines per theme and mode on <html> (data-th, data-md,
// --k-brand — see ThemeRoot in App.jsx), so a screen follows the active theme
// without knowing which one it is. `dark` still selects light/dark for the few
// call sites that branch on it.
//
// With no `accent`, the accent keys are the live store colour as the theme draws
// it (Neon, for one, lights its own neon from the brand). Pass an `accent` only
// to draw a colour that is NOT the page's own — a colour being picked in a form,
// or administration teal — and it must be a 6-digit `#rrggbb` (accentFg runs it
// through mixHex, which parses hex pairs positionally): pass it through
// safeAccent first.
export function TK(dark, accent) {
  const live = accent === undefined;
  return {
    bg: 'var(--k-bg2)',
    page: 'var(--k-bg)',
    bg2: 'var(--k-bg2)',
    surface: 'var(--k-surface)',
    surface2: 'var(--k-surface2)',
    border: 'var(--k-border)',
    borderStr: 'var(--k-border-str)',
    text: 'var(--k-text)',
    textDim: 'var(--k-text-dim)',
    textMute: 'var(--k-text-mute)',
    accent: live ? 'var(--k-accent)' : accent,
    onAccent: live ? 'var(--k-on-pri)' : onColor(accent),
    accentBg: live ? 'var(--k-accent-bg)' : alpha(accent, dark ? 0.15 : 0.09),
    accentFg: live ? 'var(--k-accent-fg)' : (dark ? mixHex(accent, '#ffffff', 0.48) : mixHex(accent, '#000000', 0.24)),
    // The design draws primary actions in the solid store colour; the old
    // brand-to-violet gradient is gone, but the key stays for its call sites.
    grad: live ? 'var(--k-grad)' : accent,
    success: 'var(--k-success)',
    successFg: 'var(--k-success-fg)',
    successBg: 'var(--k-success-bg)',
    warn: 'var(--k-warn)',
    warnFg: 'var(--k-warn-fg)',
    warnBg: 'var(--k-warn-bg)',
    danger: 'var(--k-danger)',
    dangerFg: 'var(--k-danger-fg)',
    dangerBg: 'var(--k-danger-bg)',
    admin: ADMIN_BRAND,
    adminFg: 'var(--k-admin-fg)',
    adminBg: 'var(--k-admin-bg)',
    font: 'var(--k-font)',
    mono: MONO,
    shadow: 'var(--k-shadow)',
    dark,
  };
}
