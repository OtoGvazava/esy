// ProfileGate — full-screen blocking prompt shown right after sign-in until the
// mandatory profile (name/surname/DOB) is complete. No props; reads useAuth()
// internally. The preview provider's AuthProvider starts signed-out (real
// Google OAuth only), so `loading || !isAuthenticated` is true and the
// component's own guard returns null before rendering anything. Honest
// render: empty. There is no signed-in-but-incomplete-profile state reachable
// without faking auth, which this brief forbids. See
// .design-sync/learnings/batch-forms.md.
import React from 'react';
import { ProfileGate, glowTokens } from 'esy';

const T = glowTokens(false);
const Frame = ({ children }: any) => (
  <div style={{ width: 460, minHeight: 120, background: T.bg }}>{children}</div>
);

export const SignedIn = () => (
  <Frame>
    <ProfileGate />
  </Frame>
);
