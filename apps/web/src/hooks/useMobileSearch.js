import { useState, useEffect, useCallback } from 'react';

export const useMobileSearch = () => {
  const [mobileSearchEnabled, setMobileSearchEnabled] = useState(false);

  const handleMobileSearchToggle = useCallback((enabled) => {
    setMobileSearchEnabled(enabled);
  }, []);

  // Disable mobile search on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (mobileSearchEnabled) {
        setMobileSearchEnabled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileSearchEnabled]);

  // Disable mobile search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileSearchEnabled) {
        const header = document.querySelector('[data-header-container]');
        const searchButton = document.querySelector('[data-search-button]');
        const searchInput = document.querySelector('input[aria-label="search"]');
        
        if (header && !header.contains(event.target) && 
            (!searchButton || !searchButton.contains(event.target)) &&
            (!searchInput || !searchInput.contains(event.target))) {
          setMobileSearchEnabled(false);
        }
      }
    };

    if (mobileSearchEnabled) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [mobileSearchEnabled]);

  return {
    mobileSearchEnabled,
    handleMobileSearchToggle,
    setMobileSearchEnabled,
  };
};
