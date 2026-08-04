// ProfileMenu — radial quick-actions overlay opened from the navbar avatar.
// Menu items differ signed-in (account/orders/logout) vs guest (sign in only).
import React from 'react';
import { ProfileMenu } from 'esy';

const noop = () => {};

export const SignedIn = () => (
  <ProfileMenu
    open
    onClose={noop}
    onAccountClick={noop}
    onOrdersClick={noop}
    onAuthModalOpen={noop}
    user={{ firstName: 'Nino', lastName: 'Kapanadze' }}
    isAuthenticated
    themeMode="light"
    onToggleTheme={noop}
    language="en"
    onToggleLanguage={noop}
  />
);

export const Guest = () => (
  <ProfileMenu
    open
    onClose={noop}
    onAccountClick={noop}
    onOrdersClick={noop}
    onAuthModalOpen={noop}
    user={null}
    isAuthenticated={false}
    themeMode="light"
    onToggleTheme={noop}
    language="en"
    onToggleLanguage={noop}
  />
);
