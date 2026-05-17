import { useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import i18n from '../i18n';
import { STORAGE_KEYS, THEME_MODES, LANGUAGES } from '../constants';

export const useAppTheme = () => {
  const [mode, setMode] = useState(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.THEME_MODE) : null;
    if (stored === THEME_MODES.LIGHT || stored === THEME_MODES.DARK) return stored;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? THEME_MODES.DARK : THEME_MODES.LIGHT;
  });

  const [language, setLanguage] = useState(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.LANGUAGE) : null;
    return stored === LANGUAGES.KA ? LANGUAGES.KA : LANGUAGES.EN;
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
  }, [language]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      background: {
        default: mode === 'dark' ? '#0b0b0c' : '#ffffff',
        paper: mode === 'dark' ? '#121214' : '#ffffff',
      },
    },
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
