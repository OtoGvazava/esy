// Navbar — the compact single-row floating AppBar (logo + search input +
// inline actions), an alternate/older chrome to Header. position:fixed
// (top:20, centered) → same transform-wrapper trick as Header so it renders
// inside the card.
import React from 'react';
import { Navbar, glowTokens } from 'esy';

const T = glowTokens(false);

const Frame = ({ children }: any) => (
  <div
    style={{
      position: 'relative',
      transform: 'translateZ(0)',
      width: 820,
      height: 200,
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
    <Navbar searchQuery="" themeMode="light" language="en" />
  </Frame>
);

export const Searching = () => (
  <Frame>
    <Navbar
      searchQuery="ceramic mug set"
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
    <Navbar
      searchQuery=""
      themeMode="dark"
      language="ka"
      onToggleTheme={() => {}}
      onToggleLanguage={() => {}}
      onAccountClick={() => {}}
    />
  </Frame>
);
