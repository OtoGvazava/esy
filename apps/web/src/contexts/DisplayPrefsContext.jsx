/* eslint-disable react-refresh/only-export-components */
// The shopper's display settings (store design plan, Phase 7, decisions 6–7):
// text size, reduce transparency, reduce motion, data saver and a product view
// per store, beside the language and appearance useAppTheme already keeps.
//
//  - They follow the device first: prefers-reduced-motion,
//    prefers-reduced-transparency and Save-Data decide until the shopper
//    picks otherwise, and a switch put back where the device is follows the
//    device again.
//  - On a storefront they are drawn on <html> as data-text, data-solid,
//    data-motion and data-saver (styles/display.css). The platform, the back
//    office and admin keep their own look, so nothing is drawn there.
//  - A guest's live in this browser (localStorage). Signed in, they live on
//    the account (GET / PUT /api/account/display-prefs) so every *.esy.ge
//    store gets them: after sign-in the account's win, an account with none
//    takes this browser's, and every later change in a store, from any
//    screen (the header's language and light / dark buttons too), is saved
//    back.
//  - The store directory's view (esy.ge/stores: photos, compact, list or
//    cover) is the one setting the platform keeps here. It is read from the
//    account after sign-in and written back on its own, so nothing a store
//    saved (the language, light / dark) is ever changed from esy.ge.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import { useAuth } from './AuthContext';
import { useThemeMode } from './ThemeModeContext';
import { accountApi } from '../utils/api';
import { isAdminHost, isManagerHost, isPlatformHost } from '../hooks/usePlatformHost';
import {
  STORE_VIEWS, localPart, normalizePrefs, prefsKey, readLocalPrefs, storeKey, withView, writeLocalPrefs,
} from '../core/display/prefs';

const DisplayPrefsContext = createContext(null);

const MEDIA = { noSsr: true };
const SAVE_MS = 400;

function readSaveData() {
  try {
    return !!navigator.connection?.saveData;
  } catch {
    return false;
  }
}

// The browser's own data saver (Save-Data), as it changes.
function useSaveData() {
  const [on, setOn] = useState(readSaveData);
  useEffect(() => {
    const c = typeof navigator === 'undefined' ? null : navigator.connection;
    if (!c?.addEventListener) return undefined;
    const update = () => setOn(readSaveData());
    c.addEventListener('change', update);
    return () => c.removeEventListener('change', update);
  }, []);
  return on;
}

export function DisplayPrefsProvider({ children }) {
  const { user } = useAuth();
  const { language, appearance, setLanguage, setMode } = useThemeMode();
  const [store] = useState(() => !isPlatformHost() && !isManagerHost() && !isAdminHost());
  const [shop] = useState(storeKey);
  const [prefs, setPrefs] = useState(readLocalPrefs);

  // What the device asks for.
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)', MEDIA);
  const reducedTransparency = useMediaQuery('(prefers-reduced-transparency: reduce)', MEDIA);
  const reducedData = useMediaQuery('(prefers-reduced-data: reduce)', MEDIA);
  const saveData = useSaveData();
  const device = useMemo(() => ({
    solid: reducedTransparency, motion: reducedMotion, saver: saveData || reducedData,
  }), [reducedTransparency, reducedMotion, saveData, reducedData]);

  // What is in force: the shopper's choice, else the device's.
  const text = prefs.text || 'm';
  const solid = prefs.solid ?? device.solid;
  const motion = prefs.motion ?? device.motion;
  const saver = prefs.saver ?? device.saver;

  useEffect(() => {
    const el = document.documentElement;
    const put = (name, value) => (value == null ? el.removeAttribute(name) : el.setAttribute(name, value));
    put('data-text', store ? text : null);
    put('data-solid', store && solid ? '' : null);
    put('data-motion', store && motion ? 'reduce' : null);
    put('data-saver', store && saver ? '' : null);
  }, [store, text, solid, motion, saver]);

  useEffect(() => { writeLocalPrefs(prefs); }, [prefs]);

  const setPref = useCallback((key, value) => {
    setPrefs((p) => normalizePrefs({ ...p, [key]: value }));
  }, []);
  const setText = useCallback((v) => setPref('text', v === 'm' ? undefined : v), [setPref]);
  const setSwitch = useCallback(
    (key, on) => setPref(key, on === device[key] ? undefined : on),
    [device, setPref],
  );
  const setView = useCallback((view) => {
    if (shop) setPrefs((p) => normalizePrefs({ ...p, views: withView(p.views, shop, view) }));
  }, [shop]);
  const setStoresView = useCallback(
    (v) => setPref('stores', v === STORE_VIEWS[0] ? undefined : v),
    [setPref],
  );

  // ---- the account copy ----------------------------------------------------
  // Stores only: the platform, the back office and admin keep the language and
  // light / dark this browser has there, as before, and never write the
  // shopper's settings.
  const userId = store ? user?.id ?? null : null;
  const allKey = prefsKey({ ...prefs, lang: language, appearance });
  const latest = useRef(allKey);
  useEffect(() => { latest.current = allKey; }, [allKey]);
  const sent = useRef(null); // what the account holds, as prefsKey
  const pending = useRef(null); // a change waiting to be saved
  const [synced, setSynced] = useState(null); // whose settings this page holds

  // Signed in (or a session restored): the account's settings, when it has any, win.
  useEffect(() => {
    sent.current = null;
    pending.current = null;
    setSynced(null);
    if (!userId) return undefined;
    let alive = true;
    const before = latest.current;
    accountApi.getDisplayPrefs().then((saved) => {
      if (!alive) return;
      // A change made while the account was being asked is the newest
      // choice, so it goes up instead of being overwritten.
      if (saved && latest.current === before) {
        const n = normalizePrefs(saved);
        if (n.stores && Object.keys(n).length === 1) {
          // Only esy.ge has written to this account (the directory's view),
          // so for a store it has none yet: this browser's go up, with it.
          setPrefs((p) => normalizePrefs({ ...p, stores: n.stores }));
        } else {
          setPrefs(localPart(n));
          if (n.lang) setLanguage?.(n.lang);
          if (n.appearance) setMode?.(n.appearance);
          sent.current = prefsKey(n);
        }
      }
      setSynced(userId);
    }).catch(() => {
      /* What the account holds is unknown, so nothing is written over it. */
    });
    return () => { alive = false; };
  }, [userId, setLanguage, setMode]);

  const flush = useCallback((keepalive = false) => {
    const body = pending.current;
    if (!body) return;
    pending.current = null;
    sent.current = body;
    accountApi.putDisplayPrefs(JSON.parse(body), keepalive ? { keepalive } : undefined).catch(() => {
      if (sent.current === body) sent.current = null;
    });
  }, []);

  // Every change after that is saved back, a moment later so a run of taps is one request.
  useEffect(() => {
    if (!userId || synced !== userId || allKey === sent.current) return undefined;
    pending.current = allKey;
    const timer = setTimeout(() => flush(), SAVE_MS);
    return () => clearTimeout(timer);
  }, [userId, synced, allKey, flush]);

  // Leaving the page inside that moment still saves it.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(true); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flush]);

  // ---- esy.ge's one setting --------------------------------------------------
  // The platform reads the account's directory view after sign-in (the
  // account's wins, as in a store) and writes a change back over whatever the
  // account holds, so every other setting there stays as a store left it.
  const [platform] = useState(isPlatformHost);
  const platformUser = platform ? user?.id ?? null : null;
  const stores = prefs.stores || STORE_VIEWS[0];
  const storesNow = useRef(stores);
  useEffect(() => { storesNow.current = stores; }, [stores]);
  const account = useRef(null); // the account's settings, as last read or written here
  const [platformSynced, setPlatformSynced] = useState(null);

  useEffect(() => {
    account.current = null;
    setPlatformSynced(null);
    if (!platformUser) return undefined;
    let alive = true;
    const before = storesNow.current;
    accountApi.getDisplayPrefs().then((saved) => {
      if (!alive) return;
      const n = normalizePrefs(saved);
      account.current = n;
      // A view picked while the account was being asked is the newest choice.
      if (n.stores && storesNow.current === before) setPrefs((p) => normalizePrefs({ ...p, stores: n.stores }));
      setPlatformSynced(platformUser);
    }).catch(() => {
      /* What the account holds is unknown, so nothing is written over it. */
    });
    return () => { alive = false; };
  }, [platformUser]);

  useEffect(() => {
    if (!platformUser || platformSynced !== platformUser || !account.current) return;
    if ((account.current.stores || STORE_VIEWS[0]) === stores) return;
    // The view is always named, the first one too: an account esy.ge alone
    // has written to then reads, in a store, as one with no settings of the
    // store's yet, rather than as one whose every setting was put back.
    const next = normalizePrefs({ ...account.current, stores });
    account.current = next;
    accountApi.putDisplayPrefs(next).catch(() => {
      /* This browser still has the choice, and the next change sends it again. */
    });
  }, [platformUser, platformSynced, stores]);

  const value = useMemo(() => ({
    store,
    shop,
    prefs,
    device,
    text,
    solid,
    motion,
    saver,
    // Data saver and reduce motion both keep video and moving things still until tapped.
    autoplay: !saver && !motion,
    view: shop ? prefs.views?.[shop] ?? null : null,
    storesView: stores,
    setText,
    setSolid: (on) => setSwitch('solid', on),
    setMotion: (on) => setSwitch('motion', on),
    setSaver: (on) => setSwitch('saver', on),
    setView,
    setStoresView,
  }), [store, shop, prefs, device, text, solid, motion, saver, stores, setText, setSwitch, setView, setStoresView]);

  return <DisplayPrefsContext.Provider value={value}>{children}</DisplayPrefsContext.Provider>;
}

/** The settings and their setters, for the Display screen. Null outside the provider. */
export const useDisplayPrefs = () => useContext(DisplayPrefsContext);

/**
 * The product view this shopper picked for this store, or null for the owner's
 * layout. Only on a storefront: the back office draws storefront parts for its
 * design preview, and that must show the owner's design.
 */
export function useStoreView() {
  const ctx = useContext(DisplayPrefsContext);
  return ctx?.store ? ctx.view : null;
}

/** Data saver is on in this store: images wait until they are near the screen. */
export function useDataSaver() {
  const ctx = useContext(DisplayPrefsContext);
  return !!(ctx?.store && ctx.saver);
}
