// design-sync preview provider — mirrors src/providers/AppProviders.jsx plus a
// MemoryRouter, the app's configured i18n, and the ThemeMode context, so
// components that read app context render inside preview cards.
//
// NOTE: OwnerToolsProvider is deliberately NOT in this chain. It renders global
// owner chrome (<ViewModeToggle/> + the editor dialogs) as siblings of children
// whenever canManageStore is true, which would stamp a floating "Enable client
// view" pill onto every card. The two previews that need it (OwnerBar,
// ViewModeToggle) wrap themselves — it is exported from .ds-entry.mjs for that.
//
// It also re-provides AuthContext with a demo signed-in store owner. Without
// it the harness has no backend, `user` stays null, and every auth-gated
// component (PersonalInfo, ProfileGate, OwnerBar, ViewModeToggle — the last two
// via OwnerTools, whose canManage derives from auth.canManageStore) renders
// nothing. profileComplete is false on purpose so ProfileGate shows its form.
import React, { useContext, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from './src/i18n';
import { DeviceProvider } from './src/contexts/DeviceContext';
import { TenantProvider } from './src/contexts/TenantContext';
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';
import { OrdersProvider } from './src/contexts/OrdersContext';
import { CartProvider } from './src/contexts/CartContext';
import { ThemeModeProvider } from './src/contexts/ThemeModeContext';

const theme = createTheme();

const themeMode = {
  mode: 'light',
  toggle: () => {},
  setMode: () => {},
  language: 'en',
  setLanguage: () => {},
};

const DEMO_USER = {
  id: 1,
  name: 'Nino Beridze',
  firstName: 'Nino',
  lastName: 'Beridze',
  email: 'nino@esy.ge',
  phone: '+995 555 12 34 56',
  role: 'admin',
  ownsCurrentStore: true,
  profileComplete: false,
};

// Spreads the real context value so app-side additions pass through untouched;
// only the identity/permission flags are overridden.
function DemoSignedIn({ children }) {
  const real = useContext(AuthContext);
  const value = useMemo(
    () => ({
      ...real,
      user: DEMO_USER,
      loading: false,
      isAuthenticated: true,
      isAdmin: true,
      isUser: false,
      isStoreOwner: true,
      canManageStore: true,
    }),
    [real],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function GlowPreviewProvider({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <ThemeModeProvider value={themeMode}>
          <DeviceProvider>
            <TenantProvider>
              <AuthProvider>
                <DemoSignedIn>
                  <OrdersProvider>
                    <CartProvider>
                      <ThemeProvider theme={theme}>{children}</ThemeProvider>
                    </CartProvider>
                  </OrdersProvider>
                </DemoSignedIn>
              </AuthProvider>
            </TenantProvider>
          </DeviceProvider>
        </ThemeModeProvider>
      </MemoryRouter>
    </I18nextProvider>
  );
}
