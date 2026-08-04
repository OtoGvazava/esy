// MobileFooter — persistent bottom pill nav (Products · Search · Cart ·
// Menu), mobile-only chrome. position:fixed (bottom:20, centered) → a
// transform wrapper makes it a local containing block. The card's viewport
// override (520x220, cfg.overrides.MobileFooter) puts DeviceContext's
// max-width:768 media query into "mobile" so device.shouldShowMobileFooter
// is true and the component doesn't bail out to null.
import React from 'react';
import { MobileFooter, glowTokens } from 'esy';

const T = glowTokens(false);

const Frame = ({ children }: any) => (
  <div
    style={{
      position: 'relative',
      transform: 'translateZ(0)',
      width: 400,
      height: 280,
      overflow: 'hidden',
      background: `linear-gradient(165deg, ${T.accentBg}, ${T.surface2})`,
      border: `1px solid ${T.border}`,
    }}
  >
    {children}
  </div>
);

export const Default = () => (
  <Frame>
    <MobileFooter
      themeMode="light"
      language="en"
      onProductsClick={() => {}}
      onCartToggle={() => {}}
      onAccountClick={() => {}}
      onToggleTheme={() => {}}
      onToggleLanguage={() => {}}
      onSearchClick={() => {}}
      onProfileMenuToggle={() => {}}
      onMobileSearchToggle={() => {}}
    />
  </Frame>
);

export const Georgian = () => (
  <Frame>
    <MobileFooter
      themeMode="dark"
      language="ka"
      mobileSearchEnabled
      onProductsClick={() => {}}
      onCartToggle={() => {}}
      onAccountClick={() => {}}
      onToggleTheme={() => {}}
      onToggleLanguage={() => {}}
      onSearchClick={() => {}}
      onProfileMenuToggle={() => {}}
      onMobileSearchToggle={() => {}}
    />
  </Frame>
);
