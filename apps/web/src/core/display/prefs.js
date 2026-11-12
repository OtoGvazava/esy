// The shopper's display settings (store design plan, Phase 7): the lists, the
// normaliser and the browser copy. The server keeps the same lists in
// DisplayPrefsValidator.java and refuses anything off them, so only what these
// controls offer is ever sent.
//
//   lang        ka | en               (kept by useAppTheme, synced from here)
//   appearance  light | dark | auto   (kept by useAppTheme, synced from here)
//   text        s | m | l | xl        absent: m
//   stores      photos | compact | list | cover   absent: photos (the store directory's view)
//   solid      reduce transparency   absent: the device's own setting decides
//   motion      reduce motion         absent: the device's own setting decides
//   saver       data saver            absent: the device's own setting decides
//   views       { <store subdomain>: grid2 | grid3 | list }   absent: the owner's layout
import { storefrontSubdomain } from '../../utils/hosts';

export const LANGS = ['ka', 'en'];
export const APPEARANCES = ['light', 'dark', 'auto'];
export const TEXT_SIZES = ['s', 'm', 'l', 'xl'];
export const SWITCHES = ['solid', 'motion', 'saver'];
export const VIEWS = ['grid2', 'grid3', 'list'];
// How esy.ge/stores draws its stores; the first is the one nobody has to pick.
export const STORE_VIEWS = ['photos', 'compact', 'list', 'cover'];
// The server refuses more; the oldest store's choice gives way first.
export const MAX_VIEWS = 40;

const STORE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const LOCAL_KEY = 'esy-display';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/**
 * Any input to valid settings, in one fixed key order (so equal settings
 * serialise equally): unknown keys and values off a list are dropped.
 */
export function normalizePrefs(input) {
  const p = isObj(input) ? input : {};
  const out = {};
  if (LANGS.includes(p.lang)) out.lang = p.lang;
  if (APPEARANCES.includes(p.appearance)) out.appearance = p.appearance;
  if (TEXT_SIZES.includes(p.text)) out.text = p.text;
  if (STORE_VIEWS.includes(p.stores)) out.stores = p.stores;
  SWITCHES.forEach((k) => { if (typeof p[k] === 'boolean') out[k] = p[k]; });
  if (isObj(p.views)) {
    const views = Object.entries(p.views)
      .filter(([store, v]) => STORE.test(store) && VIEWS.includes(v))
      .slice(-MAX_VIEWS);
    if (views.length) out.views = Object.fromEntries(views);
  }
  return out;
}

/** The settings as one comparable string. */
export const prefsKey = (prefs) => JSON.stringify(normalizePrefs(prefs));

/** The part this browser keeps under its own key (language and appearance have theirs). */
export function localPart(prefs) {
  const { lang: _lang, appearance: _appearance, ...rest } = normalizePrefs(prefs);
  return rest;
}

export function readLocalPrefs() {
  try {
    return localPart(JSON.parse(window.localStorage.getItem(LOCAL_KEY) || '{}'));
  } catch {
    return {};
  }
}

export function writeLocalPrefs(prefs) {
  try {
    const local = localPart(prefs);
    if (Object.keys(local).length) window.localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
    else window.localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* storage blocked (private mode): the settings last for this visit */
  }
}

/** The store this page belongs to, as the views are keyed: its subdomain, or null. */
export function storeKey() {
  let key = storefrontSubdomain();
  if (!key && typeof window !== 'undefined') {
    // The local dev simulation runs every store on one host as ?tenant=<sub>.
    try { key = new URLSearchParams(window.location.search).get('tenant'); } catch { key = null; }
  }
  key = (key || '').toLowerCase();
  return STORE.test(key) ? key : null;
}

/**
 * `views` with this store's choice set, or removed for the store's own layout.
 * A changed store moves to the end, so the cap drops the one picked longest ago.
 */
export function withView(views, store, view) {
  const rest = Object.fromEntries(Object.entries(isObj(views) ? views : {}).filter(([k]) => k !== store));
  if (!VIEWS.includes(view)) return rest;
  return Object.fromEntries([...Object.entries(rest), [store, view]].slice(-MAX_VIEWS));
}
