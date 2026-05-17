import { useMemo } from 'react';
import { useDevice } from '../contexts/DeviceContext';
import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Custom hook for responsive product card dimensions
 * Provides optimized card sizes based on device mode and screen dimensions
 */
export const useProductCardDimensions = () => {
  const { deviceMode, isMobile, isTablet, isDesktop } = useDevice();
  // eslint-disable-next-line no-unused-vars
  const theme = useTheme();
  
  // Additional breakpoints for fine-tuning
  const isSmallMobile = useMediaQuery('(max-width: 480px)');
  const isLargeMobile = useMediaQuery('(min-width: 481px) and (max-width: 768px)');
  const isSmallTablet = useMediaQuery('(min-width: 769px) and (max-width: 900px)');
  const isLargeTablet = useMediaQuery('(min-width: 901px) and (max-width: 1024px)');
  const isSmallDesktop = useMediaQuery('(min-width: 1025px) and (max-width: 1440px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1441px)');

  const dimensions = useMemo(() => {
    // Fine-tuned configurations for different screen sizes - optimized for maximum horizontal space utilization
    if (isSmallMobile) {
      return {
        width: 180,        // Significantly increased from 150 to 180
        height: 240,       // Increased from 200 to 240 (20% taller)
        imageHeight: 150,  // Increased from 130 to 150 (62% of card height)
        padding: 1,        // Reduced from 1.2 to 1
        titleFontSize: '0.75rem',  // Reduced from 0.8rem
        priceFontSize: '1rem',     // Reduced from 1.1rem
        buttonSize: 'small',
        borderRadius: 1.5,
        spacing: 0.8,      // Reduced from 1.2 to 0.8
        buttonHeight: 28,  // Custom smaller button height
        contentPadding: 0.8, // Reduced content padding
      };
    }
    
    if (isLargeMobile) {
      return {
        width: 200,        // Significantly increased from 170 to 200
        height: 260,       // Increased from 220 to 260 (18% taller)
        imageHeight: 160,  // Increased from 140 to 160 (61% of card height)
        padding: 1.2,      // Reduced from 1.5 to 1.2
        titleFontSize: '0.85rem',  // Reduced from 0.9rem
        priceFontSize: '1.1rem',   // Reduced from 1.2rem
        buttonSize: 'small',
        borderRadius: 2,
        spacing: 1.2,      // Reduced from 1.5 to 1.2
        buttonHeight: 32,  // Custom button height
        contentPadding: 1.2,
      };
    }
    
    if (isSmallTablet) {
      return {
        width: 240,        // Significantly increased from 210 to 240
        height: 320,       // Increased from 280 to 320 (14% taller)
        imageHeight: 190,  // Increased from 170 to 190 (59% of card height)
        padding: 1.5,      // Reduced from 1.8 to 1.5
        titleFontSize: '0.9rem',   // Reduced from 0.95rem
        priceFontSize: '1.25rem',  // Reduced from 1.3rem
        buttonSize: 'medium',
        borderRadius: 2.2,
        spacing: 1.5,      // Reduced from 1.8 to 1.5
        buttonHeight: 36,
        contentPadding: 2.0,  // Increased to accommodate text buttons
      };
    }
    
    if (isLargeTablet) {
      return {
        width: 260,        // Significantly increased from 230 to 260
        height: 340,       // Increased from 300 to 340 (13% taller)
        imageHeight: 200,  // Increased from 180 to 200 (59% of card height)
        padding: 1.8,      // Reduced from 2 to 1.8
        titleFontSize: '0.95rem',  // Reduced from 1rem
        priceFontSize: '1.35rem',  // Reduced from 1.4rem
        buttonSize: 'medium',
        borderRadius: 2.5,
        spacing: 1.8,      // Reduced from 2 to 1.8
        buttonHeight: 38,
        contentPadding: 2.2,  // Increased to accommodate text buttons
      };
    }
    
    if (isSmallDesktop) {
      return {
        width: 300,        // Significantly increased from 270 to 300
        height: 400,       // Increased from 360 to 400 (11% taller)
        imageHeight: 220,  // Increased from 200 to 220 (55% of card height)
        padding: 2,        // Reduced from 2.2 to 2
        titleFontSize: '1rem',     // Reduced from 1.05rem
        priceFontSize: '1.4rem',   // Reduced from 1.45rem
        buttonSize: 'medium',
        borderRadius: 2.8,
        spacing: 2,        // Reduced from 2.2 to 2
        buttonHeight: 40,
        contentPadding: 2.3,  // Increased to accommodate text buttons
      };
    }
    
    if (isLargeDesktop) {
      return {
        width: 340,        // Significantly increased from 310 to 340
        height: 440,       // Increased from 400 to 440 (10% taller)
        imageHeight: 260,  // Increased from 240 to 260 (59% of card height)
        padding: 2.2,      // Reduced from 2.5 to 2.2
        titleFontSize: '1.05rem',  // Reduced from 1.1rem
        priceFontSize: '1.45rem',  // Reduced from 1.5rem
        buttonSize: 'medium',
        borderRadius: 3,
        spacing: 2.2,      // Reduced from 2.5 to 2.2
        buttonHeight: 42,
        contentPadding: 2.5,  // Increased to accommodate text buttons
      };
    }

    // Fallback configurations based on device mode - optimized for maximum horizontal space utilization
    const baseConfig = {
      mobile: {
        width: 200,        // Significantly increased from 170 to 200
        height: 220,
        imageHeight: 140,  // Increased from 120
        padding: 1.2,      // Reduced from 1.5
        titleFontSize: '0.85rem',  // Reduced from 0.9rem
        priceFontSize: '1.1rem',   // Reduced from 1.2rem
        buttonSize: 'small',
        borderRadius: 2,
        spacing: 1.2,      // Reduced from 1.5
        buttonHeight: 32,
        contentPadding: 1.2,
      },
      tablet: {
        width: 260,        // Significantly increased from 230 to 260
        height: 300,
        imageHeight: 180,  // Increased from 160
        padding: 1.8,      // Reduced from 2
        titleFontSize: '0.95rem',  // Reduced from 1rem
        priceFontSize: '1.35rem',  // Reduced from 1.4rem
        buttonSize: 'medium',
        borderRadius: 2.5,
        spacing: 1.8,      // Reduced from 2
        buttonHeight: 38,
        contentPadding: 2.2,  // Increased to accommodate larger buttons
      },
      desktop: {
        width: 320,        // Significantly increased from 290 to 320
        height: 380,
        imageHeight: 220,  // Increased from 200
        padding: 2.2,      // Reduced from 2.5
        titleFontSize: '1.05rem',  // Reduced from 1.1rem
        priceFontSize: '1.45rem',  // Reduced from 1.5rem
        buttonSize: 'medium',
        borderRadius: 3,
        spacing: 2.2,      // Reduced from 2.5
        buttonHeight: 42,
        contentPadding: 2.5,  // Increased to accommodate larger buttons
      },
    };

    // Return appropriate config based on device mode
    switch (deviceMode) {
      case 'mobile':
        return baseConfig.mobile;
      case 'tablet':
        return baseConfig.tablet;
      case 'desktop':
      default:
        return baseConfig.desktop;
    }
  }, [deviceMode, isSmallMobile, isLargeMobile, isSmallTablet, isLargeTablet, isSmallDesktop, isLargeDesktop]);

  // Grid configuration for different screen sizes
  const gridConfig = useMemo(() => {
    // Fine-tuned grid configurations based on screen size - optimized for maximum space utilization
    if (isSmallMobile) {
      return {
        xs: 4,    // 3 cards per row on very small mobile
        sm: 3,    // 4 cards per row on small mobile
        md: 2.4,  // 5 cards per row on medium
        lg: 2,    // 6 cards per row on large
        xl: 1.7,   // 7 cards per row on extra large
      };
    }
    
    if (isLargeMobile) {
      return {
        xs: 3,    // 4 cards per row on large mobile
        sm: 2.4,  // 5 cards per row on small screens
        md: 2,    // 6 cards per row on medium screens
        lg: 1.7,  // 7 cards per row on large screens
        xl: 1.5,   // 8 cards per row on extra large screens
      };
    }
    
    if (isSmallTablet) {
      return {
        xs: 2.4,  // 5 cards per row on small tablet
        sm: 2,    // 6 cards per row on small screens
        md: 1.7,  // 7 cards per row on medium screens
        lg: 1.5,  // 8 cards per row on large screens
        xl: 1.2,   // 10 cards per row on extra large screens
      };
    }
    
    if (isLargeTablet) {
      return {
        xs: 2,    // 6 cards per row on large tablet
        sm: 1.7,  // 7 cards per row on small screens
        md: 1.5,  // 8 cards per row on medium screens
        lg: 1.2,  // 10 cards per row on large screens
        xl: 1,     // 12 cards per row on extra large screens
      };
    }
    
    if (isSmallDesktop) {
      return {
        xs: 1.7,  // 7 cards per row on small desktop
        sm: 1.5,  // 8 cards per row on small screens
        md: 1.2,  // 10 cards per row on medium screens
        lg: 1,    // 12 cards per row on large screens
        xl: 0.8,   // 15 cards per row on extra large screens
      };
    }
    
    if (isLargeDesktop) {
      return {
        xs: 1.5,  // 8 cards per row on large desktop
        sm: 1.2,  // 10 cards per row on small screens
        md: 1,    // 12 cards per row on medium screens
        lg: 0.8,  // 15 cards per row on large screens
        xl: 0.6,   // 20 cards per row on extra large screens
      };
    }

    // Fallback configurations based on device mode - optimized for maximum space utilization
    if (isMobile) {
      return {
        xs: 3,    // 4 cards per row on mobile
        sm: 2.4,  // 5 cards per row on small screens
        md: 2,    // 6 cards per row on medium screens
        lg: 1.7,  // 7 cards per row on large screens
        xl: 1.5,   // 8 cards per row on extra large screens
      };
    } else if (isTablet) {
      return {
        xs: 2.4,  // 5 cards per row on tablet
        sm: 2,    // 6 cards per row on small screens
        md: 1.7,  // 7 cards per row on medium screens
        lg: 1.5,  // 8 cards per row on large screens
        xl: 1.2,   // 10 cards per row on extra large screens
      };
    } else {
      // Desktop
      return {
        xs: 2,    // 6 cards per row on desktop
        sm: 1.7,  // 7 cards per row on small screens
        md: 1.5,  // 8 cards per row on medium screens
        lg: 1.2,  // 10 cards per row on large screens
        xl: 1,     // 12 cards per row on extra large screens
      };
    }
  }, [isMobile, isTablet, isDesktop, isSmallMobile, isLargeMobile, isSmallTablet, isLargeTablet, isSmallDesktop, isLargeDesktop]);

  // Container spacing based on device - horizontal spacing with vertical being 2x horizontal
  const containerSpacing = useMemo(() => {
    if (isSmallMobile) return [0.5, 1]; // [horizontal, vertical] - reduced horizontal spacing
    if (isLargeMobile) return [0.8, 1.6]; // [horizontal, vertical] - reduced horizontal spacing
    if (isSmallTablet) return [1, 2]; // [horizontal, vertical] - reduced horizontal spacing
    if (isLargeTablet) return [1.2, 2.4]; // [horizontal, vertical] - reduced horizontal spacing
    if (isSmallDesktop) return [1.5, 3]; // [horizontal, vertical] - reduced horizontal spacing
    if (isLargeDesktop) return [1.8, 3.6]; // [horizontal, vertical] - reduced horizontal spacing
    
    // Fallback
    if (isMobile) return [0.8, 1.6]; // [horizontal, vertical] - reduced horizontal spacing
    if (isTablet) return [1.2, 2.4]; // [horizontal, vertical] - reduced horizontal spacing
    return [1.8, 3.6]; // [horizontal, vertical] - reduced horizontal spacing
  }, [isMobile, isTablet, isDesktop, isSmallMobile, isLargeMobile, isSmallTablet, isLargeTablet, isSmallDesktop, isLargeDesktop]);

  // Additional utility functions for optimization
  const getOptimalCardCount = useMemo(() => {
    // Calculate optimal number of cards to show based on screen size
    if (isSmallMobile) return 4; // Show fewer cards on small screens
    if (isLargeMobile) return 6;
    if (isSmallTablet) return 8;
    if (isLargeTablet) return 10;
    if (isSmallDesktop) return 12;
    if (isLargeDesktop) return 15;
    
    // Fallback
    if (isMobile) return 6;
    if (isTablet) return 10;
    return 12;
  }, [isMobile, isTablet, isDesktop, isSmallMobile, isLargeMobile, isSmallTablet, isLargeTablet, isSmallDesktop, isLargeDesktop]);

  const getImageQuality = useMemo(() => {
    // Determine image quality based on screen size and pixel density
    if (isSmallMobile) return 'low';
    if (isLargeMobile) return 'medium';
    if (isSmallTablet) return 'medium';
    if (isLargeTablet) return 'high';
    if (isSmallDesktop) return 'high';
    if (isLargeDesktop) return 'ultra';
    
    // Fallback
    if (isMobile) return 'medium';
    if (isTablet) return 'high';
    return 'high';
  }, [isMobile, isTablet, isDesktop, isSmallMobile, isLargeMobile, isSmallTablet, isLargeTablet, isSmallDesktop, isLargeDesktop]);

  const getAnimationSettings = useMemo(() => {
    // Optimize animations based on device capabilities
    if (isSmallMobile) {
      return {
        enableHover: false,
        enableTransitions: false,
        enableAnimations: false,
      };
    }
    
    if (isLargeMobile || isSmallTablet) {
      return {
        enableHover: true,
        enableTransitions: true,
        enableAnimations: false,
      };
    }
    
    return {
      enableHover: true,
      enableTransitions: true,
      enableAnimations: true,
    };
  }, [isSmallMobile, isLargeMobile, isSmallTablet, isLargeTablet, isSmallDesktop, isLargeDesktop]);

  return {
    dimensions,
    gridConfig,
    containerSpacing,
    deviceMode,
    getOptimalCardCount,
    getImageQuality,
    getAnimationSettings,
    
    // Screen size flags for conditional rendering
    isSmallMobile,
    isLargeMobile,
    isSmallTablet,
    isLargeTablet,
    isSmallDesktop,
    isLargeDesktop,
  };
};

export default useProductCardDimensions;
