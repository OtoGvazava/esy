import React, { useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Badge,
  Stack,
  Fade,
  Slide,
  CardMedia,
} from '@mui/material';
import {
  ShoppingBagOutlined,
  LocalShippingOutlined,
  CheckCircleOutlined,
  CancelOutlined,
  RefreshOutlined,
  VisibilityOutlined,
  CloseOutlined,
  TrendingUpOutlined,
  ReceiptOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useOrders } from '../contexts/OrdersContext';
import { useAuth } from '../contexts/AuthContext';

const MyOrders = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation('orders');
  const { orders, getTotalOrders, getTotalSpent } = useOrders();
  const { user } = useAuth();
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Filter orders by status
  const filteredOrders = useMemo(() => {
    const statusFilters = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const currentFilter = statusFilters[selectedTab];
    
    if (currentFilter === 'all') {
      return orders;
    }
    return orders.filter(order => order.status === currentFilter);
  }, [orders, selectedTab]);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      processing: 'primary',
      shipped: 'secondary',
      delivered: 'success',
      cancelled: 'error',
      refunded: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <RefreshOutlined />,
      confirmed: <CheckCircleOutlined />,
      processing: <ReceiptOutlined />,
      shipped: <LocalShippingOutlined />,
      delivered: <CheckCircleOutlined />,
      cancelled: <CancelOutlined />,
      refunded: <RefreshOutlined />,
    };
    return icons[status] || <ShoppingBagOutlined />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedOrder(null);
  };

  const averageOrderValue = getTotalOrders() > 0 ? getTotalSpent() / getTotalOrders() : 0;

  const tabLabels = [
    t('allOrders'),
    t('status.pending'),
    t('status.confirmed'),
    t('status.processing'),
    t('status.shipped'),
    t('status.delivered'),
    t('status.cancelled'),
  ];

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
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
            <ShoppingBagOutlined sx={{ fontSize: 40 }} />
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
            {t('myOrders')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please log in to view your orders
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
          {t('myOrders')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('orderHistory')}
        </Typography>
      </Box>

      {/* Order Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <Paper 
            sx={(theme) => ({
              p: 3, 
              textAlign: 'center',
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
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': { 
                transform: 'translateY(-4px)', 
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.2)'
                  : '0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(99, 102, 241, 0.2)',
              },
            })}
          >
            <Badge 
              badgeContent={getTotalOrders()} 
              sx={{
                '& .MuiBadge-badge': {
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  fontWeight: 600,
                  border: '2px solid white',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  border: '2px solid rgba(99, 102, 241, 0.2)',
                }}
              >
                <ShoppingBagOutlined sx={{ fontSize: 30 }} />
              </Avatar>
            </Badge>
            <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
              {t('orderStats.totalOrders')}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper 
            sx={(theme) => ({
              p: 3, 
              textAlign: 'center',
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
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': { 
                transform: 'translateY(-4px)', 
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.2)'
                  : '0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(99, 102, 241, 0.2)',
              },
            })}
          >
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e',
                border: '2px solid rgba(34, 197, 94, 0.2)',
                mx: 'auto',
              }}
            >
              <TrendingUpOutlined sx={{ fontSize: 30 }} />
            </Avatar>
            <Typography 
              variant="h6" 
              sx={{ 
                mt: 2, 
                fontWeight: 600,
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ₾{getTotalSpent().toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('orderStats.totalSpent')}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper 
            sx={(theme) => ({
              p: 3, 
              textAlign: 'center',
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
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': { 
                transform: 'translateY(-4px)', 
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.2)'
                  : '0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(99, 102, 241, 0.2)',
              },
            })}
          >
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                mx: 'auto',
              }}
            >
              <ReceiptOutlined sx={{ fontSize: 30 }} />
            </Avatar>
            <Typography 
              variant="h6" 
              sx={{ 
                mt: 2, 
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ₾{averageOrderValue.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('orderStats.averageOrder')}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper 
        sx={(theme) => ({
          borderRadius: 3,
          border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          mb: 3,
          overflow: 'hidden',
        })}
      >
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: 48,
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.05)',
              },
              '&.Mui-selected': {
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.1)',
              },
            },
            '& .MuiTabs-indicator': {
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {tabLabels.map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>
      </Paper>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Paper 
          sx={(theme) => ({
            textAlign: 'center', 
            py: 8,
            borderRadius: 3,
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.08)',
            background: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
          })}
        >
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
            <ShoppingBagOutlined sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('noOrders')}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {t('noOrdersMessage')}
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            href="/"
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
              border: 'none',
              borderRadius: 2,
              px: 4,
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 12px 40px rgba(99, 102, 241, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            {t('startShopping')}
          </Button>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {filteredOrders.map((order, index) => (
            <Slide key={order.id} direction="up" in={true} timeout={300 + index * 100}>
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
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'visible',
                  '&:hover': { 
                    transform: 'translateY(-4px)', 
                    boxShadow: theme.palette.mode === 'dark'
                      ? '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.2)'
                      : '0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(99, 102, 241, 0.2)',
                  },
                })}
              >
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t('orderNumber')}{order.id.split('_')[1]}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(order.createdAt)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Chip
                        icon={getStatusIcon(order.status)}
                        label={t(`status.${order.status}`)}
                        color={getStatusColor(order.status)}
                        variant="outlined"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          border: '2px solid',
                          '& .MuiChip-icon': {
                            fontSize: '1rem',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t('trackingNumber')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                        {order.trackingNumber}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
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
                        ₾{order.total.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {order.items?.length || 0} {t('items')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityOutlined />}
                        onClick={() => handleViewDetails(order)}
                        fullWidth={isMobile}
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
                        {t('viewDetails')}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Slide>
          ))}
        </Stack>
      )}

      {/* Order Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
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
          <Box display="flex" justifyContent="space-between" alignItems="center">
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
              {t('orderDetails')} #{selectedOrder?.id.split('_')[1]}
            </Typography>
            <IconButton 
              onClick={handleCloseDetails}
              sx={(theme) => ({
                color: 'text.secondary',
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
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(0, 0, 0, 0.1)',
                  transform: 'scale(1.05)',
                  color: 'text.primary',
                },
              })}
            >
              <CloseOutlined />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedOrder && (
            <Box>
              {/* Order Status */}
              <Box mb={3}>
                <Chip
                  icon={getStatusIcon(selectedOrder.status)}
                  label={t(`status.${selectedOrder.status}`)}
                  color={getStatusColor(selectedOrder.status)}
                  size="large"
                  sx={{
                    fontWeight: 600,
                    border: '2px solid',
                    '& .MuiChip-icon': {
                      fontSize: '1.2rem',
                    },
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t(`statusDescription.${selectedOrder.status}`)}
                </Typography>
              </Box>

              <Grid container spacing={3}>
                {/* Order Items */}
                <Grid item xs={12} md={6}>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {t('items')}
                  </Typography>
                  <Paper 
                    sx={(theme) => ({
                      borderRadius: 2,
                      border: theme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      overflow: 'hidden',
                    })}
                  >
                    <List sx={{ p: 0 }}>
                      {selectedOrder.items?.map((item, index) => (
                        <ListItem 
                          key={index} 
                          divider={index < selectedOrder.items.length - 1}
                          sx={{ p: 2 }}
                        >
                          <ListItemAvatar>
                            <Avatar 
                              src={item.image} 
                              alt={item.name}
                              sx={{
                                width: 50,
                                height: 50,
                                border: '2px solid rgba(99, 102, 241, 0.2)',
                              }}
                            />
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" fontWeight={600}>
                                {item.name}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                {t('quantity')}: {item.quantity} × ₾{item.price.toFixed(2)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>

                {/* Order Summary */}
                <Grid item xs={12} md={6}>
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {t('orderSummary')}
                  </Typography>
                  <Paper 
                    sx={(theme) => ({
                      p: 2,
                      borderRadius: 2,
                      border: theme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                    })}
                  >
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{t('subtotal')}</Typography>
                      <Typography variant="body2" fontWeight={500}>₾{(selectedOrder.total * 0.9).toFixed(2)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{t('shipping')}</Typography>
                      <Typography variant="body2" fontWeight={500}>₾{(selectedOrder.total * 0.05).toFixed(2)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{t('tax')}</Typography>
                      <Typography variant="body2" fontWeight={500}>₾{(selectedOrder.total * 0.05).toFixed(2)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('total')}</Typography>
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
                        ₾{selectedOrder.total.toFixed(2)}
                      </Typography>
                    </Box>
                  </Paper>

                  {/* Order Info */}
                  <Paper 
                    sx={(theme) => ({
                      mt: 3,
                      p: 2,
                      borderRadius: 2,
                      border: theme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                    })}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('orderPlaced')}: {formatDate(selectedOrder.createdAt)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('trackingNumber')}: <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{selectedOrder.trackingNumber}</span>
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={handleCloseDetails}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
              border: 'none',
              color: 'white',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyOrders;
