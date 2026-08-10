// Binds the ported design tokens (TK) to the running app: MUI's palette mode
// for light/dark, and the resolved tenant brand for the accent.
//
// This used to be PARALLEL to useGlow(), which carried its own divergent
// palette. It no longer is: glowTokens() now delegates here (to TK), so both
// hooks return the same values and the two-design-systems split is gone. TK is
// a strict key superset of the old glow token set, which is what made the
// forward safe — see styles/glow.js for the five values that were corrected.
//
// useGlow() survives only for its tenant-brand shaping (name/bio/location/
// domain fallbacks); it is no longer a second source of colour. Screens can
// move from useGlow() to useTK() one at a time with no visual change, and when
// the last call site is gone that hook can be deleted.
import { useContext } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { TenantContext } from '../contexts/TenantContext';
import { TK, safeAccent } from './tokens';

// Re-exported for call sites that imported it from here before it moved next to
// TK, whose precondition it guards.
export { safeAccent };

/**
 * @returns {{T: object, dark: boolean, isDesktop: boolean, accent: string}}
 */
export function useTK() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { tenant } = useContext(TenantContext);
  const accent = safeAccent(tenant?.primaryColor);
  return { T: TK(dark, accent), dark, isDesktop, accent };
}

export default useTK;
