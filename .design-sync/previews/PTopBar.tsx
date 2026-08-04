// PTopBar — platform top nav. Reads auth/i18n/breakpoint from context; no `T`
// prop (uses usePlatform() internally). Config overrides this card's capture
// viewport to 760x180 — below MUI's 900px 'md' breakpoint, so
// usePlatform().isDesktop is false and the compact/mobile bar (mark + lang +
// theme + sign-in) renders regardless of `current` (that prop only drives the
// desktop nav-link underline). Signed-out by default — the preview provider's
// AuthContext has no session, mirroring GlowDock's "signed-out default".
import React from 'react';
import { PTopBar } from 'esy';

export const Home = () => <PTopBar current="home" />;

export const Browse = () => <PTopBar current="browse" />;
