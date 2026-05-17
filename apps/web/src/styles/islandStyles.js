import { useTheme } from '@mui/material';

/**
 * Shared island styles for consistent UI components
 * Provides glassmorphism effects and consistent styling
 */
export const useIslandStyles = () => {
  const theme = useTheme();

  return {
    // Base island container styles
    container: {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(18,18,20,0.85)' 
        : 'rgba(255,255,255,0.85)',
      backdropFilter: 'saturate(200%) blur(25px)',
      WebkitBackdropFilter: 'saturate(200%) blur(25px)',
      border: theme.palette.mode === 'dark' 
        ? '1px solid rgba(99, 102, 241, 0.3)' 
        : '1px solid rgba(99, 102, 241, 0.2)',
      boxShadow: theme.palette.mode === 'dark' 
        ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(99, 102, 241, 0.2)' 
        : '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(99, 102, 241, 0.1)',
      borderRadius: 4,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      // Dynamic height for different content types
      minHeight: 64,
      display: 'flex',
      alignItems: 'center',
    },

    // Hover effects for interactive islands
    hover: {
      '&:hover': {
        transform: 'translateY(-2px)',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(18,18,20,0.95)' 
          : 'rgba(255,255,255,0.95)',
        border: theme.palette.mode === 'dark' 
          ? '1px solid rgba(99, 102, 241, 0.5)' 
          : '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(99, 102, 241, 0.3)' 
          : '0 12px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(99, 102, 241, 0.2)',
      },
    },

    // Gradient overlay for hover effects
    gradientOverlay: {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
        opacity: 0,
        transition: 'opacity 0.3s ease',
        zIndex: 0,
      },
      '&:hover::before': {
        opacity: 1,
      },
    },

    // Content positioning for islands with overlays
    content: {
      position: 'relative',
      zIndex: 1,
    },
  };
};

export default useIslandStyles;
