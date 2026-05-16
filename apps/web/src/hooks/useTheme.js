// Custom hook for theme utilities
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { colors, glassMorphism, buttonStyles, cardStyles, textGradient } from '../styles/theme';

export const useTheme = () => {
  const theme = useMuiTheme();
  
  return {
    ...theme,
    colors,
    glassMorphism: glassMorphism(theme),
    buttonStyles: {
      primary: buttonStyles.primary,
      glass: buttonStyles.glass(theme),
    },
    cardStyles: cardStyles(theme),
    textGradient,
  };
};

