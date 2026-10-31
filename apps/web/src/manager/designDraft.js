// The design editor's rules, kept apart from its screen (ManagerDesign): which
// design editing starts from, when two designs are the same, and what
// publishing would change for buyers (the design's Z4 list).
import { DEFAULT_DESIGN, normalizeDesign } from '../core/design/normalize';

/**
 * A design without its colours. The server merges the store's colours into
 * the published design it returns, and publishing a draft writes whatever
 * colours the draft carries into primaryColor / secondaryColor. A draft that
 * re-sent the merged colours would overwrite a colour changed under Brand in
 * the meantime, so a draft started from the published design leaves them out.
 */
export function withoutColours(design) {
  const out = { ...normalizeDesign(design) };
  delete out.colours;
  return out;
}

/**
 * What the store has published, without colours: the default design (today's
 * storefront) when nothing has been published yet.
 */
export function liveDesign(view) {
  return view?.published ? withoutColours(view.published) : DEFAULT_DESIGN;
}

/** Where editing starts: the saved draft, as stored, or else the live design. */
export function savedDesign(view) {
  return view?.draft ? normalizeDesign(view.draft) : liveDesign(view);
}

/** normalizeDesign builds keys in a fixed order, so its JSON compares designs. */
export const designJson = (design) => JSON.stringify(normalizeDesign(design));

export const sameDesign = (a, b) => designJson(a) === designJson(b);

const LABELLED = ['theme', 'menu', 'productLayout', 'header'];

/**
 * What publishing `next` would change, compared with what is published.
 * Rows: { key, from, to } — `from` is null when there was no earlier value —
 * or, for the style options this editor does not draw yet (a look sets them),
 * one { key: 'details', count } row, so nothing that changes for buyers goes
 * unmentioned. Each switch is its own row (`stories`, and `show.<key>` for the
 * rest), and so is the banner's text (`bannerText`, to: its heading or null).
 * Colours appear only when `next` carries them, because publishing leaves a
 * colour the draft does not carry as it was.
 */
export function designChanges(next, live, liveColours = {}) {
  const a = normalizeDesign(next);
  const b = normalizeDesign(live);
  const rows = [];
  if (a.look && a.look !== b.look) rows.push({ key: 'look', from: b.look || null, to: a.look });
  LABELLED.forEach((k) => {
    if (a[k] !== b[k]) rows.push({ key: k, from: b[k], to: a[k] });
  });
  Object.keys(a.show).forEach((k) => {
    if (a.show[k] !== b.show[k]) rows.push({ key: k === 'stories' ? k : `show.${k}`, from: b.show[k], to: a.show[k] });
  });
  if (JSON.stringify(a.banner || null) !== JSON.stringify(b.banner || null)) {
    rows.push({ key: 'bannerText', from: null, to: a.banner?.title || null });
  }
  const details = Object.keys(a.style).filter((k) => a.style[k] !== b.style[k]).length;
  if (details) rows.push({ key: 'details', count: details });
  ['primary', 'second'].forEach((k) => {
    const to = a.colours?.[k];
    const from = liveColours?.[k] || null;
    if (to && to.toLowerCase() !== (from || '').toLowerCase()) rows.push({ key: k, from, to });
  });
  return rows;
}
