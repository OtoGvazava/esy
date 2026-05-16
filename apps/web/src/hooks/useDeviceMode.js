import { useDevice } from '../contexts/DeviceContext';

/**
 * Custom hook for device mode logic
 * Provides easy access to device-specific configurations and helpers
 */
export const useDeviceMode = () => {
  const device = useDevice();

  return {
    // Device mode
    mode: device.deviceMode,
    isMobile: device.isMobile,
    isTablet: device.isTablet,
    isDesktop: device.isDesktop,
    
    // Helper functions
    isDeviceMode: device.isDeviceMode,
    isMobileOrTablet: device.isMobileOrTablet,
    isDesktopOrTablet: device.isDesktopOrTablet,
    
    // UI Configuration
    shouldShowMobileFooter: device.config.showMobileFooter,
    shouldShowFloatingContacts: device.config.showFloatingContacts,
    shouldShowFloatingCart: device.config.showFloatingCart,
    shouldShowNavbarButtons: device.config.showNavbarButtons,
    shouldShowSearchIcon: device.config.showSearchIcon,
    shouldShowClearButton: device.config.showClearButton,
    shouldShowLanguageToggle: device.config.showLanguageToggle,
    shouldShowThemeToggle: device.config.showThemeToggle,
    shouldShowAccountButton: device.config.showAccountButton,
    
    // Menu Configuration
    maxMenuItemsPerRow: device.config.maxMenuItemsPerRow,
    menuItemSize: device.config.menuItemSize,
    
    // Layout Configuration
    containerPadding: device.config.containerPadding,
    searchFieldWidth: device.config.searchFieldWidth,
    
    // Constants
    DEVICE_MODES: device.DEVICE_MODES,
    BREAKPOINTS: device.BREAKPOINTS
  };
};

export default useDeviceMode;
