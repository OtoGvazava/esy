// ViewModeToggle — floating admin/client view switch shown to store owners.
// Reads `isOwner` from useOwnerTools(); OwnerToolsProvider is wrapped HERE
// rather than in the global preview provider, because it also renders this
// same toggle as global chrome and would stamp it onto every other card.
// position:fixed → the transform wrapper keeps it inside this card.
import React from 'react';
import { ViewModeToggle, OwnerToolsProvider, glowTokens } from 'esy';

const T = glowTokens(false);

export const Default = () => (
  <OwnerToolsProvider>
    <div style={{
      position: 'relative', transform: 'translateZ(0)',
      width: 420, height: 140, overflow: 'hidden',
      background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12,
    }}>
      <ViewModeToggle />
    </div>
  </OwnerToolsProvider>
);
