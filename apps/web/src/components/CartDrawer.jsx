import { 
  Modal, 
  Box, 
  Typography, 
  IconButton, 
  Backdrop,
  Paper,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  CardMedia,
  Chip,
  Avatar,
  Fade,
  Slide,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { useTranslation } from 'react-i18next';
import { useCart, lineKey } from '../contexts/CartContext';
import { money } from '../core/money';

export default function CartDrawer({ open, onClose }) {
  const { t } = useTranslation('cart');
  const { items, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCart();
  
  // The platform's one money format (core/money): the ₾ always follows the
  // amount. Intl's GEL currency style put the symbol before the number in
  // English, so a cart line and the checkout total disagreed on the same price.
  const formatPrice = (price) => money(price);

  // Takes a line key, not a product id: with variants (D11) a product id no
  // longer names one row of the cart.
  const handleQuantityChange = (key, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(key);
    } else {
      updateQuantity(key, newQuantity);
    }
  };

  const handleCheckout = () => {
    // Placeholder for checkout functionality
    alert('Checkout functionality would be implemented here!');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      BackdropComponent={Backdrop}
      BackdropProps={{
        sx: (theme) => ({
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(0, 0, 0, 0.6)' 
            : 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }),
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: (theme) => theme.zIndex.modal,
        '& .MuiBackdrop-root': {
          zIndex: (theme) => theme.zIndex.modal - 1,
        },
        '& .MuiPaper-root': {
          zIndex: (theme) => theme.zIndex.modal + 1,
          position: 'relative',
        },
      }}
    >
      <Fade in={open} timeout={300}>
        <Paper
          sx={(theme) => ({
            width: { xs: 'calc(100vw - 32px)', sm: 400, md: 450 },
            maxWidth: { xs: 'calc(100vw - 32px)', sm: 400, md: 450 },
            maxHeight: { xs: 'calc(100vh - 32px)', sm: 'calc(100vh - 60px)', md: 'calc(100vh - 80px)' },
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 32px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
              : '0 32px 64px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.1)',
          })}
        >
        {/* Modern Header */}
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: { xs: 2, sm: 2.5, md: 3 },
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            borderBottom: theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.1)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.5) 50%, transparent 100%)',
            },
          })}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              sx={{
                bgcolor: 'rgba(99, 102, 241, 0.2)',
                color: '#6366f1',
                width: 40,
                height: 40,
                border: '2px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <ShoppingBagIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" component="h2" fontWeight={700} sx={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}>
                {t('title')}
              </Typography>
              {getTotalItems() > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {getTotalItems()} {getTotalItems() === 1 ? t('item') : t('items')}
                </Typography>
              )}
            </Box>
          </Stack>
          <IconButton
            onClick={onClose}
            size="medium"
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
            <CloseIcon />
          </IconButton>
        </Box>
        
        {/* Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {items.length === 0 ? (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 4, sm: 5, md: 6 },
                textAlign: 'center',
              }}
            >
              <Avatar
                sx={{
                  width: { xs: 60, sm: 70, md: 80 },
                  height: { xs: 60, sm: 70, md: 80 },
                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  mb: 3,
                  border: '2px solid rgba(99, 102, 241, 0.2)',
                }}
              >
                <ShoppingBagIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ mb: 1 }}>
                {t('empty')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
                Start adding products to your cart to see them here
              </Typography>
            </Box>
          ) : (
            <>
              {/* Modern Cart Items */}
              <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1.5, sm: 2 } }}>
                <Stack spacing={2}>
                  {items.map((item, index) => (
                    <Slide key={item.id} direction="up" in={true} timeout={300 + index * 100}>
                      <Card
                        sx={(theme) => ({
                          borderRadius: 2,
                          border: theme.palette.mode === 'dark'
                            ? '1px solid rgba(255, 255, 255, 0.1)'
                            : '1px solid rgba(0, 0, 0, 0.08)',
                          background: theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: theme.palette.mode === 'dark'
                              ? '0 8px 32px rgba(0, 0, 0, 0.1)'
                              : '0 8px 32px rgba(0, 0, 0, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                          },
                        })}
                      >
                        <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            {/* Product Image */}
                            <Box
                              sx={(theme) => ({
                                width: { xs: 60, sm: 65, md: 70 },
                                height: { xs: 60, sm: 65, md: 70 },
                                borderRadius: 2,
                                overflow: 'hidden',
                                border: theme.palette.mode === 'dark'
                                  ? '2px solid rgba(255, 255, 255, 0.1)'
                                  : '2px solid rgba(0, 0, 0, 0.08)',
                                flexShrink: 0,
                              })}
                            >
                              <CardMedia
                                component="img"
                                image={item.image || item.thumbnail || 'https://via.placeholder.com/70'}
                                alt={item.title || item.name}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </Box>

                            {/* Product Info */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="subtitle1" 
                                fontWeight={600}
                                sx={{ 
                                  mb: 0.5,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.title || item.name}
                              </Typography>
                              <Typography 
                                variant="h6" 
                                color="primary" 
                                fontWeight={700}
                                sx={{ mb: 1 }}
                              >
                                {formatPrice(item.price)}
                              </Typography>
                              
                              {/* Quantity Controls */}
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleQuantityChange(lineKey(item), item.quantity - 1)}
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    color: '#6366f1',
                                    '&:hover': {
                                      bgcolor: 'rgba(99, 102, 241, 0.2)',
                                      transform: 'scale(1.05)',
                                    },
                                  }}
                                >
                                  <RemoveIcon fontSize="small" />
                                </IconButton>
                                
                                <Box
                                  sx={(theme) => ({
                                    minWidth: 40,
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: theme.palette.mode === 'dark'
                                      ? 'rgba(255, 255, 255, 0.1)'
                                      : 'rgba(0, 0, 0, 0.05)',
                                    borderRadius: 1,
                                    border: theme.palette.mode === 'dark'
                                      ? '1px solid rgba(255, 255, 255, 0.2)'
                                      : '1px solid rgba(0, 0, 0, 0.1)',
                                  })}
                                >
                                  <Typography variant="body2" fontWeight={600}>
                                    {item.quantity}
                                  </Typography>
                                </Box>
                                
                                <IconButton
                                  size="small"
                                  onClick={() => handleQuantityChange(lineKey(item), item.quantity + 1)}
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: 'rgba(99, 102, 241, 0.1)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    color: '#6366f1',
                                    '&:hover': {
                                      bgcolor: 'rgba(99, 102, 241, 0.2)',
                                      transform: 'scale(1.05)',
                                    },
                                  }}
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Box>

                            {/* Remove Button */}
                            <IconButton
                              onClick={() => removeFromCart(lineKey(item))}
                              sx={{
                                color: 'error.main',
                                bgcolor: 'rgba(244, 67, 54, 0.1)',
                                border: '1px solid rgba(244, 67, 54, 0.2)',
                                '&:hover': {
                                  bgcolor: 'rgba(244, 67, 54, 0.2)',
                                  transform: 'scale(1.05)',
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Slide>
                  ))}
                </Stack>
              </Box>

              <Divider sx={(theme) => ({ 
                borderColor: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)',
              })} />

              {/* Modern Footer */}
              <Box 
                sx={(theme) => ({ 
                  p: { xs: 2, sm: 2.5, md: 3 }, 
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(99, 102, 241, 0.02) 0%, rgba(139, 92, 246, 0.02) 100%)',
                  borderTop: theme.palette.mode === 'dark'
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(0, 0, 0, 0.1)',
                })}
              >
                {/* Total Section */}
                <Card
                  sx={(theme) => ({
                    mb: 2,
                    borderRadius: 2,
                    background: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.8)',
                    border: theme.palette.mode === 'dark'
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(0, 0, 0, 0.08)',
                    backdropFilter: 'blur(10px)',
                  })}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight={600}>
                        {t('total')}
                      </Typography>
                      <Typography 
                        variant="h4" 
                        fontWeight={700}
                        sx={{
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {formatPrice(getTotalPrice())}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
                
                {/* Action Buttons */}
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    onClick={clearCart}
                    sx={(theme) => ({ 
                      flex: 1,
                      py: 1.5,
                      borderRadius: 2,
                      border: theme.palette.mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : '1px solid rgba(0, 0, 0, 0.2)',
                      color: 'text.secondary',
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.02)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        border: '1px solid rgba(244, 67, 54, 0.5)',
                        color: 'error.main',
                        background: 'rgba(244, 67, 54, 0.1)',
                        transform: 'translateY(-1px)',
                      },
                    })}
                    disabled={items.length === 0}
                  >
                    {t('clearCart')}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCheckout}
                    startIcon={<ShoppingCartCheckoutIcon />}
                    sx={{ 
                      flex: 2,
                      py: 1.5,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
                      border: 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        boxShadow: '0 12px 40px rgba(99, 102, 241, 0.4)',
                        transform: 'translateY(-2px)',
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                    }}
                    disabled={items.length === 0}
                  >
                    {t('checkout')}
                  </Button>
                </Stack>
              </Box>
            </>
          )}
        </Box>
      </Paper>
      </Fade>
    </Modal>
  );
}



