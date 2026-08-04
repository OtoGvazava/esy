// Logo — the small glass "esy" wordmark island used in Header/Navbar.
import React from 'react';
import { Logo, glowTokens } from 'esy';

const T = glowTokens(false);

const Frame = ({ children }: any) => (
  <div style={{ padding: 24, background: T.bg, display: 'inline-block' }}>{children}</div>
);

export const Default = () => (
  <Frame>
    <Logo onClick={() => {}} />
  </Frame>
);

export const Compact = () => (
  <Frame>
    <Logo onClick={() => {}} sx={{ minWidth: 100, px: 2, py: 1 }} />
  </Frame>
);
