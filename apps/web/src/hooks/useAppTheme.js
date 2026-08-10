import { useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import i18n from '../i18n';
import { FONT } from '../core/tokens';
import { STORAGE_KEYS, THEME_MODES, LANGUAGES } from '../constants';

export const useAppTheme = () => {
  const [mode, setMode] = useState(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.THEME_MODE) : null;
    if (stored === THEME_MODES.LIGHT || stored === THEME_MODES.DARK) return stored;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? THEME_MODES.DARK : THEME_MODES.LIGHT;
  });

  // Georgian-first, mirroring i18n.js: only an explicit stored 'en' opts out.
  // Both initializers run before mount, so they must agree or the first paint
  // flashes the wrong language.
  const [language, setLanguage] = useState(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.LANGUAGE) : null;
    return stored === LANGUAGES.EN ? LANGUAGES.EN : LANGUAGES.KA;
  });

  // Save theme mode to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
    } catch (error) {
      console.warn('Failed to save theme mode to localStorage:', error);
    }
    
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
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      background: {
        default: mode === 'dark' ? '#0b0b0c' : '#ffffff',
        paper: mode === 'dark' ? '#121214' : '#ffffff',
      },
    },
    typography: { fontFamily: FONT },
    shape: { borderRadius: 12 },
  }), [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === THEME_MODES.DARK ? THEME_MODES.LIGHT : THEME_MODES.DARK));
  };

  const toggleLanguage = () => {
    setLanguage((prevLang) => (prevLang === LANGUAGES.EN ? LANGUAGES.KA : LANGUAGES.EN));
  };

  return {
    mode,
    language,
    theme,
    toggleTheme,
    toggleLanguage,
    setMode,
    setLanguage,
  };
};
