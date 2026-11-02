// A design drawn on one element instead of the whole page. styles/themes.css
// keys every token on data-th and data-md, and styles/design-style.css keys
// the style options on data-btn, data-corner, … — on <html> for a storefront
// (ThemeRoot in App.jsx), or on any element with the `k-scope` class. So a
// preview carries its own design whatever theme the page around it uses.
//
// Only whitelisted ids leave normalizeDesign, and they reach the DOM only as
// attribute values; nothing here is interpolated into CSS.
import { STYLE_KEYS, designFamilies } from './htmlAttrs';

// The style options drawn as data-* attributes, in ThemeRoot's order (the
// one list in htmlAttrs.js). Each is set only when it is not the theme's
// own, so an option changes just its own properties.
export const STYLE_ATTRS = STYLE_KEYS;

/** The class and data-* attributes that draw a normalised `design` on an element. */
export function scopeAttrs(design, mode) {
  const out = {
    className: 'k-scope',
    'data-th': design.theme,
    'data-md': mode === 'dark' ? 'dark' : 'light',
  };
  STYLE_ATTRS.forEach((k) => {
    const v = design.style?.[k];
    if (v && v !== 'theme') out[`data-${k}`] = v;
  });
  return out;
}

// Faces a design may ask for beyond the default Geist and Noto Sans Georgian,
// as Google Fonts families: the same list ThemeRoot and the page's pre-paint
// script load for a storefront (core/design/htmlAttrs.js).

/** The font families a normalised `design` draws with. */
export function designFonts(design) {
  return designFamilies(design.style?.font, design.theme);
}
