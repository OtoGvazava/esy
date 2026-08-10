// Binds the ported design tokens (TK) to the running app: MUI's palette mode
// for light/dark, and the resolved tenant brand for the accent.
//
// This is deliberately PARALLEL to useGlow() rather than a replacement. TK is a
// key superset of glowTokens, but nine shared keys carry different values —
// textDim/textMute are a real contrast lift, accentFg changes meaning (TK
// derives a colour legible ON accentBg; glow returns the raw brand hex), grad
// tracks the tenant brand instead of dragging every store toward the same pink,
// and the font stack leads with Georgian. Retargeting useGlow() onto TK would
// change every existing screen at once, unverified. Screens move over as each
// design phase rebuilds them; when the last useGlow() call site is gone, that
// hook and glowTokens can be deleted.
import { useContext } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { TenantContext } from '../contexts/TenantContext';
import { TK } from './tokens';

// mixHex parses hex pairs positionally, so a malformed accent silently produces
// `rgb(NaN, NaN, NaN)` for accentFg and a broken gradient. tenant.primaryColor
// is owner-editable and arrives from the API, so validate at this boundary
// rather than trusting it — TK routes the accent through mixHex twice.
const HEX6 = /^#[0-9a-f]{6}$/i;

export function safeAccent(value, fallback = '#6366f1') {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (HEX6.test(v)) return v;
  // Expand #abc → #aabbcc rather than discarding a usable shorthand.
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return fallback;
}

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
