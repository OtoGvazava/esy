import { useState, useEffect, useMemo, useCallback } from 'react';
import { createTheme } from '@mui/material/styles';
import i18n from '../i18n';
import { FONT } from '../core/tokens';
import { STORAGE_KEYS, THEME_MODES, LANGUAGES } from '../constants';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const AUTO = 'auto';
const APPEARANCES = [THEME_MODES.LIGHT, THEME_MODES.DARK, AUTO];
// Set once the stored mode has been read under the light / dark / auto rules.
const MIGRATED_KEY = 'theme-mode-v';

const systemDark = () => {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(DARK_QUERY).matches;
  } catch {
    return false;
  }
};

// The shopper's appearance: light, dark, or auto (follow the device, live).
// `theme-mode` used to hold only light or dark, and the first visit wrote down
// whatever the device said at the time, so an old value is not necessarily a
// choice. It is read once more: one that matches the device now becomes auto,
// which looks the same today and follows the device from then on; one that
// differs was picked and stays. index.html's first-paint script already reads
// anything but light or dark as "follow the device".
function initialAppearance() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.THEME_MODE);
    const old = window.localStorage.getItem(MIGRATED_KEY) !== '2';
    if (old && (stored === THEME_MODES.LIGHT || stored === THEME_MODES.DARK)) {
      return (stored === THEME_MODES.DARK) === systemDark() ? AUTO : stored;
    }
    return APPEARANCES.includes(stored) ? stored : AUTO;
  } catch {
    return AUTO;
  }
}

export const useAppTheme = () => {
  const [appearance, setAppearance] = useState(initialAppearance);
  const [deviceDark, setDeviceDark] = useState(systemDark);

  // Auto follows the device as it changes (a phone that turns dark at sunset),
  // not just the way it was when the page loaded.
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia?.(DARK_QUERY); } catch { mq = null; }
    if (!mq) return undefined;
    const update = () => setDeviceDark(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener?.(update);
    return () => mq.removeListener?.(update);
  }, []);

  const mode = appearance === AUTO
    ? (deviceDark ? THEME_MODES.DARK : THEME_MODES.LIGHT)
    : appearance;

  // Georgian-first, mirroring i18n.js: only an explicit stored 'en' opts out.
  // Both initializers run before mount, so they must agree or the first paint
  // flashes the wrong language.
  const [language, setLanguage] = useState(() => {
    let stored = null;
    try { stored = window.localStorage.getItem(STORAGE_KEYS.LANGUAGE); } catch { /* storage blocked */ }
    return stored === LANGUAGES.EN ? LANGUAGES.EN : LANGUAGES.KA;
  });

  // Save the appearance (light, dark or auto) to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.THEME_MODE, appearance);
      window.localStorage.setItem(MIGRATED_KEY, '2');
    } catch (error) {
      console.warn('Failed to save theme mode to localStorage:', error);
    }
  }, [appearance]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', mode);
    }
  }, [mode]);

  // Persist language AND drive react-i18next, so every toggle (Glow LangPill,
  // platform globe, Language settings) localizes t() live — not just the
  // settings page.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error);
    }
    if (i18n.language !== language) i18n.changeLanguage(language);
    // Keep <html lang> honest: it drives screen-reader pronunciation and the
    // browser's own language-dependent text handling, neither of which follows
    // i18next. index.html ships lang="ka" for the default; this tracks changes.
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', language);
    }
  }, [language]);

  // typography.fontFamily must be set explicitly: without it MUI falls back to
  // its default Roboto, which ships no Georgian coverage, so every MUI-rendered
  // Button/TextField/Dialog label rendered Mkhedruli in a substituted system
  // face while the inline-styled markup around it used the design stack. Same
  // constant as the design tokens (core/tokens.js) so the two cannot drift.
  // background.default is transparent so CssBaseline leaves <body> clear and
  // the theme's own page ground on <html> shows (index.css); paper stays
  // concrete because MUI surfaces read it directly.
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      background: {
        default: 'transparent',
        paper: mode === 'dark' ? '#17171a' : '#ffffff',
      },
    },
    typography: { fontFamily: FONT },
    shape: { borderRadius: 12 },
  }), [mode]);

  // light, dark or auto ('system' is the old name for auto). Anything else is
  // ignored, so a stray value can never leave the page without a mode.
  const setMode = useCallback((next) => {
    const value = next === 'system' ? AUTO : next;
    if (APPEARANCES.includes(value)) setAppearance(value);
  }, []);

  // A toggle is a choice: it flips what is on screen and stops following the device.
  const toggleTheme = () => {
    setAppearance(mode === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK);
  };

  const toggleLanguage = () => {
    setLanguage((prevLang) => (prevLang === LANGUAGES.EN ? LANGUAGES.KA : LANGUAGES.EN));
  };

  return {
    mode,
    appearance,
    language,
    theme,
    toggleTheme,
    toggleLanguage,
    setMode,
    setLanguage,
  };
};
