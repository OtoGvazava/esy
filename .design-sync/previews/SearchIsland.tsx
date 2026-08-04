// SearchIsland — the glass "island" search input used in mobile chrome.
// Grows to fill its container, so it's wrapped in a sized Frame. Its
// integrated SearchSuggestions dropdown only mounts when
// `showSuggestions && device.isMobile` — DeviceContext derives isMobile from
// the real viewport (max-width:768), and this card has no viewport override
// (cfg.overrides.SearchIsland has none, so it captures at the 900x700
// default → "tablet"), so that branch is unreachable here. See
// .design-sync/learnings/batch-chrome.md.
import React from 'react';
import { SearchIsland, glowTokens } from 'esy';

const T = glowTokens(false);

const Frame = ({ children }: any) => (
  <div style={{ width: 560, padding: 16, background: T.bg }}>{children}</div>
);

export const Default = () => (
  <Frame>
    <SearchIsland searchQuery="" placeholder="Search products…" />
  </Frame>
);

export const Typing = () => (
  <Frame>
    <SearchIsland
      searchQuery="ceramic mug"
      onSearchChange={() => {}}
      placeholder="Search products…"
    />
  </Frame>
);
