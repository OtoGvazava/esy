import { AppBar, Toolbar, IconButton, InputBase, Box, useTheme, Button, Tooltip, Menu, MenuItem, Avatar } from "@mui/material";
import { useRef, useState } from "react";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDeviceMode } from '../hooks/useDeviceMode';
import AuthModal from './AuthModal';
import Logo from './Logo';
import { useNavigate } from 'react-router-dom';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

export default function Navbar({ searchQuery = "", onSearchChange, onToggleTheme, themeMode = "light", onAccountClick, language = "en", onToggleLanguage, profileMenuOpen = false }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation(['navbar', 'auth', 'orders']);
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const device = useDeviceMode();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null);
  
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [i18n, language]);


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

  const handleAdminPanel = () => {
    navigate('/admin');
    handleAccountMenuClose();
  };
  return (
    <AppBar position="fixed" sx={{
      backgroundColor: 'transparent',
      backdropFilter: 'none',
      color: theme.palette.mode === "dark" ? "#f5f5f7" : "#111",
      boxShadow: 'none',
      display: 'block',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'auto',
      minWidth: { xs: 300, sm: 400, md: 500 },
      maxWidth: '95%',
      borderRadius: 20,
      background: theme.palette.mode === "dark" 
        ? "rgba(18,18,20,0.7)" 
        : "rgba(255,255,255,0.7)",
      backdropFilter: "saturate(200%) blur(25px)",
      WebkitBackdropFilter: "saturate(200%) blur(25px)",
      border: theme.palette.mode === "dark" 
        ? "1px solid rgba(255,255,255,0.2)" 
        : "1px solid rgba(255,255,255,0.3)",
      boxShadow: theme.palette.mode === "dark" 
        ? "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" 
        : "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
    }}>
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        width: '100%',
        py: 2,
        px: { xs: 2, sm: 3 }
      }}>
        {/* Logo Component */}
        <Logo onClick={() => window.location.href = '/'} />
        
        {/* Search Field - Takes most of the space */}
        <Box sx={{
          display: "flex",
          alignItems: "center",
          width: '100%',
          maxWidth: { xs: '98%', sm: '98%', md: '95%' },
          backgroundColor: 'transparent',
          borderRadius: 2,
          border: 'none',
          transition: "all 0.2s ease",
        }}>
          <InputBase
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            inputProps={{ "aria-label": "search" }}
            inputRef={useRef(null)}
            sx={{ 
              color: "inherit", 
              width: '100%', 
              fontSize: { xs: "1.1rem", sm: "1.2rem" },
              px: 3,
              py: 2,
              fontWeight: 400,
              "& .MuiInputBase-input": {
                "&::placeholder": {
                  opacity: 0.6,
                  fontSize: { xs: "1.1rem", sm: "1.2rem" },
                },
              },
            }}
            startAdornment={
              device.shouldShowSearchIcon && (
                <Box sx={{ display: "flex", alignItems: "center", mr: 1.5, color: "inherit" }}>
                  <SearchIcon />
                </Box>
              )
            }
            endAdornment={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {/* Clear Button */}
                {Boolean(searchQuery) && device.shouldShowClearButton && (
                  <IconButton
                    size="small"
                    aria-label="Clear search"
                    onClick={() => {
                      onSearchChange && onSearchChange("");
                    }}
                    sx={{
                      color: "inherit",
                      mr: 0.5,
                      opacity: 0.7,
                      transition: 'opacity 0.2s ease',
                      "&:hover": {
                        opacity: 1,
                        backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(17,17,17,0.1)",
                      }
                    }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}

                {/* Action Buttons */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  borderLeft: `1px solid ${theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.1)' 
                    : 'rgba(0,0,0,0.1)'}`,
                  pl: 1
                }}>
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
                          "&:hover": {
                            opacity: 1,
                            backgroundColor: 'transparent',
                          }
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
                        "&:hover": {
                          opacity: 1,
                          backgroundColor: 'transparent',
                        }
                      }}
                    >
                      {themeMode === "dark" ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
                    </IconButton>
                  )}

                  {/* Account Button */}
                  {device.shouldShowAccountButton && (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={handleAccountClick}
                      sx={{ 
                        textTransform: "none", 
                        fontWeight: 600, 
                        fontSize: 14,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 'auto',
                        px: 1,
                        opacity: 0.9,
                        transition: 'opacity 0.2s ease',
                        "&:hover": {
                          opacity: 1,
                          backgroundColor: 'transparent',
                        }
                      }}
                    >
                      {isAuthenticated ? t('auth:myAccount') : t('auth:logIn')}
                    </Button>
                  )}
                </Box>
              </Box>
            }
          />
        </Box>
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
            background: theme.palette.mode === 'dark' 
              ? 'rgba(30,30,30,0.95)' 
              : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            border: theme.palette.mode === 'dark' 
              ? '1px solid rgba(255,255,255,0.1)' 
              : '1px solid rgba(0,0,0,0.1)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 10px 25px rgba(0,0,0,0.3)'
              : '0 10px 25px rgba(0,0,0,0.1)'
          }
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
        {isAdmin && (
          <MenuItem onClick={handleAdminPanel} sx={{ py: 1.5 }}>
            <AdminPanelSettingsIcon sx={{ mr: 2 }} />
            Admin Panel
          </MenuItem>
        )}
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
    </AppBar>
  );
}