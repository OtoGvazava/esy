import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { STORAGE_KEYS, LANGUAGES } from './constants';
import { hostKey } from './core/hostKey';
import { SHARED_NS, hostNamespaces } from './locales/namespaces';

// The strings arrive with the page, not inside the app's code: a page loads
// its host's namespaces (locales/namespaces.js) in its own language, and the
// other language only once the visitor switches to it. Every file here was in
// the app's first download before, both languages and every host's, which
// made up most of it.
//
// The namespaces every host reads come as one chunk per language; a host's
// own come one chunk each. Written out rather than globbed, so the
// design-sync bundle (esbuild, .ds-entry.mjs) can follow them too.
const LOAD = {
  en: {
    shared: () => import('./locales/shared.en.js'),
    account: () => import('./locales/en/account.json'),
    admin: () => import('./locales/en/admin.json'),
    auth: () => import('./locales/en/auth.json'),
    cart: () => import('./locales/en/cart.json'),
    display: () => import('./locales/en/display.json'),
    manager: () => import('./locales/en/manager.json'),
    orders: () => import('./locales/en/orders.json'),
    platform: () => import('./locales/en/platform.json'),
  },
  ka: {
    shared: () => import('./locales/shared.ka.js'),
    account: () => import('./locales/ka/account.json'),
    admin: () => import('./locales/ka/admin.json'),
    auth: () => import('./locales/ka/auth.json'),
    cart: () => import('./locales/ka/cart.json'),
    display: () => import('./locales/ka/display.json'),
    manager: () => import('./locales/ka/manager.json'),
    orders: () => import('./locales/ka/orders.json'),
    platform: () => import('./locales/ka/platform.json'),
  },
};

function read(lng, ns) {
  const files = LOAD[lng];
  if (!files) return Promise.resolve({});
  if (SHARED_NS.includes(ns)) return files.shared().then((m) => m.default[ns] || {});
  return files[ns] ? files[ns]().then((m) => m.default) : Promise.resolve({});
}

// An i18next backend over the files above. i18next asks it for each of the
// page's namespaces in the page's language before the first render (main.jsx
// waits for that), and for the other language's when the language changes:
// the switch happens once they are in, so a page never shows a raw key.
const files = {
  type: 'backend',
  init() {},
  read(lng, ns, done) {
    read(lng, ns).then((data) => done(null, data), (error) => done(error, null));
  },
};

// Georgian-first: esy serves Georgian merchants and shoppers, so a first visit
// lands in Georgian and English is one toggle away. A stored choice always
// wins. Keep this in step with useAppTheme's initializer (only a stored 'en'
// opts out) — both are read before React mounts, so a disagreement shows as a
// flash of the wrong language, and with no fallback a value neither knows
// would load no strings at all.
function storedLanguage() {
  let stored = null;
  try { stored = window.localStorage.getItem(STORAGE_KEYS.LANGUAGE); } catch { /* storage blocked */ }
  return stored === LANGUAGES.EN ? LANGUAGES.EN : LANGUAGES.KA;
}

/** Resolved once the page's strings are in: main.jsx draws nothing before. */
export const i18nReady = i18n
  .use(files)
  .use(initReactI18next)
  .init({
    lng: storedLanguage(),
    // No fallback language. It used to be English, so an untranslated key
    // would read as English; npm run i18n:check (run before every commit)
    // keeps every key in both languages now, and a fallback would have every
    // Georgian page download the English strings it never shows.
    fallbackLng: false,
    load: 'currentOnly',
    interpolation: { escapeValue: false },
    ns: hostNamespaces(hostKey()),
    defaultNS: 'navbar',
    // A namespace some screen asks for that its host has not loaded (the
    // build checks this cannot happen) arrives a moment later instead of
    // suspending a screen that has no fallback to show.
    react: { useSuspense: false },
  });

export default i18n;
