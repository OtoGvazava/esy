import React, { useState, useEffect } from 'react';
import {
  Box,
  useTheme,
  Modal,
  Backdrop,
  Typography,
  keyframes
} from '@mui/material';
import { useDeviceMode } from '../hooks/useDeviceMode';
import {
  AccountCircleOutlined as AccountIcon,
  ShoppingBagOutlined as OrdersIcon,
  LogoutOutlined as LogoutIcon,
  PersonOutlined as PersonIcon,
  WhatsApp as WhatsAppIcon,
  Facebook as FacebookIcon,
  DarkModeOutlined as DarkModeIcon,
  LightModeOutlined as LightModeIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Define keyframes for sun effect animations
const sunRayAnimation = keyframes`
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--rotation)) scale(0.5);
  }
  50% {
    opacity: 0.8;
    transform: translate(-50%, -50%) rotate(var(--rotation)) scale(1.1);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(var(--rotation)) scale(1);
  }
`;

const sunPulseAnimation = keyframes`
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.2);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

const ProfileMenu = ({ 
  open, 
  onClose, 
  onAccountClick, 
  onOrdersClick,
  user,
  isAuthenticated,
  onAuthModalOpen,
  themeMode,
  onToggleTheme,
  language,
  onToggleLanguage
}) => {
  const theme = useTheme();
  const { t } = useTranslation('navbar');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const device = useDeviceMode();
  const [animationPhase, setAnimationPhase] = useState('closed');

  useEffect(() => {
    if (open) {
      setAnimationPhase('opening');
      const timer = setTimeout(() => setAnimationPhase('open'), 100);
      return () => clearTimeout(timer);
    } else {
      setAnimationPhase('closing');
      const timer = setTimeout(() => setAnimationPhase('closed'), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Simple click handler for menu container
  const handleMenuContainerClick = (event) => {
    // Only close if clicking on the container itself, not on menu items
    if (event.target === event.currentTarget) {
      onClose();
    }
  };


  const handleAccountClick = () => {
    onClose();
    onAccountClick();
  };

  const handleOrdersClick = () => {
    onClose();
    onOrdersClick();
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/');
  };

  const menuItems = isAuthenticated ? [
    {
      icon: <PersonIcon />,
      text: t('myAccount'),
      onClick: handleAccountClick,
      divider: false
    },
    {
      icon: <OrdersIcon />,
      text: t('myOrders', { ns: 'orders' }),
      onClick: handleOrdersClick,
      divider: true
    },
    {
      icon: <WhatsAppIcon />,
      text: 'WhatsApp',
      onClick: () => window.open('https://wa.me/995555123456', '_blank'),
      divider: false
    },
    {
      icon: <FacebookIcon />,
      text: 'Facebook',
      onClick: () => window.open('https://facebook.com', '_blank'),
      divider: true
    },
    {
      icon: themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />,
      text: themeMode === 'dark' ? 'Light Mode' : 'Dark Mode',
      onClick: onToggleTheme,
      divider: false
    },
    {
      icon: <LanguageIcon />,
      text: language === 'en' ? 'ქართული' : 'English',
      onClick: onToggleLanguage,
      divider: true
    },
    {
      icon: <LogoutIcon />,
      text: t('logout', { ns: 'auth' }),
      onClick: handleLogout,
      divider: false
    }
  ] : [
    {
      icon: <PersonIcon />,
      text: t('login', { ns: 'auth' }),
      onClick: onAuthModalOpen,
      divider: false
    },
    {
      icon: <WhatsAppIcon />,
      text: 'WhatsApp',
      onClick: () => window.open('https://wa.me/995555123456', '_blank'),
      divider: false
    },
    {
      icon: <FacebookIcon />,
      text: 'Facebook',
      onClick: () => window.open('https://facebook.com', '_blank'),
      divider: true
    },
    {
      icon: themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />,
      text: themeMode === 'dark' ? 'Light Mode' : 'Dark Mode',
      onClick: onToggleTheme,
      divider: false
    },
    {
      icon: <LanguageIcon />,
      text: language === 'en' ? 'ქართული' : 'English',
      onClick: onToggleLanguage,
      divider: false
    }
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      BackdropComponent={Backdrop}
      BackdropProps={{
        sx: (theme) => ({
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(0, 0, 0, 0.6)' 
            : 'rgba(0, 0, 0, 0.4)',
          backdropFilter: theme.palette.mode === 'dark' 
            ? 'blur(12px)' 
            : 'blur(6px)',
          WebkitBackdropFilter: theme.palette.mode === 'dark' 
            ? 'blur(12px)' 
            : 'blur(6px)',
        })
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: (theme) => theme.zIndex.modal,
        '& .MuiBackdrop-root': {
          zIndex: (theme) => theme.zIndex.modal - 1,
        }
      }}
    >
      {/* Menu Container */}
      <Box
        data-menu-container
        className="profile-menu-items"
        onClick={handleMenuContainerClick}
        sx={{
          position: 'relative',
          zIndex: (theme) => theme.zIndex.modal + 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          opacity: open ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          pointerEvents: 'auto',
          visibility: 'visible'
        }}
      >
        {/* Welcome Text - Above menu items (only for authenticated users) */}
        {isAuthenticated && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              mb: 2,
              p: 2.5,
              borderRadius: 4,
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(18,18,20,0.95)' 
                : 'rgba(255,255,255,0.95)',
              backdropFilter: 'saturate(180%) blur(12px)',
              WebkitBackdropFilter: 'saturate(180%) blur(12px)',
              border: theme.palette.mode === 'dark' 
                ? '1px solid rgba(255,255,255,0.1)' 
                : '1px solid rgba(0,0,0,0.1)',
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 -4px 24px rgba(0,0,0,0.5)' 
                : '0 -4px 24px rgba(0,0,0,0.06)',
              minWidth: 200,
              maxWidth: 280
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(99, 102, 241, 0.8)',
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                lineHeight: 1,
                mb: 1
              }}
            >
              {t('heyThere', { ns: 'auth' })}! 👋
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 200
              }}
            >
              {user?.firstName ? `${user.firstName}` : 'User'}
            </Typography>
          </Box>
        )}

        {/* Menu Items with Wrap */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1, // Reduced gap to fit more items
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '100%', // Use full screen width
            width: '100%',
            padding: '0 8px' // Minimal padding to maximize space
          }}
        >
        {/* Menu items in horizontal layout */}
        {menuItems.map((item, index) => (
          <Box
            key={index}
            sx={{
              animation: open && animationPhase === 'open' 
                ? `${sunRayAnimation} 0.4s ease-out ${index * 0.05}s both` 
                : 'none'
            }}
          >
            <Box
              onClick={(e) => {
                e.stopPropagation(); // Prevent container click
                item.onClick();
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.8, // Reduced gap between icon and text
                p: 1, // Reduced padding to make items more compact
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(18,18,20,0.95)' 
                  : 'rgba(255,255,255,0.95)',
                backdropFilter: 'saturate(180%) blur(12px)',
                border: theme.palette.mode === 'dark' 
                  ? '1px solid rgba(255,255,255,0.1)' 
                  : '1px solid rgba(0,0,0,0.1)',
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 -4px 24px rgba(0,0,0,0.5)' 
                  : '0 -4px 24px rgba(0,0,0,0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: 70, // Reduced minimum width to fit more items
                flex: '0 0 auto', // Allow items to size based on content
                width: 'auto', // Auto width based on content
                maxWidth: '120px', // Maximum width to prevent items from being too wide
                '&:hover': {
                  transform: 'scale(1.02)',
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(99, 102, 241, 0.4)' 
                    : 'rgba(99, 102, 241, 0.3)',
                  border: theme.palette.mode === 'dark' 
                    ? '1px solid rgba(99, 102, 241, 0.3)' 
                    : '1px solid rgba(99, 102, 241, 0.3)',
                  '& .MuiTypography-root': {
                    color: '#ffffff !important'
                  },
                  '& .MuiBox-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff !important'
                  }
                }
              }}
            >
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  color: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.8)' 
                    : 'rgba(99, 102, 241, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem'
                }}
              >
                {item.icon}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.7rem', // Slightly smaller font to fit more items
                  fontWeight: 500,
                  textAlign: 'center',
                  color: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.8)' 
                    : 'rgba(0, 0, 0, 0.8)',
                  lineHeight: 1.2,
                  maxWidth: '100%',
                  whiteSpace: 'normal', // Allow text to wrap
                  wordBreak: 'break-word' // Break long words if needed
                }}
              >
                {item.text}
              </Typography>
            </Box>
          </Box>
        ))}
        </Box>
      </Box>
    </Modal>
  );
};

export default ProfileMenu;
