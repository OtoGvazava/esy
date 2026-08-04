// GlowStickyCTA — fixed action bar that sits above the dock. position:fixed → a
// transform wrapper makes it a local containing block; a little product context
// above reads as the real screen it lives on (the 92px reserve below is the dock gap).
import React from 'react';
import { GlowStickyCTA, glowTokens } from 'esy';

const T = glowTokens(false);

export const Default = () => (
  <div
    style={{
      position: 'relative',
      transform: 'translateZ(0)',
      width: 480,
      height: 230,
      borderRadius: 16,
      overflow: 'hidden',
      background: T.bg,
      border: `1px solid ${T.border}`,
    }}
  >
    <div style={{ padding: '18px 18px 0' }}>
      <div style={{ font: `700 16px ${T.font}`, color: T.text, letterSpacing: '-0.01em' }}>Ceramic Pour-Over Set</div>
      <div style={{ font: `400 13px ${T.font}`, color: T.textDim, marginTop: 4 }}>Hand-glazed stoneware · 400ml</div>
    </div>
    <GlowStickyCTA T={T} label="Checkout" sub="₾126" onClick={() => {}} />
  </div>
);
