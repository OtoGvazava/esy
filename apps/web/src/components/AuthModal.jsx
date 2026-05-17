import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon, Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// One sign-in only: real Google OAuth (full-page redirect).
const AuthModal = ({ open, onClose }) => {
  const theme = useTheme();
  const { signInWithGoogle } = useAuth();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 3 }}>
        <Typography variant="h5" fontWeight={700} color="inherit">Sign in</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'inherit' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Typography variant="body1" color="text.secondary" textAlign="center" mb={3} sx={{ fontSize: 16 }}>
          One esy account for buying and selling. Continue with Google.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            onClick={signInWithGoogle}
            startIcon={<GoogleIcon />}
            sx={{
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: 16,
              fontWeight: 600,
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
              color: 'inherit',
            }}
          >
            Continue with Gmail
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 500 }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuthModal;
