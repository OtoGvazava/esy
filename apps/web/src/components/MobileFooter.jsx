import React from 'react';
import { 
  Box, 
  IconButton, 
  useTheme, 
  Tooltip,
  Badge
} from "@mui/material";
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AppsIcon from '@mui/icons-material/Apps';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';
import AuthModal from './AuthModal';

export default function MobileFooter({ 
  onProductsClick, 
  onCartToggle, 
  onAccountClick,
  onToggleTheme,
  themeMode = "light",
  onToggleLanguage,
  language = "en",
  onProfileMenuToggle,
  onSearchClick,
  mobileSearchEnabled = false,
  onMobileSearchToggle
}) {
  const theme = useTheme();
  const { t } = useTranslation('navbar');
  const { getTotalItems } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const device = useDeviceMode();
  
  // Detect if we're on the products page (home page)
  const isOnProductsPage = location.pathname === '/';
  
  const [profileMenuAnchor, setProfileMenuAnchor] = React.useState(null);
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const profileMenuOpen = Boolean(profileMenuAnchor);

  const handleMenuClick = (event) => {
    if (profileMenuOpen) {
      setProfileMenuAnchor(null); // Close menu if already open
      onProfileMenuToggle?.(false);
    } else {
      setProfileMenuAnchor(event.currentTarget); // Open menu
      onProfileMenuToggle?.(true);
    }
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
    onProfileMenuToggle?.(false);
  };

  const handleOrdersClick = () => {
    navigate('/orders');
  };

  if (!device.shouldShowMobileFooter) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        height: 80,
        backgroundColor: theme.palette.mode === "dark" 
          ? "rgba(18,18,20,0.7)" 
          : "rgba(255,255,255,0.7)",
        backdropFilter: 'saturate(200%) blur(25px)',
        WebkitBackdropFilter: 'saturate(200%) blur(25px)',
        border: theme.palette.mode === "dark" 
          ? "1px solid rgba(255,255,255,0.2)" 
          : "1px solid rgba(255,255,255,0.3)",
        boxShadow: theme.palette.mode === "dark" 
          ? "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" 
          : "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        px: 3,
        py: 2,
        zIndex: 1001, // Higher z-index to stay above blurred content
      }}
    >


      {/* Main Navigation Buttons */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 4,
        justifyContent: 'center'
      }}>
        {/* Products Button */}
        <Tooltip title={isOnProductsPage ? t('products') + ' (Current)' : t('products')} placement="top">
          <IconButton
            onClick={onProductsClick}
            disabled={isOnProductsPage}
            sx={{
              color: isOnProductsPage 
                ? theme.palette.mode === "dark" ? "rgba(245, 245, 247, 0.3)" : "rgba(17, 17, 17, 0.3)"
                : theme.palette.mode === "dark" ? "#f5f5f7" : "#111",
              bgcolor: isOnProductsPage 
                ? 'rgba(99, 102, 241, 0.05)' 
                : 'rgba(99, 102, 241, 0.1)',
              border: isOnProductsPage 
                ? '1px solid rgba(99, 102, 241, 0.1)' 
                : '1px solid rgba(99, 102, 241, 0.2)',
              width: 48,
              height: 48,
              transition: 'all 0.2s ease',
              cursor: isOnProductsPage ? 'not-allowed' : 'pointer',
              '&:hover': !isOnProductsPage ? {
                bgcolor: 'rgba(99, 102, 241, 0.2)',
                transform: 'scale(1.05)',
              } : {},
              '&:disabled': {
                cursor: 'not-allowed',
              }
            }}
          >
            <InventoryIcon />
          </IconButton>
        </Tooltip>

        {/* Search Button */}
        <Tooltip title={!isOnProductsPage ? t('search') + ' (Products only)' : t('search')} placement="top">
          <IconButton
            data-search-button
            onClick={() => {
              if (onMobileSearchToggle) {
                onMobileSearchToggle(!mobileSearchEnabled);
              }
              if (onSearchClick) {
                onSearchClick();
              }
            }}
            disabled={!isOnProductsPage}
            sx={{
              color: !isOnProductsPage 
                ? theme.palette.mode === "dark" ? "rgba(245, 245, 247, 0.3)" : "rgba(17, 17, 17, 0.3)"
                : theme.palette.mode === "dark" ? "#f5f5f7" : "#111",
              bgcolor: !isOnProductsPage 
                ? 'rgba(99, 102, 241, 0.05)' 
                : 'rgba(99, 102, 241, 0.1)',
              border: !isOnProductsPage 
                ? '1px solid rgba(99, 102, 241, 0.1)' 
                : '1px solid rgba(99, 102, 241, 0.2)',
              width: 48,
              height: 48,
              transition: 'all 0.2s ease',
              cursor: !isOnProductsPage ? 'not-allowed' : 'pointer',
              '&:hover': isOnProductsPage ? {
                bgcolor: 'rgba(99, 102, 241, 0.2)',
                transform: 'scale(1.05)',
              } : {},
              '&:disabled': {
                cursor: 'not-allowed',
              }
            }}
          >
            <SearchIcon />
          </IconButton>
        </Tooltip>

        {/* Cart Button */}
        <Tooltip title={t('cart')} placement="top">
          <Badge 
            badgeContent={getTotalItems()} 
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.7rem',
                minWidth: 18,
                height: 18,
                borderRadius: '9px',
                fontWeight: 600,
              }
            }}
          >
            <IconButton
              onClick={onCartToggle}
              sx={{
                color: '#ffffff',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                width: 56,
                height: 56,
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                border: '2px solid rgba(255,255,255,0.2)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  transform: 'scale(1.05)',
                  boxShadow: '0 12px 32px rgba(99, 102, 241, 0.5)',
                }
              }}
            >
              <ShoppingCartIcon />
            </IconButton>
          </Badge>
        </Tooltip>

        {/* Menu Button */}
        <Tooltip title="Menu" placement="top">
          <IconButton
            data-profile-button
            onClick={handleMenuClick}
            sx={{
              color: theme.palette.mode === "dark" ? "#f5f5f7" : "#111",
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              width: 48,
              height: 48,
              transition: 'all 0.2s ease',
              zIndex: 'auto', // Standard z-index, Modal will handle layering
              '&:hover': {
                bgcolor: 'rgba(99, 102, 241, 0.2)',
                transform: 'scale(1.05)',
              }
            }}
          >
            <AppsIcon sx={{ color: 'inherit' }} />
          </IconButton>
        </Tooltip>
      </Box>


      {/* Profile Menu */}
      <ProfileMenu
        open={profileMenuOpen}
        onClose={handleProfileMenuClose}
        onAccountClick={onAccountClick}
        onOrdersClick={handleOrdersClick}
        user={user}
        isAuthenticated={isAuthenticated}
        onAuthModalOpen={() => setAuthModalOpen(true)}
        themeMode={themeMode}
        onToggleTheme={onToggleTheme}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

    </Box>
  );
}
