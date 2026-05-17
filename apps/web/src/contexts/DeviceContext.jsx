/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

// Device mode constants
export const DEVICE_MODES = {
  DESKTOP: 'desktop',
  TABLET: 'tablet',
  MOBILE: 'mobile',
};

// Breakpoint definitions
export const BREAKPOINTS = {
  MOBILE_MAX: 768,    // 0-768px: Mobile
  TABLET_MAX: 1024,   // 769-1024px: Tablet
  // 1025px+: Desktop
};

const DeviceContext = createContext();

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};

export const DeviceProvider = ({ children }) => {
  // eslint-disable-next-line no-unused-vars
  const theme = useTheme();
  
  // Media queries for different device modes
  const isMobile = useMediaQuery(`(max-width:${BREAKPOINTS.MOBILE_MAX}px)`);
  const isTablet = useMediaQuery(`(min-width:${BREAKPOINTS.MOBILE_MAX + 1}px) and (max-width:${BREAKPOINTS.TABLET_MAX}px)`);
  const isDesktop = useMediaQuery(`(min-width:${BREAKPOINTS.TABLET_MAX + 1}px)`);
  
  // Determine current device mode
  const getDeviceMode = () => {
    if (isMobile) return DEVICE_MODES.MOBILE;
    if (isTablet) return DEVICE_MODES.TABLET;
    if (isDesktop) return DEVICE_MODES.DESKTOP;
    return DEVICE_MODES.DESKTOP; // fallback
  };

  const [deviceMode, setDeviceMode] = useState(getDeviceMode());

  // Update device mode when breakpoints change
  useEffect(() => {
    setDeviceMode(getDeviceMode());
  }, [isMobile, isTablet, isDesktop]);

  // Device-specific configurations
  const deviceConfig = {
    [DEVICE_MODES.MOBILE]: {
      showMobileFooter: true,
      showFloatingContacts: false,
      showFloatingCart: false,
      showNavbarButtons: false,
      showSearchIcon: true,
      showClearButton: true,
      showLanguageToggle: false,
      showThemeToggle: false,
      showAccountButton: false,
      maxMenuItemsPerRow: 3,
      menuItemSize: 'small',
      containerPadding: { xs: 2, sm: 3 },
      searchFieldWidth: '100%',
    },
    [DEVICE_MODES.TABLET]: {
      showMobileFooter: false,
      showFloatingContacts: true,
      showFloatingCart: true,
      showNavbarButtons: true,
      showSearchIcon: true,
      showClearButton: true,
      showLanguageToggle: true,
      showThemeToggle: true,
      showAccountButton: true,
      maxMenuItemsPerRow: 4,
      menuItemSize: 'medium',
      containerPadding: { xs: 3, sm: 4 },
      searchFieldWidth: '80%',
    },
    [DEVICE_MODES.DESKTOP]: {
      showMobileFooter: false,
      showFloatingContacts: true,
      showFloatingCart: true,
      showNavbarButtons: true,
      showSearchIcon: true,
      showClearButton: true,
      showLanguageToggle: true,
      showThemeToggle: true,
      showAccountButton: true,
      maxMenuItemsPerRow: 5,
      menuItemSize: 'large',
      containerPadding: { xs: 4, sm: 5 },
      searchFieldWidth: '70%',
    },
  };

  const currentConfig = deviceConfig[deviceMode];

  // Helper functions
  const isDeviceMode = (mode) => deviceMode === mode;
  const isMobileOrTablet = () => isMobile || isTablet;
  const isDesktopOrTablet = () => isDesktop || isTablet;

  const value = {
    // Device mode
    deviceMode,
    isMobile,
    isTablet,
    isDesktop,
    
    // Helper functions
    isDeviceMode,
    isMobileOrTablet,
    isDesktopOrTablet,
    
    // Configuration
    config: currentConfig,
    
    // Constants
    DEVICE_MODES,
    BREAKPOINTS,
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
};

export default DeviceProvider;
