// PFooter — platform footer: multi-column desktop / stacked mobile. No `T`
// prop (uses usePlatform() internally). Config overrides this card's capture
// viewport to 760x420 — below MUI's 900px 'md' breakpoint, so isDesktop is
// false and the compact dark mobile footer renders regardless of `compact`
// (that flag only tweaks desktop column padding).
import React from 'react';
import { PFooter } from 'esy';

export const Default = () => <PFooter />;

export const Compact = () => <PFooter compact />;
