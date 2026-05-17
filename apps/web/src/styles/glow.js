// Glow design system — ported from the Claude Design handoff (direction-a.jsx
// GlowTokens). Single-tenant storefront template; accent is the tenant brand.
import { useContext } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { TenantContext } from '../contexts/TenantContext';

export const GLOW_FONT =
  "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
export const GLOW_MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

// Default tenant brand for this storefront. Accent drives the whole theme;
// swap per-tenant later (the handoff is multi-tenant by design).
export const TENANT = {
  name: 'esy',
  handle: 'esy',
  domain: 'esy.ge',
  initials: 'E',
  bio: 'An independent storefront on esy. Small-batch goods, shipped worldwide — every order supports an independent maker.',
  location: 'Tbilisi · Georgia',
  since: '2024',
  hue: 250,
  accent: '#6366f1',
};

// Mix the accent toward an orange-pink anchor for the CTA gradient end-stop.
export function shiftHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (a, t, k) => Math.round(a * (1 - k) + t * k);
  return `rgb(${mix(r, 200, 0.35)}, ${mix(g, 100, 0.35)}, ${mix(b, 220, 0.35)})`;
}

export function glowTokens(dark, accent = TENANT.accent) {
  return {
    bg: dark ? '#0a0a12' : '#fafafe',
    surface: dark ? '#13131e' : '#ffffff',
    surface2: dark ? '#1a1a28' : '#f3f3fa',
    border: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,15,35,0.08)',
    borderStr: dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,15,35,0.12)',
    text: dark ? '#f2f2f7' : '#0b0b14',
    textDim: dark ? 'rgba(242,242,247,0.6)' : 'rgba(11,11,20,0.55)',
    textMute: dark ? 'rgba(242,242,247,0.4)' : 'rgba(11,11,20,0.38)',
    accent,
    accentBg: dark ? `${accent}26` : `${accent}1a`,
    accentFg: accent,
    grad: `linear-gradient(135deg, ${accent} 0%, ${shiftHue(accent, 25)} 100%)`,
    success: '#3f8a4a',
    danger: '#dc2626',
    warn: '#f59e0b',
    font: GLOW_FONT,
    mono: GLOW_MONO,
    dark,
  };
}

// Tokens bound to the app's current MUI palette mode (light/dark toggle) and
// the resolved tenant brand from TenantContext (name/description/address/
// established/colors are owner-editable; each falls back to the default brand
// when unset or until /api/tenant/current resolves).
export function useGlow() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { tenant } = useContext(TenantContext);
  const accent = tenant?.primaryColor || TENANT.accent;
  const brand = tenant
    ? {
        ...TENANT,
        name: tenant.displayName || tenant.name || TENANT.name,
        bio: tenant.description || TENANT.bio,
        location:
          [tenant.addressCity, tenant.addressCountry].filter(Boolean).join(' · ') ||
          TENANT.location,
        since: tenant.establishedYear || TENANT.since,
        domain: tenant.subdomain ? `${tenant.subdomain}.esy.ge` : TENANT.domain,
        logoUrl: tenant.logoUrl || null,
        accent,
      }
    : TENANT;
  return { T: glowTokens(dark, accent), dark, isDesktop, tenant: brand };
}
