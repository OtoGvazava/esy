/* global process */
import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          onRetry={this.handleRetry}
          fallback={this.props.fallback}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, onRetry, fallback }) => {
  const { t } = useTranslation(['common']);

  if (fallback) {
    return fallback;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        p: 4,
        textAlign: 'center',
      }}
    >
      <ErrorOutlineIcon 
        sx={{ 
          fontSize: 64, 
          color: 'error.main', 
          mb: 2, 
        }} 
      />
      
      <Typography variant="h5" gutterBottom>
        {t('common:errorBoundary.title', 'Something went wrong')}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        {t('common:errorBoundary.message', 'We encountered an unexpected error. Please try again.')}
      </Typography>

      {process.env.NODE_ENV === 'development' && error && (
        <Alert severity="error" sx={{ mb: 2, maxWidth: 600, textAlign: 'left' }}>
          <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
            {error.toString()}
          </Typography>
        </Alert>
      )}

      <Button 
        variant="contained" 
        onClick={onRetry}
        sx={{ mt: 2 }}
      >
        {t('common:errorBoundary.retry', 'Try Again')}
      </Button>
    </Box>
  );
};

export default ErrorBoundary;
