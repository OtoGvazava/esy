import React from 'react';
import { ThemeProvider } from '@mui/material';
import { CssBaseline } from '@mui/material';
import { CartProvider } from '../contexts/CartContext';
import { AuthProvider } from '../contexts/AuthContext';
import { OrdersProvider } from '../contexts/OrdersContext';
import { DeviceProvider } from '../contexts/DeviceContext';
import { TenantProvider } from '../contexts/TenantContext';
import ErrorBoundary from '../components/ErrorBoundary';

// `mode` is still passed by App.jsx but read from ThemeModeContext instead of
// props, so it is deliberately not destructured here.
const AppProviders = ({ children, theme }) => {
  return (
    <ErrorBoundary>
      <DeviceProvider>
        <TenantProvider>
          <AuthProvider>
            <OrdersProvider>
              <CartProvider>
                <ThemeProvider theme={theme}>
                  <CssBaseline />
                  {children}
                </ThemeProvider>
              </CartProvider>
            </OrdersProvider>
          </AuthProvider>
        </TenantProvider>
      </DeviceProvider>
    </ErrorBoundary>
  );
};

export default AppProviders;
