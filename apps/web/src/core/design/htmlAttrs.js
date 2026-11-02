// What a store's design draws on <html>, shared by ThemeRoot (App.jsx) and
// the page's pre-paint script (boot/paint.js, inlined by vite.config.js), so
// the first frame and every frame after it agree.

// The store style options drawn as data-* on <html> (styles/design-style.css).
export const STYLE_KEYS = ['btn', 'corner', 'card', 'font', 'bg', 'density', 'icon'];

// Faces a design may ask for, loaded only when a store uses them. Georgian
// text falls back to the matching Noto face, so each brings its own.
export const FONT_FAMILIES = {
  serif: ['Fraunces:opsz,wght@9..144,400..700', 'Noto+Serif+Georgian:wght@400..700'],
  rounded: ['Nunito:wght@400..800'],
  mono: ['JetBrains+Mono:wght@400;600'],
  neon: ['Chakra+Petch:wght@500;700', 'JetBrains+Mono:wght@400;600'],
};

/** The faces a design draws in: its type option's, and Neon's own. */
export function designFamilies(font, theme) {
  return [...new Set([...(FONT_FAMILIES[font] || []), ...(theme === 'neon' ? FONT_FAMILIES.neon : [])])];
}

export const fontsHref = (families) => `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
