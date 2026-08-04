// DeleteProductDialog — destructive confirm for removing a product; wraps
// GlowModal with a danger CTA.
// GlowModal's root is raw CSS `position:fixed; inset:0` — inside the
// harness's single-story wrapper (transform:translateZ(0), auto/collapsed
// height) that has no definite box to fill and clips short. Fix: nest a
// sized transform:translateZ(0) frame (matching the card's declared
// viewport) as the containing block — same trick as GlowDock/GlowStickyCTA
// (see .design-sync/learnings).
import React from 'react';
import { DeleteProductDialog } from 'esy';

const Frame = ({ children }: any) => (
  <div style={{ position: 'relative', transform: 'translateZ(0)', width: 560, height: 360 }}>
    {children}
  </div>
);

export const Open = () => (
  <Frame>
    <DeleteProductDialog
      open
      product={{ id: 'p1', title: 'Ceramic Pour-Over Set' }}
      onClose={() => {}}
      onDeleted={() => {}}
    />
  </Frame>
);
