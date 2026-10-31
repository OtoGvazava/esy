// The design object's rules, the same ones the server's DesignValidator
// enforces. Both read core/design/schema.json, and a server test fails if the
// two drift. Unknown keys are dropped, unknown values fall back to the
// default and missing keys take the default, so a v1 reader never fails on a
// later object. Only whitelisted ids leave here; nothing is ever interpolated
// into CSS.
import schema from './schema.json';

const HEX = /^#[0-9a-fA-F]{6}$/;
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);

export function normalizeDesign(input) {
  const d = obj(input);
  const { options: o, defaults: def, limits } = schema;
  const style = obj(d.style);
  const show = obj(d.show);
  const out = {
    v: 1,
    theme: pick(d.theme, o.theme, def.theme),
    menu: pick(d.menu, o.menu, def.menu),
    productLayout: pick(d.productLayout, o.productLayout, def.productLayout),
    header: pick(d.header, o.header, def.header),
    style: Object.fromEntries(Object.keys(def.style)
      .map((k) => [k, pick(style[k], o[`style.${k}`], def.style[k])])),
    show: Object.fromEntries(schema.show
      .map((k) => [k, typeof show[k] === 'boolean' ? show[k] : def.show[k]])),
  };
  if (schema.looks.includes(d.look)) out.look = d.look;

  const c = obj(d.colours);
  const colours = {};
  const hex = (v) => typeof v === 'string' && HEX.test(v);
  if (hex(c.primary)) colours.primary = c.primary;
  if (hex(c.second)) colours.second = c.second;
  if (Object.keys(colours).length) out.colours = colours;

  const b = obj(d.banner);
  const banner = {};
  if (typeof b.title === 'string' && b.title.trim()) banner.title = b.title.trim().slice(0, limits.bannerTitle);
  if (typeof b.subtitle === 'string' && b.subtitle.trim()) banner.subtitle = b.subtitle.trim().slice(0, limits.bannerSubtitle);
  if (Number.isInteger(b.productId) && b.productId > 0) banner.productId = b.productId;
  if (Object.keys(banner).length) out.banner = banner;

  return out;
}

/** What a store without a design object draws: today's Liquid Glass storefront. */
export const DEFAULT_DESIGN = normalizeDesign({});
