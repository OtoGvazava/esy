// ThemePill — appearance toggle (sun in dark mode, moon in light).
import React from 'react';
import { ThemePill, glowTokens } from 'esy';

const T = glowTokens(false);
const D = glowTokens(true);

export const Light = () => <ThemePill T={T} dark={false} onClick={() => {}} />;

export const Dark = () => (
  <div style={{ background: D.bg, padding: 12, borderRadius: 12, display: 'inline-block' }}>
    <ThemePill T={D} dark onClick={() => {}} />
  </div>
);
