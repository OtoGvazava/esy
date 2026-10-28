// Glow — the tenant-brand layer for every screen that has not yet moved to
// useTK() directly.
//
// This module used to carry its OWN palette, ported from an early Claude Design
// handoff (direction-a.jsx GlowTokens). It no longer does. `glowTokens()` now
// delegates to the current design's TK factory in core/tokens.js, so the ~30
// screens still calling `useGlow()` draw exactly the values the design
// specifies — the same ones the admin and manager screens already get.
//
// Delegating rather than rewriting 30 call sites is safe because TK is a STRICT
// KEY SUPERSET of the old glow token set: every key a call site can read still
// exists, and five of them are corrected to the design's values —
//
//   font      now leads with 'Noto Sans Georgian'. Georgian is the default
//             language and the old stack led with Inter, so Mkhedruli fell
//             through to a system face that did not match the Latin type.
//   textDim   0.60/0.55 → 0.78/0.70 — body copy was washed out.
//   textMute  0.40/0.38 → 0.58/0.60 — metadata was close to illegible.
//   accentFg  was the raw brand hex; TK derives a colour legible ON accentBg.
//   grad      was shiftHue() toward a fixed orange-pink, which dragged every
//             store's gradient toward the same hue regardless of its brand;
//             TK mixes the tenant accent toward violet instead.
//
// TK also ADDS keys the old set lacked (bg2, successFg/Bg, warnFg/Bg,
// dangerFg/Bg, admin*, shadow), so screens can use the full design palette
// without a migration first.
import { useContext } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { TenantContext } from '../contexts/TenantContext';
import { TK, safeAccent, FONT, MONO } from '../core/tokens';

// Re-exported from the design tokens so there is one source of truth for type.
// GLOW_MONO is imported directly by GlowPrimitives and GlowSearchBar.
export const GLOW_FONT = FONT;
export const GLOW_MONO = MONO;

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

// Mix a colour toward an orange-pink anchor.
//
// No longer used for token gradients — T.grad now comes from TK, which mixes
// the tenant accent toward violet as the design specifies. This survives for
// PlatformRegistration's brand-picker previews, which build gradients from the
// colour the merchant is currently choosing rather than from the resolved
// tenant accent. The design draws that preview with a white tint
// (mixHex(color, '#ffffff', 0.25)) instead, so those call sites will change
// when the new-store wizard is rebuilt against f-newstore.jsx.
export function shiftHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (a, t, k) => Math.round(a * (1 - k) + t * k);
  return `rgb(${mix(r, 200, 0.35)}, ${mix(g, 100, 0.35)}, ${mix(b, 220, 0.35)})`;
}

/**
 * The design's token set, keyed for the current theme mode and tenant brand.
 *
 * Kept as a named export with its original signature so existing call sites
 * (PlatformShared, PlatformRegistration) need no change. The accent is routed
 * through safeAccent because TK feeds it to mixHex, which parses hex pairs
 * positionally and would otherwise yield `rgb(NaN, NaN, NaN)` for an
 * owner-supplied colour that is not `#rrggbb`.
 */
export function glowTokens(dark, accent = TENANT.accent) {
  return TK(dark, safeAccent(accent, TENANT.accent));
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
        // The short/long pair the design draws. `bio` is the one-liner in the
        // hero; `about` is the paragraph. bio falls back to the long form so a
        // store that has not written a tagline looks exactly as it did before
        // the split existed — and callers that show both compare the two, which
        // is how the About strip avoids printing the same sentence twice.
        bio: tenant.tagline || tenant.description || TENANT.bio,
        about: tenant.description || '',
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
