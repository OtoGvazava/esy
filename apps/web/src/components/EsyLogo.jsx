import React from 'react';
import { Box, useTheme } from '@mui/material';
import darkLogo from '../assets/dark.png';
import lightLogo from '../assets/light.png';

const EsyLogo = ({ onClick, sx = {}, size = 'medium' }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Size variants
  const sizeConfig = {
    small: {
      height: 48,
      maxWidth: 150,
    },
    medium: {
      height: 64,
      maxWidth: 200,
    },
    large: {
      height: 80,
      maxWidth: 250,
    },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  return (
    <Box
      onClick={handleClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-block',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
        },
        ...sx,
      }}
    >
      <Box
        component="img"
        src={isDarkMode ? darkLogo : lightLogo}
        alt="esy logo"
        sx={{
          height: config.height,
          width: 'auto',
          maxWidth: config.maxWidth,
          objectFit: 'contain',
          transition: 'all 0.2s ease',
        }}
      />
    </Box>
  );
};

export default EsyLogo;
