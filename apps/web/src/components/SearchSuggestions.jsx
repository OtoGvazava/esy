import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useIslandStyles } from '../styles/islandStyles';

const SearchSuggestions = ({ 
  suggestions = [], 
  onSuggestionClick, 
  searchQuery = "",
  sx = {} 
}) => {
  const theme = useTheme();
  const islandStyles = useIslandStyles();

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
      'serum'
    ];

    const filtered = allSuggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5); // Show max 5 suggestions

    // If no matches, show some general suggestions
    if (filtered.length === 0 && query.length > 0) {
      return allSuggestions.slice(0, 5);
    }

    return filtered;
  };

  const filteredSuggestions = getSuggestions(searchQuery);

  // Always show suggestions when there's a query, even if empty
  if (!searchQuery || searchQuery.length === 0) return null;

  return (
    <Box
      sx={{
        maxHeight: 200,
        overflow: 'hidden',
        width: '100%',
        ...sx
      }}
    >
      {filteredSuggestions.length > 0 ? filteredSuggestions.map((suggestion, index) => (
        <Box
          key={index}
          onClick={() => onSuggestionClick && onSuggestionClick(suggestion)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 3,
            py: 1.5,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
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
        // Fallback suggestions when no matches
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 3,
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
  );
};

export default SearchSuggestions;
