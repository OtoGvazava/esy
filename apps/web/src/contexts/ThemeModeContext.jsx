/* eslint-disable react-refresh/only-export-components -- a context module: provider and hook belong together */
import { createContext, useContext } from 'react';

// Exposes the app's light/dark toggle to the Glow chrome (the old Header that
// carried the toggle was removed in the redesign).
const ThemeModeContext = createContext({ mode: 'light', toggle: () => {} });

export const ThemeModeProvider = ThemeModeContext.Provider;

export const useThemeMode = () => useContext(ThemeModeContext);
