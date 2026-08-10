import React, { memo, useCallback, useMemo } from 'react';
import { CardActionArea, CardContent, CardMedia, Box, Typography } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CheckIcon from '@mui/icons-material/Check';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../hooks/useTheme';
import { useProductCardDimensions } from '../hooks/useProductCardDimensions';
import { PLACEHOLDER_IMAGES, ROUTES } from '../constants';
import { money } from '../core/money';
import Button from './common/Button';
import Card from './common/Card';

const ProductCard = memo(({ product, onClick }) => {
  const { t } = useTranslation(['product', 'cart']);
  const { addToCart, removeFromCart, items } = useCart();
  const navigate = useNavigate();
  const theme = useTheme();
  const { dimensions, getAnimationSettings, isSmallMobile, isLargeMobile } = useProductCardDimensions();
  
  const { title, name, price, image, thumbnail, id } = product || {};
  
  const displayTitle = useMemo(() => 
    title || name || t('fallbackTitle'), 
    [title, name, t],
  );
  
  const displayImage = useMemo(() => 
    image || thumbnail || PLACEHOLDER_IMAGES.PRODUCT, 
    [image, thumbnail],
  );
  
  // The platform's one money format (core/money): the ₾ always follows the
  // amount. Intl's GEL currency style placed it before the number in English,
  // and rounded to whole lari here while every other price on the same page
  // showed tetri.
  const displayPrice = useMemo(
    () => (typeof price === 'number' ? money(price) : price || ''),
    [price],
  );

  // Check if product is already in cart
  const isInCart = useMemo(() => {
    return items.some(item => item.id === id);
  }, [items, id]);

  const handleAddToCart = useCallback((e) => {
    e.stopPropagation();
    console.log('Add to cart clicked for product:', product);
    console.log('Cart function available:', typeof addToCart);
    try {
      addToCart(product);
      console.log('Product added to cart successfully');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  }, [addToCart, product]);

  const handleRemoveFromCart = useCallback((e) => {
    e.stopPropagation();
    console.log('Remove from cart clicked for product:', product);
    try {
      removeFromCart(id);
      console.log('Product removed from cart successfully');
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  }, [removeFromCart, id]);

  const handleProductClick = useCallback((e) => {
    console.log('Card clicked, target:', e.target);
    console.log('Card clicked, currentTarget:', e.currentTarget);
    if (onClick) {
      onClick();
    } else if (id) {
      navigate(ROUTES.PRODUCT.replace(':id', id));
    }
  }, [onClick, id, navigate]);

  const animationSettings = getAnimationSettings;
  
  // Determine if button should be icon-only based on screen size only
  const shouldShowIconOnly = useMemo(() => {
    // Only show icon-only on actual mobile devices (≤768px)
    // This ensures consistent appearance on desktop and larger screens
    return isSmallMobile || isLargeMobile;
  }, [isSmallMobile, isLargeMobile]);

  return (
    <Card sx={{ 
      width: dimensions.width, 
      height: dimensions.height,
      borderRadius: dimensions.borderRadius,
      transition: animationSettings.enableTransitions ? 'all 0.3s ease' : 'none',
      '&:hover': animationSettings.enableHover ? {
        transform: 'translateY(-4px)',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 12px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
          : '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08)',
      } : {},
    }}>
      <CardActionArea 
        onClick={handleProductClick} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'stretch', 
        }}
      >
        <Box sx={{ 
          position: 'relative', 
          height: dimensions.imageHeight, 
          overflow: 'hidden', 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          '&::before': animationSettings.enableTransitions ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            zIndex: 1,
          } : {},
          '&:hover::before': animationSettings.enableHover ? {
            opacity: 1,
          } : {},
        }}>
          <CardMedia
            component="img"
            image={displayImage}
            alt={displayTitle || t('fallbackImageAlt')}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: animationSettings.enableTransitions ? 'transform 0.3s ease' : 'none',
              '&:hover': animationSettings.enableHover ? {
                transform: 'scale(1.05)',
              } : {},
            }}
          />
        </Box>
        
        <CardContent sx={{ 
          p: dimensions.contentPadding || dimensions.padding, 
          width: '100%', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          background: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.02)'
            : 'rgba(255, 255, 255, 0.5)',
        }}>
          <Box>
            <Typography 
              variant="h6"
              sx={{ 
                fontWeight: 700,
                fontSize: dimensions.titleFontSize,
                letterSpacing: '-0.01em',
                marginBottom: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
              }}
            >
              {displayTitle}
            </Typography>
            {displayPrice && (
              <Typography 
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontSize: dimensions.priceFontSize,
                  margin: 0,
                  ...theme.textGradient,
                }}
              >
                {displayPrice}
              </Typography>
            )}
          </Box>
          
          {isInCart ? (
            <Button
              variant="outlined"
              startIcon={shouldShowIconOnly ? null : <RemoveShoppingCartIcon />}
              onClick={handleRemoveFromCart}
              size={dimensions.buttonSize}
              sx={{ 
                mt: dimensions.spacing,
                // Use violet color instead of blue
                backgroundColor: 'transparent',
                borderColor: '#8b5cf6', // Violet color
                color: '#8b5cf6', // Violet color
                '&:hover': {
                  backgroundColor: '#8b5cf6', // Violet background on hover
                  color: '#ffffff', // White text on hover
                },
                // Ensure icon color matches border color
                '& .MuiButton-startIcon': {
                  color: 'inherit',
                },
                // For icon-only buttons, use custom dimensions
                ...(shouldShowIconOnly ? {
                  height: dimensions.buttonHeight || 28,
                  minHeight: dimensions.buttonHeight || 28,
                  minWidth: dimensions.buttonHeight || 28,
                  padding: 0,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '& .MuiButton-startIcon': {
                    margin: 0,
                  },
                } : {
                  // For text buttons, ensure proper height and padding
                  height: 'auto',
                  minHeight: 40, // Ensure minimum height for text
                  padding: '8px 16px', // Proper padding for text
                  fontSize: '0.875rem', // Readable font size
                  lineHeight: 1.2,
                  '& .MuiButton-startIcon': {
                    marginRight: '8px',
                  },
                }),
              }}
              title={shouldShowIconOnly ? t('cart:remove') : undefined} // Tooltip for icon-only button
            >
              {shouldShowIconOnly ? <RemoveShoppingCartIcon sx={{ fontSize: '1.2rem' }} /> : t('cart:remove')}
            </Button>
          ) : (
            <Button
              variant="primary"
              startIcon={shouldShowIconOnly ? null : <AddShoppingCartIcon />}
              onClick={handleAddToCart}
              size={dimensions.buttonSize}
              sx={{ 
                mt: dimensions.spacing,
                // For icon-only buttons, use custom dimensions
                ...(shouldShowIconOnly ? {
                  height: dimensions.buttonHeight || 28,
                  minHeight: dimensions.buttonHeight || 28,
                  minWidth: dimensions.buttonHeight || 28,
                  padding: 0,
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '& .MuiButton-startIcon': {
                    margin: 0,
                  },
                } : {
                  // For text buttons, ensure proper height and padding
                  height: 'auto',
                  minHeight: 40, // Ensure minimum height for text
                  padding: '8px 16px', // Proper padding for text
                  fontSize: '0.875rem', // Readable font size
                  lineHeight: 1.2,
                  '& .MuiButton-startIcon': {
                    marginRight: '8px',
                  },
                }),
              }}
              title={shouldShowIconOnly ? t('cart:addToCart') : undefined} // Tooltip for icon-only button
            >
              {shouldShowIconOnly ? <AddShoppingCartIcon sx={{ fontSize: '1.2rem' }} /> : t('cart:addToCart')}
            </Button>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;


