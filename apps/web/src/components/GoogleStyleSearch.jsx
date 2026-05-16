import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  InputBase, 
  IconButton, 
  Typography, 
  useTheme,
  Paper,
  Fade
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';
import { useIslandStyles } from '../styles/islandStyles';

const GoogleStyleSearch = ({ 
  searchQuery = "", 
  onSearchChange, 
  onSearchSubmit,
  placeholder = "Search products...",
  disabled = false,
  showSuggestions = true,
  actionButtons = null,
  sx = {} 
}) => {
  const { t } = useTranslation('navbar');
  const theme = useTheme();
  const islandStyles = useIslandStyles();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Mock suggestions based on search query
  const getSuggestions = (query) => {
    if (!query || query.length < 1) return [];
    
    const allSuggestions = [
      'mascara',
      'lipstick',
      'foundation',
      'eyeshadow',
      'blush',
      'concealer',
      'primer',
      'setting spray',
      'eyeliner',
      'lip gloss',
      'highlighter',
      'bronzer',
      'face powder',
      'makeup brushes',
      'skincare routine',
      'anti-aging cream',
      'moisturizer',
      'cleanser',
      'toner',
      'serum',
      'vitamin c serum',
      'retinol cream',
      'sunscreen',
      'face mask',
      'exfoliator'
    ];

    const filtered = allSuggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10); // Show max 10 suggestions like Google

    // If no matches, show some general suggestions
    if (filtered.length === 0 && query.length > 0) {
      return allSuggestions.slice(0, 5);
    }

    return filtered;
  };

  const filteredSuggestions = getSuggestions(searchQuery);

  // Show dropdown when focused and has query
  useEffect(() => {
    setShowDropdown(isFocused && searchQuery && searchQuery.length > 0 && showSuggestions);
  }, [isFocused, searchQuery, showSuggestions]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

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
    setShowDropdown(false);
    // Focus back to input after selecting suggestion
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (onSearchSubmit) {
        onSearchSubmit(searchQuery);
      }
      setShowDropdown(false);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Delay hiding dropdown to allow clicking on suggestions
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
    }, 150);
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 1400,
        ...sx
      }}
    >
      {/* Main Search Container */}
      <Box
        sx={{
          ...islandStyles.container,
          ...islandStyles.gradientOverlay,
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          px: 0,
          border: isFocused 
            ? `1px solid rgba(99, 102, 241, 0.5)` 
            : islandStyles.container.border,
          boxShadow: isFocused 
            ? theme.palette.mode === 'dark' 
              ? '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(99, 102, 241, 0.3)' 
              : '0 12px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(99, 102, 241, 0.2)'
            : islandStyles.container.boxShadow,
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-2px)',
            border: `1px solid rgba(99, 102, 241, 0.5)`,
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(99, 102, 241, 0.3)' 
              : '0 12px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(99, 102, 241, 0.2)',
          }
        }}
      >
        {/* Search Icon */}
        <Box sx={{ 
          ...islandStyles.content,
          display: 'flex', 
          alignItems: 'center', 
          ml: 2,
          color: 'inherit',
          opacity: 0.7
        }}>
          <SearchIcon />
        </Box>

        {/* Search Input */}
        <InputBase
          ref={inputRef}
          placeholder={placeholder || t('searchPlaceholder')}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          inputProps={{ "aria-label": "search" }}
          disabled={disabled}
          sx={{ 
            color: "inherit",
            width: '100%', 
            flex: 1,
            fontSize: { xs: "1.1rem", sm: "1.2rem" },
            fontWeight: 400,
            opacity: disabled ? 0.5 : 1,
            px: 1,
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
        {Boolean(searchQuery) && (
          <IconButton
            size="small"
            aria-label="Clear search"
            onClick={handleClear}
            sx={{
              color: "inherit",
              mr: 1,
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

        {/* Action Buttons */}
        {actionButtons && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            mr: 1,
            borderLeft: `1px solid ${theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.1)' 
              : 'rgba(0,0,0,0.1)'}`,
            pl: 1
          }}>
            {actionButtons}
          </Box>
        )}
      </Box>

      {/* Search Suggestions Dropdown */}
      <Fade in={showDropdown} timeout={200}>
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 0.5,
            borderRadius: 2,
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(18,18,20,0.95)' 
              : 'rgba(255,255,255,0.95)',
            backdropFilter: 'saturate(200%) blur(25px)',
            WebkitBackdropFilter: 'saturate(200%) blur(25px)',
            border: `1px solid ${theme.palette.mode === 'dark' 
              ? 'rgba(99, 102, 241, 0.3)' 
              : 'rgba(99, 102, 241, 0.2)'}`,
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(99, 102, 241, 0.2)' 
              : '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(99, 102, 241, 0.1)',
            maxHeight: 300,
            overflow: 'hidden',
            zIndex: 1000,
            display: showDropdown ? 'block' : 'none'
          }}
        >
          {filteredSuggestions.length > 0 ? filteredSuggestions.map((suggestion, index) => (
            <Box
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
                borderBottom: index < filteredSuggestions.length - 1 
                  ? `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.1)' 
                      : 'rgba(0,0,0,0.1)'}`
                  : 'none',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(99, 102, 241, 0.1)' 
                    : 'rgba(99, 102, 241, 0.05)',
                },
                '&:last-child': {
                  borderBottom: 'none',
                }
              }}
            >
              <SearchIcon 
                sx={{ 
                  fontSize: '1rem', 
                  opacity: 0.6,
                  color: theme.palette.mode === 'dark' ? '#f5f5f7' : '#111',
                  flexShrink: 0
                }} 
              />
              <Typography
                sx={{
                  fontSize: '1rem',
                  color: theme.palette.mode === 'dark' ? '#f5f5f7' : '#111',
                  fontWeight: 400,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {suggestion}
              </Typography>
            </Box>
          )) : (
            // Fallback when no matches
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                opacity: 0.6,
                width: '100%',
              }}
            >
          <SearchIcon 
            sx={{ 
              fontSize: '1rem', 
              opacity: 0.6,
              color: theme.palette.mode === 'dark' ? '#f5f5f7' : '#111',
              flexShrink: 0
            }} 
          />
          <Typography
            sx={{
              fontSize: '1rem',
              color: theme.palette.mode === 'dark' ? '#f5f5f7' : '#111',
              fontWeight: 400,
              flex: 1,
            }}
          >
                No suggestions found
              </Typography>
            </Box>
          )}
        </Box>
      </Fade>
    </Box>
  );
};

export default GoogleStyleSearch;
