// OwnerBar — inline owner action bar (add product / settings / manage orders),
// shown only to users who can manage the current store. Reads `canManage` from
// useOwnerTools(); OwnerToolsProvider is wrapped HERE rather than in the global
// preview provider, because it also renders global owner chrome (the
// ViewModeToggle pill) that would otherwise appear on every other card.
import React from 'react';
import { OwnerBar, OwnerToolsProvider, glowTokens } from 'esy';

const T = glowTokens(false);

export const Default = () => (
  <OwnerToolsProvider>
    <div style={{
      padding: 16, border: `1px solid ${T.border}`, borderRadius: 12,
      minHeight: 48, display: 'flex', alignItems: 'center', background: T.bg,
    }}>
      <OwnerBar />
    </div>
  </OwnerToolsProvider>
);
