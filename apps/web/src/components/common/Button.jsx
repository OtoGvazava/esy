// Reusable button component with consistent styling
import React from 'react';
import { Button as MuiButton } from '@mui/material';
import { useTheme } from '../../hooks/useTheme';

const Button = ({ 
  variant = 'primary', 
  children, 
  startIcon, 
  endIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  size = 'medium',
  onClick,
  sx = {},
  ...props 
}) => {
  const theme = useTheme();
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          ...theme.buttonStyles.primary,
          color: 'white',
          fontWeight: 600,
        };
      case 'glass':
        return {
          ...theme.buttonStyles.glass,
          color: 'inherit',
        };
      case 'outlined':
        return {
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255,255,255,0.2)' 
            : '1px solid rgba(0,0,0,0.2)',
          color: 'inherit',
          background: 'transparent',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.05)' 
              : 'rgba(0,0,0,0.05)',
          },
        };
      default:
        return {};
    }
  };

  return (
    <MuiButton
      variant={variant === 'primary' ? 'contained' : 'outlined'}
      startIcon={startIcon}
      endIcon={endIcon}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      size={size}
      onClick={onClick}
      sx={{
        textTransform: 'none',
        borderRadius: 2,
        py: size === 'large' ? 1.5 : 1,
        px: size === 'large' ? 3 : 2,
        ...getVariantStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </MuiButton>
  );
};

export default Button;

