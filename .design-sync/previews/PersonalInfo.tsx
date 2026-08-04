// PersonalInfo — account-page cards for profile (name/surname/DOB) and phone.
// No props; reads useAuth() internally. The preview provider's AuthProvider
// starts signed-out (real Google OAuth only — the documented dev-login was
// removed, see memory), so `user` stays null and the component's own
// `if (!user) return null` guard fires immediately. This is the honest
// render for this provider: empty. See .design-sync/learnings/batch-forms.md.
import React from 'react';
import { PersonalInfo, glowTokens } from 'esy';

const T = glowTokens(false);
const Frame = ({ children }: any) => (
  <div style={{ width: 460, minHeight: 40, background: T.bg }}>{children}</div>
);

export const SignedIn = () => (
  <Frame>
    <PersonalInfo />
  </Frame>
);
