// Header — the desktop/tablet floating chrome: logo island + Google-style
// search bar with inline language/theme/account actions. position:fixed
// (top:20, centered) → a transform wrapper makes it a local containing block
// so it renders inside the card instead of escaping to the real viewport.
// At the capture viewport (900x700, no per-component override) DeviceContext
// resolves to "tablet" (max-width:1024), so device.isMobile is false and the
// desktop/tablet branch (Logo + GoogleStyleSearch) is what actually renders —
// the mobile branch is unreachable at this card's fixed capture width.
import React from 'react';
import { Header, glowTokens } from 'esy';

const T = glowTokens(false);

const Frame = ({ children }: any) => (
  <div
    style={{
      position: 'relative',
      transform: 'translateZ(0)',
      width: 820,
      height: 300,
      overflow: 'hidden',
      background: `linear-gradient(165deg, ${T.accentBg}, ${T.surface2})`,
      border: `1px solid ${T.border}`,
      borderRadius: 24,
    }}
  >
    {children}
  </div>
);

export const Default = () => (
  <Frame>
    <Header searchQuery="" themeMode="light" language="en" />
  </Frame>
);

export const Searching = () => (
  <Frame>
    <Header
      searchQuery="vitamin c serum"
      onSearchChange={() => {}}
      themeMode="light"
      language="en"
      onToggleTheme={() => {}}
      onToggleLanguage={() => {}}
      onAccountClick={() => {}}
    />
  </Frame>
);

export const Georgian = () => (
  <Frame>
    <Header
      searchQuery=""
      themeMode="dark"
      language="ka"
      onToggleTheme={() => {}}
      onToggleLanguage={() => {}}
      onAccountClick={() => {}}
    />
  </Frame>
);
