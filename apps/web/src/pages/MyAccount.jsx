/* global process */
import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Avatar,
  Button,
  TextField,
  Grid,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  Security as SecurityIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { loginAsAdmin, loginAsUser } from '../utils/adminUtils';

const MyAccount = () => {
  const theme = useTheme();
  const { t } = useTranslation(['auth', 'account']);
  const { user, updateProfile, login } = useAuth();
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const isMobile = useMediaQuery('(max-width:600px)');
  
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [editingFields, setEditingFields] = useState({
    firstName: false,
    lastName: false,
    phoneNumber: false,
    personalNumber: false,
    dateOfBirth: false,
  });
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
    personalNumber: user?.personalNumber || '',
    dateOfBirth: user?.dateOfBirth || '',
  });


  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleEditField = (field) => {
    setEditingFields(prev => ({
      ...prev,
      [field]: true,
    }));
  };

  const handleCancelEdit = (field) => {
    setEditingFields(prev => ({
      ...prev,
      [field]: false,
    }));
    // Reset field to original value
    setFormData(prev => ({
      ...prev,
      [field]: user?.[field] || '',
    }));
  };

  const handleSaveField = async (field) => {
    setLoading(true);
    try {
      const fieldData = { [field]: formData[field] };
      const result = await updateProfile(fieldData);
      if (result.success) {
        setSnackbar({
          open: true,
          message: t('account:fieldUpdated'),
          severity: 'success',
        });
        setEditingFields(prev => ({
          ...prev,
          [field]: false,
        }));
      } else {
        setSnackbar({
          open: true,
          message: result.error || t('account:updateError'),
          severity: 'error',
        });
      }
    } catch {
      setSnackbar({
        open: true,
        message: t('account:updateError'),
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };



  const handleChangePassword = () => {
    // Redirect to the appropriate provider's password change URL
    if (user?.provider === 'google') {
      window.open('https://myaccount.google.com/security', '_blank');
    } else if (user?.provider === 'apple') {
      window.open('https://appleid.apple.com/account/manage', '_blank');
    } else {
      // For other providers or if no provider is set, show a message
      setSnackbar({
        open: true,
        message: t('account:passwordChangeRedirect'),
        severity: 'info',
      });
    }
    setChangePasswordOpen(false);
  };

  // eslint-disable-next-line no-unused-vars
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (!user) {
    return (
      <Container maxWidth={false} sx={{ py: 4, px: 3 }}>
        <Box textAlign="center" py={8}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              mb: 3,
              border: '2px solid rgba(99, 102, 241, 0.2)',
              mx: 'auto',
            }}
          >
            <AccountCircleIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('account:myAccount')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('account:loginRequired')}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 4, px: 3 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}
        >
          {t('account:myAccount')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('account:profileInformation')}
        </Typography>
      </Box>

      {/* Profile Header Card */}
      <Card 
        sx={(theme) => ({
          borderRadius: 3,
          border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          mb: 3,
          overflow: 'hidden',
        })}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                src={user.avatar}
                sx={{ 
                  width: 80, 
                  height: 80,
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  border: '3px solid rgba(99, 102, 241, 0.2)',
                  fontSize: '2rem',
                  fontWeight: 600,
                }}
              >
                {!user.avatar && getInitials(user.firstName, user.lastName)}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {user.name || `${user.firstName} ${user.lastName}`}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
                  {user.email}
                </Typography>
                <Chip
                  icon={<AccountCircleIcon />}
                  label={t('account:verified')}
                  color="success"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Admin Toggle Card - Only show for development/testing */}
      {process.env.NODE_ENV === 'development' && (
        <Card 
          sx={(theme) => ({
            borderRadius: 3,
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.08)',
            background: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              : '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            mb: 3,
            overflow: 'hidden',
          })}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                mb: 3,
                fontWeight: 600,
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
              }}
            >
              Development Tools
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant={user.role === 'admin' ? 'contained' : 'outlined'}
                color="primary"
                onClick={() => {
                  const adminUser = loginAsAdmin();
                  login(adminUser);
                  setSnackbar({ open: true, message: 'Switched to Admin role', severity: 'success' });
                }}
                sx={{ borderRadius: 2 }}
              >
                Switch to Admin
              </Button>
              <Button
                variant={user.role === 'user' ? 'contained' : 'outlined'}
                color="secondary"
                onClick={() => {
                  const regularUser = loginAsUser();
                  login(regularUser);
                  setSnackbar({ open: true, message: 'Switched to User role', severity: 'success' });
                }}
                sx={{ borderRadius: 2 }}
              >
                Switch to User
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Current role: <strong>{user.role || 'user'}</strong>
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Profile Information Card */}
      <Card 
        sx={(theme) => ({
          borderRadius: 3,
          border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          mb: 3,
          overflow: 'hidden',
        })}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              mb: 3,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('account:profileInformation')}
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  label={t('auth:firstName')}
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                  disabled={!editingFields.firstName}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      border: theme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      },
                      '&.Mui-focused': {
                        border: '1px solid rgba(99, 102, 241, 0.5)',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.02)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        '&:hover': {
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        },
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    endAdornment: editingFields.firstName ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleSaveField('firstName')}
                          disabled={loading}
                          sx={{
                            color: '#4CAF50',
                            bgcolor: 'rgba(76, 175, 80, 0.1)',
                            border: '1px solid rgba(76, 175, 80, 0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(76, 175, 80, 0.2)',
                              transform: 'scale(1.05)',
                            },
                            '&:disabled': {
                              bgcolor: 'rgba(0, 0, 0, 0.12)',
                              color: 'rgba(0, 0, 0, 0.26)',
                              border: '1px solid rgba(0, 0, 0, 0.12)',
                            },
                          }}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleCancelEdit('firstName')}
                          sx={{
                            color: '#f44336',
                            bgcolor: 'rgba(244, 67, 54, 0.1)',
                            border: '1px solid rgba(244, 67, 54, 0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(244, 67, 54, 0.2)',
                              transform: 'scale(1.05)',
                            },
                          }}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleEditField('firstName')}
                        sx={{
                          color: '#6366f1',
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(99, 102, 241, 0.2)',
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={8} md={6}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  label={t('auth:lastName')}
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                  disabled={!editingFields.lastName}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      border: theme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      },
                      '&.Mui-focused': {
                        border: '1px solid rgba(99, 102, 241, 0.5)',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.02)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        '&:hover': {
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        },
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    endAdornment: editingFields.lastName ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleSaveField('lastName')}
                          disabled={loading}
                          sx={{
                            color: '#4CAF50',
                            bgcolor: 'rgba(76, 175, 80, 0.1)',
                            border: '1px solid rgba(76, 175, 80, 0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(76, 175, 80, 0.2)',
                              transform: 'scale(1.05)',
                            },
                            '&:disabled': {
                              bgcolor: 'rgba(0, 0, 0, 0.12)',
                              color: 'rgba(0, 0, 0, 0.26)',
                              border: '1px solid rgba(0, 0, 0, 0.12)',
                            },
                          }}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleCancelEdit('lastName')}
                          sx={{
                            color: '#f44336',
                            bgcolor: 'rgba(244, 67, 54, 0.1)',
                            border: '1px solid rgba(244, 67, 54, 0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(244, 67, 54, 0.2)',
                              transform: 'scale(1.05)',
                            },
                          }}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleEditField('lastName')}
                        sx={{
                          color: '#6366f1',
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(99, 102, 241, 0.2)',
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={8} md={6}>
              <TextField
                fullWidth
                label={t('auth:email')}
                value={user?.email || ''}
                disabled={true}
                type="email"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.02)' 
                      : 'rgba(0, 0, 0, 0.02)',
                    backdropFilter: 'blur(10px)',
                    border: theme.palette.mode === 'dark'
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(0, 0, 0, 0.08)',
                    '&.Mui-disabled': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.02)' 
                        : 'rgba(0, 0, 0, 0.02)',
                      color: 'text.primary',
                    },
                  },
                }}
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                helperText={t('account:emailNotEditable')}
              />
            </Grid>
            <Grid item xs={12} sm={8} md={6}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  label={t('auth:phoneNumber')}
                  value={formData.phoneNumber}
                  onChange={handleInputChange('phoneNumber')}
                  disabled={!editingFields.phoneNumber}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      border: theme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      },
                      '&.Mui-focused': {
                        border: '1px solid rgba(99, 102, 241, 0.5)',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.02)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        '&:hover': {
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        },
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    endAdornment: editingFields.phoneNumber ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleSaveField('phoneNumber')}
                          disabled={loading}
                          sx={{
                            color: '#4CAF50',
                            bgcolor: 'rgba(76, 175, 80, 0.1)',
                            border: '1px solid rgba(76, 175, 80, 0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(76, 175, 80, 0.2)',
                              transform: 'scale(1.05)',
                            },
                            '&:disabled': {
                              bgcolor: 'rgba(0, 0, 0, 0.12)',
                              color: 'rgba(0, 0, 0, 0.26)',
                              border: '1px solid rgba(0, 0, 0, 0.12)',
                            },
                          }}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleCancelEdit('phoneNumber')}
                          sx={{
                            color: '#f44336',
                            bgcolor: 'rgba(244, 67, 54, 0.1)',
                            border: '1px solid rgba(244, 67, 54, 0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(244, 67, 54, 0.2)',
                              transform: 'scale(1.05)',
                            },
                          }}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleEditField('phoneNumber')}
                        sx={{
                          color: '#6366f1',
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(99, 102, 241, 0.2)',
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={8} md={6}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  label={t('auth:personalNumber')}
                  value={formData.personalNumber}
                  onChange={handleInputChange('personalNumber')}
                  disabled={!editingFields.personalNumber}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      border: theme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      },
                      '&.Mui-focused': {
                        border: '1px solid rgba(99, 102, 241, 0.5)',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.02)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        '&:hover': {
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        },
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: <BadgeIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    endAdornment: editingFields.personalNumber ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleSaveField('personalNumber')}
                          disabled={loading}
                          sx={{
                            color: '#4CAF50',
                            bgcolor: 'rgba(76, 175, 80, 0.1)',
                            border: '1px solid rgba(76, 175, 80, 0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(76, 175, 80, 0.2)',
                              transform: 'scale(1.05)',
                            },
                            '&:disabled': {
                              bgcolor: 'rgba(0, 0, 0, 0.12)',
                              color: 'rgba(0, 0, 0, 0.26)',
                              border: '1px solid rgba(0, 0, 0, 0.12)',
                            },
                          }}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleCancelEdit('personalNumber')}
                          sx={{
                            color: '#f44336',
                            bgcolor: 'rgba(244, 67, 54, 0.1)',
                            border: '1px solid rgba(244, 67, 54, 0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(244, 67, 54, 0.2)',
                              transform: 'scale(1.05)',
                            },
                          }}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleEditField('personalNumber')}
                        sx={{
                          color: '#6366f1',
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(99, 102, 241, 0.2)',
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={8} md={6}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  label={t('auth:dateOfBirth')}
                  value={formData.dateOfBirth}
                  onChange={handleInputChange('dateOfBirth')}
                  disabled={!editingFields.dateOfBirth}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      border: theme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      },
                      '&.Mui-focused': {
                        border: '1px solid rgba(99, 102, 241, 0.5)',
                        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.02)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        '&:hover': {
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        },
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    endAdornment: editingFields.dateOfBirth ? (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleSaveField('dateOfBirth')}
                          disabled={loading}
                          sx={{
                            color: '#4CAF50',
                            bgcolor: 'rgba(76, 175, 80, 0.1)',
                            border: '1px solid rgba(76, 175, 80, 0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(76, 175, 80, 0.2)',
                              transform: 'scale(1.05)',
                            },
                            '&:disabled': {
                              bgcolor: 'rgba(0, 0, 0, 0.12)',
                              color: 'rgba(0, 0, 0, 0.26)',
                              border: '1px solid rgba(0, 0, 0, 0.12)',
                            },
                          }}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleCancelEdit('dateOfBirth')}
                          sx={{
                            color: '#f44336',
                            bgcolor: 'rgba(244, 67, 54, 0.1)',
                            border: '1px solid rgba(244, 67, 54, 0.2)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(244, 67, 54, 0.2)',
                              transform: 'scale(1.05)',
                            },
                          }}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleEditField('dateOfBirth')}
                        sx={{
                          color: '#6366f1',
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'rgba(99, 102, 241, 0.2)',
                            transform: 'scale(1.05)',
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>


      {/* Security Section */}
      <Card 
        sx={(theme) => ({
          borderRadius: 3,
          border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          mb: 3,
          overflow: 'hidden',
        })}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              mb: 3,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('account:security')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  width: 50,
                  height: 50,
                  bgcolor: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  border: '2px solid rgba(34, 197, 94, 0.2)',
                }}
              >
                <SecurityIcon sx={{ fontSize: 24 }} />
              </Avatar>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {t('account:password')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('account:passwordDescriptionUpdated')}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              onClick={() => setChangePasswordOpen(true)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                border: '2px solid rgba(99, 102, 241, 0.3)',
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.05)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '2px solid rgba(99, 102, 241, 0.5)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {t('account:changePassword')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card 
        sx={(theme) => ({
          borderRadius: 3,
          border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        })}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              mb: 3,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('account:accountActions')}
          </Typography>

          <Stack spacing={2}>
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={() => navigate('/orders')}
              fullWidth
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                border: '2px solid rgba(99, 102, 241, 0.3)',
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.05)',
                transition: 'all 0.2s ease',
                py: 1.5,
                '&:hover': {
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '2px solid rgba(99, 102, 241, 0.5)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {t('account:viewOrders')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (window.confirm(t('account:deleteAccountConfirm'))) {
                  // In a real app, you would call an API to delete the account
                  setSnackbar({
                    open: true,
                    message: t('account:deleteAccountSuccess'),
                    severity: 'info',
                  });
                }
              }}
              fullWidth
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                border: '2px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.05)',
                transition: 'all 0.2s ease',
                py: 1.5,
                '&:hover': {
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '2px solid rgba(239, 68, 68, 0.5)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {t('account:deleteAccount')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog 
        open={changePasswordOpen} 
        onClose={() => setChangePasswordOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: (theme) => ({
            borderRadius: 3,
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.08)',
            background: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 32px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
              : '0 32px 64px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }),
        }}
      >
        <DialogTitle
          sx={(theme) => ({
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            borderBottom: theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.1)',
            p: 3,
          })}
        >
          <Typography 
            variant="h6"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('account:changePassword')}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                border: '3px solid rgba(99, 102, 241, 0.2)',
                mx: 'auto',
                mb: 3,
              }}
            >
              <SecurityIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              {t('account:passwordChangeTitle')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {user?.provider === 'google' 
                ? t('account:passwordChangeGoogleMessage')
                : user?.provider === 'apple'
                ? t('account:passwordChangeAppleMessage')
                : t('account:passwordChangeGenericMessage')
              }
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'center' }}>
          <Button 
            onClick={() => setChangePasswordOpen(false)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              border: '2px solid rgba(156, 163, 175, 0.3)',
              color: 'text.secondary',
              background: 'rgba(156, 163, 175, 0.05)',
              transition: 'all 0.2s ease',
              px: 3,
              py: 1,
              mr: 2,
              '&:hover': {
                background: 'rgba(156, 163, 175, 0.1)',
                border: '2px solid rgba(156, 163, 175, 0.5)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {t('account:cancel')}
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
              border: 'none',
              px: 3,
              py: 1,
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {t('account:continue')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MyAccount;
