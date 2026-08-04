// GlowScreen — full-height Glow page shell (bg/text tokens, padding above the dock).
import React from 'react';
import { GlowScreen, GlowTopNav, glowTokens } from 'esy';

const T = glowTokens(false);

export const Default = () => (
  <GlowScreen T={T} padBottom={24}>
    <GlowTopNav T={T} title="Shop" onBack={() => {}} />
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '4px 16px' }}>
      <div style={{ font: `700 22px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>New this week</div>
      <div style={{ font: `400 13px ${T.font}`, color: T.textDim, marginTop: 4 }}>
        Small-batch goods from independent makers.
      </div>
      <div style={{ marginTop: 16, height: 120, borderRadius: 16, background: T.surface2, border: `1px solid ${T.border}` }} />
    </div>
  </GlowScreen>
);
