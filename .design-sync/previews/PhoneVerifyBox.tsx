// PhoneVerifyBox — send-code → enter-code → confirm flow. The box itself has
// no auth guard (its caller — PersonalInfo — only mounts it when appropriate),
// so it renders fine standalone. Initial state: code not yet requested.
import React from 'react';
import { PhoneVerifyBox, glowTokens } from 'esy';

const T = glowTokens(false);
const Frame = ({ children }: any) => (
  <div style={{ width: 360, padding: 16, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}` }}>
    {children}
  </div>
);

export const Default = () => (
  <Frame>
    <PhoneVerifyBox />
  </Frame>
);

export const Compact = () => (
  <Frame>
    <PhoneVerifyBox compact />
  </Frame>
);
