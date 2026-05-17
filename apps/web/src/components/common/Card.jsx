// Reusable card component with consistent styling
import React from 'react';
import { Card as MuiCard } from '@mui/material';
import { useTheme } from '../../hooks/useTheme';

const Card = ({ 
  children, 
  hover = true,
  sx = {},
  ...props 
}) => {
  const theme = useTheme();
  
  return (
    <MuiCard
      sx={{
        ...theme.cardStyles,
        ...(hover ? {} : {
          '&:hover': {
            transform: 'none',
            boxShadow: theme.cardStyles.boxShadow,
            border: theme.cardStyles.border,
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </MuiCard>
  );
};

export default Card;

