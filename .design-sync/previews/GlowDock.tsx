// GlowDock — persistent bottom nav (Shop · Search · Bag · Saved · Account).
// Reads router/i18n/cart/auth from the preview provider; signed-out default.
// position:fixed → a transform wrapper makes it a local containing block, and a
// tinted backdrop lets the translucent glass read.
import React from 'react';
import { GlowDock, glowTokens } from 'esy';

const T = glowTokens(false);

export const Default = () => (
  <div
    style={{
      position: 'relative',
      transform: 'translateZ(0)',
      width: 520,
      height: 150,
      borderRadius: 22,
      overflow: 'hidden',
      background: `linear-gradient(165deg, ${T.accentBg}, ${T.surface2})`,
      border: `1px solid ${T.border}`,
    }}
  >
    <GlowDock />
  </div>
);
