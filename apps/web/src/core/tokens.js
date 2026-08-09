// Design tokens and pure style helpers, ported from the Claude Design project's
// esy-core.jsx (its TK token factory, mixHex, track, and the canvas size
// constants). Colour values are reproduced verbatim; only the module shape is
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

// The design's token factory. `dark` selects the theme, `accent` is the tenant
// brand colour and must be a 6-digit `#rrggbb` (accentFg and grad run it through
// mixHex, which parses hex pairs positionally).
export function TK(dark, accent = '#6366f1') {
  return {
    bg: dark ? '#0a0a12' : '#fafafe',
    bg2: dark ? '#07070d' : '#f2f2f7',
    surface: dark ? '#13131e' : '#ffffff',
    surface2: dark ? '#1a1a28' : '#f3f3fa',
    border: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,15,35,0.09)',
    borderStr: dark ? 'rgba(255,255,255,0.16)' : 'rgba(15,15,35,0.14)',
    text: dark ? '#f2f2f7' : '#0b0b14',
    textDim: dark ? 'rgba(242,242,247,0.78)' : 'rgba(11,11,20,0.70)',
    textMute: dark ? 'rgba(242,242,247,0.58)' : 'rgba(11,11,20,0.60)',
    accent,
    accentBg: dark ? `${accent}26` : `${accent}16`,
    accentFg: dark ? mixHex(accent, '#ffffff', 0.48) : mixHex(accent, '#000000', 0.24),
    grad: `linear-gradient(135deg, ${accent} 0%, ${mixHex(accent, '#8b5cf6', 0.4)} 100%)`,
    success: '#3f8a4a',
    successFg: dark ? '#63b06f' : '#2d6835',
    successBg: dark ? '#3f8a4a2e' : '#3f8a4a16',
    warn: '#b45309',
    warnFg: dark ? '#e0a14f' : '#8a3f06',
    warnBg: dark ? '#f59e0b2e' : '#f59e0b1f',
    danger: '#dc2626',
    dangerFg: dark ? '#f07a7a' : '#b91c1c',
    dangerBg: dark ? '#dc26262e' : '#dc262614',
    admin: '#0f766e',
    adminFg: dark ? '#3fa89f' : '#0b5d57',
    adminBg: dark ? '#0f766e33' : '#0f766e14',
    font: "'Noto Sans Georgian', 'Inter', -apple-system, system-ui, sans-serif",
    mono: "ui-monospace, 'SF Mono', Menlo, monospace",
    shadow: dark ? '0 20px 50px rgba(0,0,0,0.5)' : '0 12px 40px rgba(20,20,60,0.10)',
    dark,
  };
}
