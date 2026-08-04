// FloatingCart — bottom-right floating cart FAB with an item-count badge.
// position:fixed, so it needs a local containing block (transform wrapper) to
// stay inside the card instead of escaping to the capture viewport. Cart
// starts empty (fresh CartProvider per capture, and the preview brief scopes
// imports to 'esy' only, so there is no way to seed items from here) — the
// badge is legitimately absent at 0 items.
import React from 'react';
import { FloatingCart, glowTokens } from 'esy';

const T = glowTokens(false);
const Frame = ({ children }: any) => (
  <div
    style={{
      position: 'relative',
      transform: 'translateZ(0)',
      width: 760,
      height: 320,
      overflow: 'hidden',
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
    }}
  >
    {children}
  </div>
);

export const Default = () => (
  <Frame>
    <FloatingCart onCartToggle={() => {}} />
  </Frame>
);
