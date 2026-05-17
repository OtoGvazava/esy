import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import { CssBaseline } from '@mui/material';
import { CartProvider } from '../contexts/CartContext';
import { SavedProvider } from '../contexts/SavedContext';
import { AuthProvider } from '../contexts/AuthContext';
import { OrdersProvider } from '../contexts/OrdersContext';
import { DeviceProvider } from '../contexts/DeviceContext';
import { TenantProvider } from '../contexts/TenantContext';
import ErrorBoundary from '../components/ErrorBoundary';

const AppProviders = ({ children, theme, mode }) => {
  return (
    <ErrorBoundary>
      <DeviceProvider>
        <TenantProvider>
          <AuthProvider>
            <OrdersProvider>
              <CartProvider>
                <SavedProvider>
                  <ThemeProvider theme={theme}>
                    <CssBaseline />
                    {children}
                  </ThemeProvider>
                </SavedProvider>
              </CartProvider>
            </OrdersProvider>
          </AuthProvider>
        </TenantProvider>
      </DeviceProvider>
    </ErrorBoundary>
  );
};

export default AppProviders;
