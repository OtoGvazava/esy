import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  Grid,
  useTheme,
  Divider,
  Alert,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  CircularProgress,
  Fade,
  Zoom,
  LinearProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const MultiStepRegistration = ({ open, onClose, onComplete, userData }) => {
  const theme = useTheme();
  const { t } = useTranslation('auth');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showChangePhone, setShowChangePhone] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    personalNumber: '',
    dateOfBirth: null,
    phoneNumber: '',
    email: userData?.email || ''
  });

  const [errors, setErrors] = useState({});

  const steps = [
    { label: t('step1Title'), icon: <PersonIcon /> },
    { label: t('step2Title'), icon: <SecurityIcon /> },
    { label: t('step3Title'), icon: <PhoneIcon /> }
  ];

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = t('firstNameRequired');
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('lastNameRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.personalNumber.trim()) {
      newErrors.personalNumber = t('personalNumberRequired');
    } else {
      const cleanedNumber = formData.personalNumber.replace(/\s/g, '');
      if (!/^\d{11}$/.test(cleanedNumber)) {
        newErrors.personalNumber = t('personalNumberInvalid');
      }
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = t('dateOfBirthRequired');
    } else {
      const today = new Date();
      const birthDate = new Date(formData.dateOfBirth);
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.dateOfBirth = t('ageRestriction');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = t('phoneNumberRequired');
    } else {
      const cleanedPhone = formData.phoneNumber.replace(/\s/g, '');
      if (!/^(\+995|995|0)?[5-9]\d{8}$/.test(cleanedPhone)) {
        newErrors.phoneNumber = t('phoneNumberInvalid');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;
    
    switch (currentStep) {
      case 0:
        isValid = validateStep1();
        break;
      case 1:
        isValid = validateStep2();
        break;
      case 2:
        isValid = validateStep3();
        break;
      default:
        isValid = false;
    }

    if (isValid) {
      if (currentStep === 2) {
        if (showChangePhone) {
          // If user changed phone number, send OTP to new number
          handleSendOTP();
        } else if (!otpSent) {
          // If OTP hasn't been sent yet, send it
          handleSendOTP();
        } else {
          // This shouldn't happen, but just in case
          setCurrentStep(prev => prev + 1);
        }
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, dateOfBirth: date }));
    if (errors.dateOfBirth) {
      setErrors(prev => ({ ...prev, dateOfBirth: '' }));
    }
  };

  const formatPersonalNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    // If more than 11 digits, truncate to 11 and format
    const truncated = cleaned.slice(0, 11);
    return truncated.replace(/(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    
    // Limit to maximum 12 digits (995 + 9 digits)
    const limited = cleaned.slice(0, 12);
    
    if (limited.startsWith('995')) {
      return `+${limited}`;
    } else if (limited.startsWith('0')) {
      return `+995${limited.slice(1)}`;
    } else if (limited.length > 0 && !limited.startsWith('+')) {
      return `+995${limited}`;
    }
    return value;
  };

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      // Mock OTP sending - in real app, call your API
      await new Promise(resolve => setTimeout(resolve, 2000));
      setOtpSent(true);
      setOtpError('');
      setShowChangePhone(false); // Hide phone input after sending OTP
    } catch (error) {
      setOtpError(t('otpSendError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      // Mock OTP verification - in real app, verify with your API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (otpCode === '1234') { // Mock verification code
        setOtpVerified(true);
        setOtpError('');
        await handleCompleteRegistration();
      } else {
        setOtpError(t('otpInvalid'));
      }
    } catch (error) {
      setOtpError(t('otpVerifyError'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhone = () => {
    setShowChangePhone(true);
    setOtpSent(false);
    setOtpVerified(false);
    setOtpCode('');
    setOtpError('');
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      // Mock OTP sending - in real app, call your API
      await new Promise(resolve => setTimeout(resolve, 2000));
      setOtpSent(true);
      setOtpError('');
      setShowChangePhone(false);
    } catch (error) {
      setOtpError(t('otpSendError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    try {
      const completeUserData = {
        ...userData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        personalNumber: formData.personalNumber.replace(/\s/g, ''),
        dateOfBirth: formData.dateOfBirth,
        phoneNumber: formData.phoneNumber.replace(/\s/g, ''),
        email: formData.email.trim(),
        isNewUser: false,
        registrationCompleted: true,
        phoneVerified: true
      };

      await onComplete(completeUserData);
      
      // Show success screen
      setShowSuccess(true);
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        setRedirecting(true);
        setTimeout(() => {
          onClose();
          // Scroll to top of home page
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 1000);
      }, 3000);
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={4} textAlign="center">
        {t('step1Description')}
      </Typography>
      
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} sm={5} md={4}>
          <TextField
            fullWidth
            label={t('firstName')}
            value={formData.firstName}
            onChange={handleInputChange('firstName')}
            error={!!errors.firstName}
            helperText={errors.firstName}
            variant="outlined"
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
                }
              }
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={5} md={4}>
          <TextField
            fullWidth
            label={t('lastName')}
            value={formData.lastName}
            onChange={handleInputChange('lastName')}
            error={!!errors.lastName}
            helperText={errors.lastName}
            variant="outlined"
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
                }
              }
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={4} textAlign="center">
        {t('step2Description')}
      </Typography>
      
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} sm={8} md={6}>
          <TextField
            fullWidth
            label={t('personalNumber')}
            value={formData.personalNumber}
            onChange={(e) => {
              const formatted = formatPersonalNumber(e.target.value);
              setFormData(prev => ({ ...prev, personalNumber: formatted }));
              if (errors.personalNumber) {
                setErrors(prev => ({ ...prev, personalNumber: '' }));
              }
            }}
            error={!!errors.personalNumber}
            helperText={errors.personalNumber || t('personalNumberHelp')}
            variant="outlined"
            placeholder="123 45 67 89 01"
            inputProps={{ maxLength: 13 }} // 11 digits + 2 spaces
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
                }
              }
            }}
          />
        </Grid>

        <Grid item xs={12} sm={8} md={6}>
          <DatePicker
            label={t('dateOfBirth')}
            value={formData.dateOfBirth}
            onChange={handleDateChange}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.dateOfBirth,
                helperText: errors.dateOfBirth,
                variant: 'outlined',
                sx: {
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }
              }
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={4} textAlign="center">
        {t('step3Description')}
      </Typography>
      
      {!otpSent || showChangePhone ? (
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} sm={8} md={6}>
            <TextField
              fullWidth
              label={t('phoneNumber')}
              value={formData.phoneNumber}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                setFormData(prev => ({ ...prev, phoneNumber: formatted }));
                if (errors.phoneNumber) {
                  setErrors(prev => ({ ...prev, phoneNumber: '' }));
                }
              }}
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber || t('phoneNumberHelp')}
              variant="outlined"
              placeholder="+995 5XX XXX XXX"
              inputProps={{ maxLength: 15 }} // +995 + 9 digits + spaces
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Grid>
        </Grid>
      ) : !otpVerified ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              maxWidth: 400,
              width: '100%',
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(76, 175, 80, 0.1)' 
                : 'rgba(76, 175, 80, 0.05)',
              border: theme.palette.mode === 'dark'
                ? '1px solid rgba(76, 175, 80, 0.2)'
                : '1px solid rgba(76, 175, 80, 0.1)',
              backdropFilter: 'blur(10px)',
              '& .MuiAlert-message': {
                display: 'flex',
                alignItems: 'center',
                gap: 1
              },
              '& .MuiAlert-icon': {
                color: '#4CAF50'
              }
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {t('otpSentMessage', { phone: formData.phoneNumber })}
              </Typography>
            </Box>
          </Alert>
          
          <TextField
            fullWidth
            label={t('enterOTP')}
            value={otpCode}
            onChange={(e) => {
              setOtpCode(e.target.value);
              setOtpError('');
            }}
            error={!!otpError}
            helperText={otpError || t('otpHelp')}
            variant="outlined"
            placeholder="1234"
            inputProps={{ maxLength: 4 }}
            sx={{
              maxWidth: 300,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="text"
              onClick={handleResendOTP}
              disabled={loading}
              sx={{ 
                textTransform: 'none',
                fontWeight: 500,
                color: theme.palette.primary.main
              }}
            >
              {t('resendOTP')}
            </Button>
            <Button
              variant="text"
              onClick={handleChangePhone}
              disabled={loading}
              sx={{ 
                textTransform: 'none',
                fontWeight: 500,
                color: theme.palette.text.secondary
              }}
            >
              {t('changePhoneNumber')}
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Alert severity="success" sx={{ 
            borderRadius: 2, 
            maxWidth: 400,
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(76, 175, 80, 0.1)' 
              : 'rgba(76, 175, 80, 0.05)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(76, 175, 80, 0.2)'
              : '1px solid rgba(76, 175, 80, 0.1)',
            backdropFilter: 'blur(10px)',
            '& .MuiAlert-icon': {
              color: '#4CAF50'
            }
          }}>
            {t('phoneVerified')}
          </Alert>
        </Box>
      )}
    </Box>
  );

  const renderSuccessScreen = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Zoom in={showSuccess} timeout={800}>
        <Box>
          <CheckCircleIcon 
            sx={{ 
              fontSize: 80, 
              color: '#4CAF50',
              mb: 3,
              filter: 'drop-shadow(0 4px 8px rgba(76, 175, 80, 0.3))'
            }} 
          />
          <Typography variant="h4" fontWeight={700} sx={{
            background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2
          }}>
            {t('registrationSuccess')}
          </Typography>
          <Typography variant="h6" color="text.secondary" mb={4}>
            {t('welcomeMessage', { name: formData.firstName })}
          </Typography>
          
          {redirecting && (
            <Fade in={redirecting} timeout={500}>
              <Box>
                <Typography variant="body1" color="text.secondary" mb={2}>
                  {t('redirectingMessage')}
                </Typography>
                <LinearProgress 
                  sx={{ 
                    borderRadius: 2,
                    height: 6,
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.1)' 
                      : 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 2,
                      background: 'linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%)'
                    }
                  }} 
                />
              </Box>
            </Fade>
          )}
        </Box>
      </Zoom>
    </Box>
  );

  const renderCurrentStep = () => {
    if (showSuccess) {
      return renderSuccessScreen();
    }
    
    switch (currentStep) {
      case 0:
        return renderStep1();
      case 1:
        return renderStep2();
      case 2:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: theme.palette.mode === 'dark' 
              ? '1px solid rgba(255,255,255,0.1)' 
              : '1px solid rgba(0,0,0,0.1)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)'
              : '0 32px 64px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 2,
          pt: 4,
          px: 4,
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          borderBottom: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255,255,255,0.1)' 
            : '1px solid rgba(0,0,0,0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              p: 1.5,
              borderRadius: 2,
              background: theme.palette.mode === 'dark' 
                ? 'rgba(99, 102, 241, 0.2)' 
                : 'rgba(99, 102, 241, 0.1)',
              border: '2px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {steps[currentStep]?.icon}
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em'
            }}>
              {showSuccess ? t('registrationComplete') : t('completeRegistration')}
            </Typography>
          </Box>
          {!showSuccess && (
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: 'inherit',
                p: 1.5,
                borderRadius: 2,
                bgcolor: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.05)',
                border: theme.palette.mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.2)'
                  : '1px solid rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.2)' 
                    : 'rgba(0,0,0,0.1)',
                  transform: 'scale(1.05)',
                  color: 'text.primary',
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent sx={{ px: 4, py: 3, pt: 10 }}>
          {/* Progress Stepper */}
          {!showSuccess && (
            <Stepper 
              activeStep={currentStep} 
              sx={{ 
                mb: 4,
                '& .MuiStepLabel-root': {
                  '& .MuiStepLabel-label': {
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                    marginLeft: '12px',
                    marginRight: '12px'
                  },
                  '& .MuiStepLabel-label.Mui-active': {
                    color: theme.palette.primary.main,
                    fontWeight: 700
                  },
                  '& .MuiStepLabel-label.Mui-completed': {
                    color: theme.palette.success.main,
                    fontWeight: 600
                  }
                },
                '& .MuiStepConnector-root': {
                  '& .MuiStepConnector-line': {
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.2)' 
                      : 'rgba(0,0,0,0.2)',
                    borderWidth: 2
                  }
                },
                '& .MuiStepConnector-root.Mui-active': {
                  '& .MuiStepConnector-line': {
                    borderColor: theme.palette.primary.main
                  }
                },
                '& .MuiStepConnector-root.Mui-completed': {
                  '& .MuiStepConnector-line': {
                    borderColor: theme.palette.success.main
                  }
                }
              }}
            >
              {steps.map((step, index) => (
                <Step key={index}>
                  <StepLabel
                    StepIconComponent={({ active, completed }) => (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: completed 
                            ? '#4CAF50'
                            : active 
                              ? '#6366f1'
                              : theme.palette.mode === 'dark' 
                                ? 'rgba(255,255,255,0.2)' 
                                : 'rgba(0,0,0,0.2)',
                          color: completed || active ? 'white' : 'inherit',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          boxShadow: active || completed 
                            ? '0 4px 12px rgba(99, 102, 241, 0.3)' 
                            : 'none',
                          transition: 'all 0.3s ease',
                          border: completed || active 
                            ? '2px solid rgba(99, 102, 241, 0.3)'
                            : '2px solid transparent'
                        }}
                      >
                        {completed ? (
                          <CheckCircleIcon sx={{ fontSize: 20 }} />
                        ) : (
                          index + 1
                        )}
                      </Box>
                    )}
                  >
                    {step.label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          )}

          <Alert severity="info" sx={{ 
            mb: 3, 
            borderRadius: 2,
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(33, 150, 243, 0.1)' 
              : 'rgba(33, 150, 243, 0.05)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(33, 150, 243, 0.2)'
              : '1px solid rgba(33, 150, 243, 0.1)',
            backdropFilter: 'blur(10px)',
            '& .MuiAlert-icon': {
              color: '#2196f3'
            }
          }}>
            {t('registrationInfo')}
          </Alert>

          {renderCurrentStep()}

          <Divider sx={{ my: 3, opacity: 0.5 }} />

          <Typography 
            variant="body2" 
            color="text.secondary" 
            textAlign="center"
            sx={{ fontSize: 14, lineHeight: 1.5 }}
          >
            {t('registrationPrivacyNotice')}
          </Typography>
        </DialogContent>

        {!showSuccess && (
          <DialogActions sx={{ px: 4, pb: 4, pt: 2 }}>
            <Button
              onClick={currentStep === 0 ? onClose : handleBack}
              color="inherit"
              sx={{ 
                textTransform: 'none', 
                fontWeight: 500,
                borderRadius: 2,
                px: 3,
                py: 1
              }}
            >
              {currentStep === 0 ? t('cancel') : t('back')}
            </Button>
            
            {currentStep === 2 && otpSent && !otpVerified && !showChangePhone ? (
              <Button
                onClick={handleVerifyOTP}
                variant="contained"
                disabled={loading || !otpCode}
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 4,
                  py: 1,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                  border: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  }
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : t('verifyOTP')}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                variant="contained"
                disabled={loading}
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 4,
                  py: 1,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                  border: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  }
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : 
                 currentStep === 2 ? t('sendOTP') : t('next')}
              </Button>
            )}
          </DialogActions>
        )}
      </Dialog>
    </LocalizationProvider>
  );
};

export default MultiStepRegistration;
