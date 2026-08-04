// FloatingContacts — left-side WhatsApp/Messenger FABs. position:fixed, so it
// needs a local containing block (transform wrapper) to stay inside the card.
// Must pass profileMenuOpen={false} — the component returns null when true.
import React from 'react';
import { FloatingContacts, glowTokens } from 'esy';

const T = glowTokens(false);
const Frame = ({ children }: any) => (
  <div
    style={{
      position: 'relative',
      transform: 'translateZ(0)',
      width: 760,
      height: 340,
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
    <FloatingContacts profileMenuOpen={false} />
  </Frame>
);
