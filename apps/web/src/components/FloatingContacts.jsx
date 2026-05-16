import { Box, Tooltip, Fab, useTheme } from "@mui/material";
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import FacebookIcon from '@mui/icons-material/Facebook';
import { useTranslation } from 'react-i18next';
import { useDeviceMode } from '../hooks/useDeviceMode';
import { WHATSAPP_NUMBER, MESSENGER_PAGE_ID } from '../config/contact';

export default function FloatingContacts({ profileMenuOpen = false }) {
  const { t } = useTranslation('navbar');
  const theme = useTheme();
  const device = useDeviceMode();
  
  // Hide floating contacts when profile menu is open or when not needed
  if (profileMenuOpen || !device.shouldShowFloatingContacts) {
    return null;
  }
  
  return (
    <Box sx={{
      position: 'fixed',
      left: { xs: 12, sm: 20, md: 24 },
      bottom: device.isMobileOrTablet ? '50%' : 100,
      transform: device.isMobileOrTablet ? 'translateY(50%)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      zIndex: (theme) => theme.zIndex.appBar + 1
    }}>
      <Tooltip title={t('contactWhatsApp')} placement="right">
        <Fab
          component="a"
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noreferrer"
          size="large"
          sx={{
            bgcolor: '#25D366 !important',
            color: '#ffffff !important',
            transition: 'transform 160ms ease, box-shadow 160ms ease',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            '&:hover': {
              bgcolor: '#25D366 !important',
              color: '#ffffff !important',
              transform: 'translateY(-2px) scale(1.06)',
              boxShadow: '0 14px 32px rgba(0,0,0,0.26), 0 0 0 6px rgba(37,211,102,0.18)'
            },
            '&:active': {
              bgcolor: '#25D366 !important',
              color: '#ffffff !important',
              transform: 'translateY(0) scale(1.02)',
              boxShadow: '0 10px 26px rgba(0,0,0,0.22), 0 0 0 4px rgba(37,211,102,0.16)'
            },
            '&:focus': {
              bgcolor: '#25D366 !important',
              color: '#ffffff !important'
            }
          }}
        >
          <WhatsAppIcon fontSize="large" />
        </Fab>
      </Tooltip>
      <Tooltip title={t('contactMessenger')} placement="right">
        <Fab
          component="a"
          href={`https://m.me/${MESSENGER_PAGE_ID}`}
          target="_blank"
          rel="noreferrer"
          size="large"
          sx={{
            bgcolor: '#0084FF !important',
            color: '#ffffff !important',
            transition: 'transform 160ms ease, box-shadow 160ms ease',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            '&:hover': {
              bgcolor: '#0084FF !important',
              color: '#ffffff !important',
              transform: 'translateY(-2px) scale(1.06)',
              boxShadow: '0 14px 32px rgba(0,0,0,0.26), 0 0 0 6px rgba(0,132,255,0.18)'
            },
            '&:active': {
              bgcolor: '#0084FF !important',
              color: '#ffffff !important',
              transform: 'translateY(0) scale(1.02)',
              boxShadow: '0 10px 26px rgba(0,0,0,0.22), 0 0 0 4px rgba(0,132,255,0.16)'
            },
            '&:focus': {
              bgcolor: '#0084FF !important',
              color: '#ffffff !important'
            }
          }}
        >
          <FacebookIcon fontSize="large" />
        </Fab>
      </Tooltip>
    </Box>
  );
}