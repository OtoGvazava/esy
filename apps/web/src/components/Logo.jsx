import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { useIslandStyles } from '../styles/islandStyles';

const Logo = ({ onClick, sx = {} }) => {
  const theme = useTheme();
  const islandStyles = useIslandStyles();

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        ...islandStyles.container,
        ...islandStyles.hover,
        ...islandStyles.gradientOverlay,
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 1.5,
        minWidth: { xs: 120, sm: 140, md: 160 },
        maxWidth: { xs: 200, sm: 240, md: 280 },
        ...sx
      }}
    >
      <Box sx={{ ...islandStyles.content }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            lineHeight: 0.9,
            textAlign: 'center',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }
          }}
        >
          esy
        </Typography>
      </Box>
    </Box>
  );
};

export default Logo;
