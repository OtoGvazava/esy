import React, { useRef } from 'react';
import { Box, InputBase, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { useIslandStyles } from '../styles/islandStyles';
import SearchSuggestions from './SearchSuggestions';

const SearchIsland = ({ 
  searchQuery = "", 
  onSearchChange, 
  placeholder = "Search products...",
  disabled = false,
  showSuggestions = false,
  sx = {} 
}) => {
  const { t } = useTranslation('navbar');
  const device = useDeviceMode();
  const islandStyles = useIslandStyles();
  const inputRef = useRef(null);

  const handleClear = () => {
    if (onSearchChange) {
      onSearchChange("");
    }
    // Focus back to input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (onSearchChange) {
      onSearchChange(suggestion);
    }
    // Focus back to input after selecting suggestion
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <Box
      sx={{
        ...islandStyles.container,
        ...islandStyles.gradientOverlay,
        px: 0,
        minWidth: { xs: 300, sm: 500, md: 700 },
        maxWidth: { xs: '100%', sm: '95%', md: '90%' },
        flexGrow: 1,
        overflow: 'hidden',
        ...sx
      }}
    >
      <Box sx={{ ...islandStyles.content }}>
        {/* Search Input Section */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          width: '100%',
          px: 3,
          py: 0
        }}>
          {/* Search Icon */}
          {device.shouldShowSearchIcon && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mr: 1.5, 
              color: 'inherit',
              opacity: 0.7
            }}>
              <SearchIcon />
            </Box>
          )}

          {/* Search Input */}
          <InputBase
            ref={inputRef}
            placeholder={placeholder || t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            inputProps={{ "aria-label": "search" }}
            disabled={disabled}
            sx={{ 
              color: "inherit", 
              width: '100%', 
              fontSize: { xs: "1.1rem", sm: "1.2rem" },
              fontWeight: 400,
              opacity: disabled ? 0.5 : 1,
              "& .MuiInputBase-input": {
                "&::placeholder": {
                  opacity: 0.6,
                  fontSize: { xs: "1.1rem", sm: "1.2rem" },
                },
                "&:disabled": {
                  cursor: "not-allowed",
                },
              },
            }}
          />

          {/* Clear Button */}
          {Boolean(searchQuery) && device.shouldShowClearButton && (
            <IconButton
              size="small"
              aria-label="Clear search"
              onClick={handleClear}
              sx={{
                color: "inherit",
                ml: 0.5,
                opacity: 0.7,
                transition: 'opacity 0.2s ease',
                "&:hover": {
                  opacity: 1,
                  backgroundColor: 'transparent',
                }
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        
        {/* Search Suggestions - Integrated */}
        {showSuggestions && device.isMobile && (
          <SearchSuggestions
            searchQuery={searchQuery}
            onSuggestionClick={handleSuggestionClick}
            sx={{ 
              mt: 0,
              borderRadius: 0,
              borderTop: `1px solid ${islandStyles.container.border}`,
              boxShadow: 'none'
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default SearchIsland;
