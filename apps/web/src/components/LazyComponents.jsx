// Lazy-loaded components for better performance
import { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Loading component
const LoadingSpinner = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="200px"
  >
    <CircularProgress />
  </Box>
);

// Lazy load heavy components
export const LazyProductDetails = lazy(() => import('../pages/ProductDetails'));
export const LazyMyAccount = lazy(() => import('../pages/MyAccount'));
export const LazyMyOrders = lazy(() => import('../pages/MyOrders'));

// Higher-order component for lazy loading with suspense
export const withSuspense = (Component) => {
  return (props) => (
    <Suspense fallback={<LoadingSpinner />}>
      <Component {...props} />
    </Suspense>
  );
};

// Lazy components with suspense
export const ProductDetails = withSuspense(LazyProductDetails);
export const MyAccount = withSuspense(LazyMyAccount);
export const MyOrders = withSuspense(LazyMyOrders);

