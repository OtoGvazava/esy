import { Box, Tooltip, Fab, Badge, Zoom, Fade } from "@mui/material";
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';
import { useDeviceMode } from '../hooks/useDeviceMode';

export default function FloatingCart({ onCartToggle }) {
  const { t } = useTranslation('navbar');
  const { getTotalItems } = useCart();
  const device = useDeviceMode();
  
  const totalItems = getTotalItems();

  // Hide floating cart when not needed based on device mode
  if (!device.shouldShowFloatingCart) return null;
  
  return (
    <Box sx={{
      position: 'fixed',
      right: { xs: 20, sm: 32 },
      bottom: { xs: 20, sm: 32 },
      zIndex: (theme) => theme.zIndex.tooltip + 1
    }}>
      <Tooltip 
        title={t('cart')} 
        placement="left"
        TransitionComponent={Zoom}
        TransitionProps={{ timeout: 200 }}
      >
        <Badge 
          badgeContent={totalItems} 
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.75rem',
              minWidth: 24,
              height: 24,
              borderRadius: '12px',
              fontWeight: 600,
              animation: totalItems > 0 ? 'pulse 0.6s ease-in-out' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.2)' },
                '100%': { transform: 'scale(1)' },
              }
            }
          }}
        >
          <Fab
            onClick={onCartToggle}
            sx={{
              width: { xs: 64, sm: 72, md: 80 },
              height: { xs: 64, sm: 72, md: 80 },
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#ffffff',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 16px 40px rgba(99, 102, 241, 0.4), 0 8px 20px rgba(0,0,0,0.15)',
              border: '2px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
              },
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                transform: 'translateY(-6px) scale(1.05)',
                boxShadow: '0 24px 48px rgba(99, 102, 241, 0.5), 0 12px 32px rgba(0,0,0,0.2), 0 0 0 12px rgba(99, 102, 241, 0.1)',
                border: '2px solid rgba(255,255,255,0.3)',
                '&::before': {
                  opacity: 1,
                }
              },
              '&:active': {
                transform: 'translateY(-3px) scale(1.02)',
                boxShadow: '0 20px 44px rgba(99, 102, 241, 0.45), 0 10px 28px rgba(0,0,0,0.18), 0 0 0 8px rgba(99, 102, 241, 0.08)'
              },
              '&:focus': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 16px 40px rgba(99, 102, 241, 0.4), 0 8px 20px rgba(0,0,0,0.15), 0 0 0 6px rgba(99, 102, 241, 0.2)'
              }
            }}
          >
            <Fade in={true} timeout={500}>
              <ShoppingCartIcon sx={{ fontSize: { xs: 28, sm: 32, md: 36 }, zIndex: 1 }} />
            </Fade>
          </Fab>
        </Badge>
      </Tooltip>
    </Box>
  );
}
