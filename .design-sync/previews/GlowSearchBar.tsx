// GlowSearchBar — the pill search field; active filters render as tokens inside.
import React from 'react';
import { GlowSearchBar, glowTokens } from 'esy';

const T = glowTokens(false);

const Frame = ({ children }: any) => <div style={{ width: 440 }}>{children}</div>;

export const Default = () => (
  <Frame><GlowSearchBar T={T} value="" placeholder="Search ceramics, linen, candles…" /></Frame>
);

export const WithTokens = () => (
  <Frame>
    <GlowSearchBar
      T={T}
      value=""
      tokens={[{ id: '1', label: 'Under ₾50' }, { id: '2', label: 'Handmade' }]}
      placeholder="Refine…"
    />
  </Frame>
);

export const Compact = () => (
  <Frame><GlowSearchBar T={T} value="" compact placeholder="Search…" /></Frame>
);
