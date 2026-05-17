import React from 'react';
import { Box, Toolbar, IconButton, Tooltip, Button, Menu, MenuItem, Avatar, useTheme, Typography } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDeviceMode } from '../hooks/useDeviceMode';
import Logo from './Logo';
import SearchIsland from './SearchIsland';
import GoogleStyleSearch from './GoogleStyleSearch';
import AuthModal from './AuthModal';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Header = ({ 
  searchQuery = '', 
  onSearchChange, 
  onToggleTheme, 
  themeMode = 'light', 
  onAccountClick, 
  language = 'en', 
  onToggleLanguage,
  // eslint-disable-next-line no-unused-vars
  profileMenuOpen = false,
  mobileSearchEnabled = false,
  // eslint-disable-next-line no-unused-vars
  onMobileSearchToggle,
}) => {
  const { t, i18n } = useTranslation(['navbar', 'auth', 'orders', 'common']);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const device = useDeviceMode();
  // eslint-disable-next-line no-unused-vars
  const theme = useTheme();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [i18n, language]);

  // Scroll detection for header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Only hide/show if scrolled more than 100px
      if (Math.abs(currentScrollY - lastScrollY) > 5) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          // Scrolling down - hide header
          setIsHeaderVisible(false);
        } else {
          // Scrolling up - show header
          setIsHeaderVisible(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleAccountClick = (event) => {
    if (isAuthenticated) {
      setAccountMenuAnchor(event.currentTarget);
    } else {
      setAuthModalOpen(true);
    }
  };

  const handleAccountMenuClose = () => {
    setAccountMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    handleAccountMenuClose();
  };

  const handleMyAccount = () => {
    if (onAccountClick) {
      onAccountClick();
    }
    handleAccountMenuClose();
  };

  const handleMyOrders = () => {
    navigate('/orders');
    handleAccountMenuClose();
  };

  const handleLogoClick = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Box
        data-header-container
        sx={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: `translateX(-50%) translateY(${isHeaderVisible ? '0' : '-100px'})`,
          width: 'auto',
          minWidth: { xs: 320, sm: 400, md: 500 },
          maxWidth: { xs: '95%', sm: '90%', md: '85%' },
          zIndex: 1001,
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        {/* Desktop/Tablet Layout */}
        {!device.isMobile && (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            width: '100%',
            py: 2,
          }}>
            {/* Logo Island */}
            <Logo onClick={handleLogoClick} />
            
            {/* Google Style Search with Action Buttons */}
            <GoogleStyleSearch 
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              placeholder={t('searchPlaceholder')}
              sx={{ width: '100%', maxWidth: { xs: '98%', sm: '98%', md: '95%' } }}
              actionButtons={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {/* Language Toggle */}
                  {device.shouldShowLanguageToggle && (
                    <Tooltip title={t('toggleLanguage')}>
                      <IconButton
                        color="inherit"
                        size="small"
                        onClick={onToggleLanguage}
                        sx={{ 
                          opacity: 0.9,
                          transition: 'opacity 0.2s ease',
                          '&:hover': {
                            opacity: 1,
                            backgroundColor: 'transparent',
                          },
                        }}
                      >
                        {language === 'en' ? (
                          <Box component="img" src="https://flagcdn.com/w20/us.png" alt="US" sx={{ width: 16, height: 12 }} />
                        ) : (
                          <Box component="img" src="https://flagcdn.com/w20/ge.png" alt="GE" sx={{ width: 16, height: 12 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* Theme Toggle */}
                  {device.shouldShowThemeToggle && (
                    <IconButton 
                      size="small" 
                      color="inherit" 
                      onClick={onToggleTheme} 
                      aria-label="Toggle color mode"
                      sx={{ 
                        opacity: 0.9,
                        transition: 'opacity 0.2s ease',
                        '&:hover': {
                          opacity: 1,
                          backgroundColor: 'transparent',
                        },
                      }}
                    >
                      {themeMode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
                    </IconButton>
                  )}

                  {/* Account Button */}
                  {device.shouldShowAccountButton && (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={handleAccountClick}
                      sx={{ 
                        textTransform: 'none', 
                        fontWeight: 600, 
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 'auto',
                        px: 1,
                        opacity: 0.9,
                        transition: 'opacity 0.2s ease',
                        '&:hover': {
                          opacity: 1,
                          backgroundColor: 'transparent',
                        },
                      }}
                    >
                      {isAuthenticated ? t('auth:myAccount') : t('auth:logIn')}
                    </Button>
                  )}
                </Box>
              }
            />
          </Box>
        )}

        {/* Mobile Layout */}
        {device.isMobile && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2, 
            alignItems: 'center',
            width: '100%',
            maxWidth: '100%',
          }}>
            {/* Logo Island */}
            <Logo onClick={handleLogoClick} />
            
            {/* Mobile Google Style Search - Only visible when enabled */}
            {mobileSearchEnabled && (
              <Box sx={{ width: '100%', maxWidth: '100%' }}>
                <GoogleStyleSearch 
                  searchQuery={searchQuery}
                  onSearchChange={onSearchChange}
                  disabled={!mobileSearchEnabled}
                  showSuggestions={true}
                  placeholder={t('searchPlaceholder')}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Account Menu */}
      <Menu
        anchorEl={accountMenuAnchor}
        open={Boolean(accountMenuAnchor)}
        onClose={handleAccountMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            minWidth: 200,
            background: 'rgba(18,18,20,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          },
        }}
      >
        <MenuItem onClick={handleMyAccount} sx={{ py: 1.5 }}>
          <AccountCircleOutlinedIcon sx={{ mr: 2 }} />
          {t('auth:myAccount')}
        </MenuItem>
        <MenuItem onClick={handleMyOrders} sx={{ py: 1.5 }}>
          <ShoppingBagOutlinedIcon sx={{ mr: 2 }} />
          {t('orders:myOrders')}
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
          <LogoutIcon sx={{ mr: 2 }} />
          {t('auth:logout')}
        </MenuItem>
      </Menu>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </>
  );
};

export default Header;
