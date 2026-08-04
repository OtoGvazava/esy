// SearchSuggestions — the dropdown suggestion list normally nested inside
// SearchIsland's glass container (which supplies the background/border — the
// component itself paints no chrome). It returns null for an empty query, so
// every cell needs a non-empty searchQuery. Wrapped in a frame that mirrors
// the parent island's glassmorphism so the rows read as a real dropdown
// instead of bare floating text.
import React from 'react';
import { SearchSuggestions, glowTokens } from 'esy';

const T = glowTokens(false);

const IslandFrame = ({ children }: any) => (
  <div
    style={{
      width: 380,
      padding: 16,
      background: T.bg,
    }}
  >
    <div
      style={{
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      }}
    >
      {children}
    </div>
  </div>
);

export const Default = () => (
  <IslandFrame>
    <SearchSuggestions searchQuery="e" onSuggestionClick={() => {}} />
  </IslandFrame>
);

export const SingleMatch = () => (
  <IslandFrame>
    <SearchSuggestions searchQuery="mascara" onSuggestionClick={() => {}} />
  </IslandFrame>
);
