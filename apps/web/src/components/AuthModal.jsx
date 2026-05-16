import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  useTheme,
  Divider,
  TextField
} from '@mui/material';
import {
  Close as CloseIcon,
  Google as GoogleIcon,
  Apple as AppleIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import MultiStepRegistration from './MultiStepRegistration';

const AuthModal = ({ open, onClose }) => {
  const theme = useTheme();
  const { t } = useTranslation('auth');
  const { loginWithGoogle, loginWithApple, loginDev, completeRegistration, user, isNewUser } = useAuth();
  const [loading, setLoading] = useState({ google: false, apple: false, dev: false });
  const [showRegistration, setShowRegistration] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devError, setDevError] = useState('');

  const handleDevLogin = async () => {
    const email = devEmail.trim();
    if (!email) {
      setDevError('Enter an email');
      return;
    }
    setDevError('');
    setLoading(prev => ({ ...prev, dev: true }));
    try {
      const result = await loginDev(email);
      if (result.success) {
        if (result.user?.isNewUser) {
          setShowRegistration(true);
        } else {
          onClose();
        }
      } else {
        setDevError(result.error || 'Login failed');
      }
    } catch (error) {
      setDevError(error.message || 'Login failed');
    } finally {
      setLoading(prev => ({ ...prev, dev: false }));
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(prev => ({ ...prev, google: true }));
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        // Check if user needs to complete registration
        if (result.user?.isNewUser) {
          setShowRegistration(true);
        } else {
          onClose();
        }
      } else {
        console.error('Google login failed:', result.error);
      }
    } catch (error) {
      console.error('Google login error:', error);
    } finally {
      setLoading(prev => ({ ...prev, google: false }));
    }
  };

  const handleAppleLogin = async () => {
    setLoading(prev => ({ ...prev, apple: true }));
    try {
      const result = await loginWithApple();
      if (result.success) {
        // Check if user needs to complete registration
        if (result.user?.isNewUser) {
          setShowRegistration(true);
        } else {
          onClose();
        }
      } else {
        console.error('Apple login failed:', result.error);
      }
    } catch (error) {
      console.error('Apple login error:', error);
    } finally {
      setLoading(prev => ({ ...prev, apple: false }));
    }
  };

  const handleRegistrationComplete = async (userData) => {
    try {
      const result = await completeRegistration(userData);
      if (result.success) {
        setShowRegistration(false);
        onClose();
      } else {
        console.error('Registration completion failed:', result.error);
      }
    } catch (error) {
      console.error('Registration completion error:', error);
    }
  };

  const handleClose = () => {
    setShowRegistration(false);
    onClose();
  };

  // Show registration form if user is new and needs to complete registration
  if (showRegistration && user) {
    return (
      <MultiStepRegistration
        open={open}
        onClose={handleClose}
        onComplete={handleRegistrationComplete}
        userData={user}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(45,45,45,0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255,255,255,0.1)' 
            : '1px solid rgba(0,0,0,0.1)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 25px 50px -12px rgba(0,0,0,0.5)'
            : '0 25px 50px -12px rgba(0,0,0,0.15)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1,
        pt: 3
      }}>
        <Typography variant="h5" fontWeight={700} color="inherit">
          {t('welcome')}
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: 'inherit',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255,255,255,0.1)' 
                : 'rgba(0,0,0,0.1)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          textAlign="center" 
          mb={3}
          sx={{ fontSize: 16 }}
        >
          {t('signInMessage')}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            onClick={handleGoogleLogin}
            disabled={loading.google || loading.apple}
            startIcon={loading.google ? <CircularProgress size={20} /> : <GoogleIcon />}
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: 16,
              fontWeight: 600,
              borderColor: theme.palette.mode === 'dark' 
                ? 'rgba(255,255,255,0.2)' 
                : 'rgba(0,0,0,0.2)',
              color: 'inherit',
              '&:hover': {
                borderColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.3)' 
                  : 'rgba(0,0,0,0.3)',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.05)' 
                  : 'rgba(0,0,0,0.05)'
              }
            }}
          >
            {t('signInWithGoogle')}
          </Button>

          <Button
            variant="outlined"
            size="large"
            fullWidth
            onClick={handleAppleLogin}
            disabled={loading.google || loading.apple}
            startIcon={loading.apple ? <CircularProgress size={20} /> : <AppleIcon />}
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: 16,
              fontWeight: 600,
              borderColor: theme.palette.mode === 'dark' 
                ? 'rgba(255,255,255,0.2)' 
                : 'rgba(0,0,0,0.2)',
              color: 'inherit',
              '&:hover': {
                borderColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.3)' 
                  : 'rgba(0,0,0,0.3)',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(255,255,255,0.05)' 
                  : 'rgba(0,0,0,0.05)'
              }
            }}
          >
            {t('signInWithApple')}
          </Button>
        </Box>

        <Divider sx={{ my: 3, opacity: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            or use a dev email
          </Typography>
        </Divider>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            type="email"
            placeholder="you@esy.dev (use admin@esy.dev for admin)"
            value={devEmail}
            onChange={(e) => { setDevEmail(e.target.value); setDevError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDevLogin(); }}
            error={!!devError}
            helperText={devError || ' '}
            disabled={loading.dev || loading.google || loading.apple}
          />
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleDevLogin}
            disabled={loading.dev || loading.google || loading.apple}
            startIcon={loading.dev ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontSize: 16, fontWeight: 600 }}
          >
            Continue with dev login
          </Button>
        </Box>

        <Divider sx={{ my: 3, opacity: 0.5 }} />

        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ fontSize: 14, lineHeight: 1.5 }}
        >
          {t('privacyNotice')}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button
          onClick={handleClose}
          color="inherit"
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          {t('cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuthModal;
