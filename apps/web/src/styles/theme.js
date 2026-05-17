// Centralized theme utilities and common styles
// eslint-disable-next-line no-unused-vars
import { createTheme } from '@mui/material/styles';

// Common color palette
export const colors = {
  primary: {
    main: '#6366f1',
    light: '#8b5cf6',
    dark: '#4f46e5',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    primaryHover: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    background: {
      light: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
      dark: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(45,45,45,0.95) 100%)',
    },
  },
  glass: {
    light: 'rgba(255,255,255,0.7)',
    dark: 'rgba(18,18,20,0.7)',
  },
};

// Common glass morphism styles
export const glassMorphism = (theme) => ({
  background: theme.palette.mode === 'dark' 
    ? colors.glass.dark 
    : colors.glass.light,
  backdropFilter: 'saturate(200%) blur(25px)',
  WebkitBackdropFilter: 'saturate(200%) blur(25px)',
  border: theme.palette.mode === 'dark' 
    ? '1px solid rgba(255,255,255,0.2)' 
    : '1px solid rgba(255,255,255,0.3)',
  boxShadow: theme.palette.mode === 'dark' 
    ? '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' 
    : '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
});

// Common button styles
export const buttonStyles = {
  primary: {
    background: colors.gradients.primary,
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
    border: 'none',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: colors.gradients.primaryHover,
      boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
  glass: (theme) => ({
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.05)',
    border: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.2)'
      : '1px solid rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.2)'
        : 'rgba(0, 0, 0, 0.1)',
      transform: 'scale(1.05)',
    },
  }),
};

// Common card styles
export const cardStyles = (theme) => ({
  borderRadius: 3,
  overflow: 'hidden',
  border: theme.palette.mode === 'dark'
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(0, 0, 0, 0.08)',
  background: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
    : '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.2)'
      : '0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
  },
});

// Text gradient styles
export const textGradient = {
  background: colors.gradients.primary,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
};

// Animation keyframes
export const animations = {
  fadeInUp: {
    '@keyframes fadeInUp': {
      '0%': {
        opacity: 0,
        transform: 'translateY(20px)',
      },
      '100%': {
        opacity: 1,
        transform: 'translateY(0)',
      },
    },
  },
  shimmer: {
    '@keyframes shimmer': {
      '0%': {
        backgroundPosition: '-200% 0',
      },
      '100%': {
        backgroundPosition: '200% 0',
      },
    },
  },
};

// Responsive breakpoints
export const breakpoints = {
  mobile: '(max-width: 599px)',
  tablet: '(max-width: 959px)',
  desktop: '(min-width: 960px)',
};

