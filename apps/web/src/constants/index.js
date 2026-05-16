// Application constants
export const STORAGE_KEYS = {
  THEME_MODE: 'theme-mode',
  LANGUAGE: 'lang',
  USER: 'user',
  TOKEN: 'token',
  ORDERS: 'orders',
  CART: 'cart',
};

export const ROUTES = {
  HOME: '/',
  PRODUCT: '/product/:id',
  ORDERS: '/orders',
  ACCOUNT: '/account',
};

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
};

export const LANGUAGES = {
  EN: 'en',
  KA: 'ka',
};

export const DEVICE_BREAKPOINTS = {
  MOBILE_MAX: 768,
  TABLET_MAX: 1024,
};

export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
};

export const API_ENDPOINTS = {
  PRODUCTS: '/api/products',
  ORDERS: '/api/orders',
  AUTH: '/api/auth',
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred',
  AUTHENTICATION_ERROR: 'Authentication failed',
  VALIDATION_ERROR: 'Validation failed',
  UNKNOWN_ERROR: 'An unknown error occurred',
};

export const SUCCESS_MESSAGES = {
  ORDER_CREATED: 'Order created successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  CART_UPDATED: 'Cart updated successfully',
};

export const PLACEHOLDER_IMAGES = {
  PRODUCT: 'https://via.placeholder.com/300',
  AVATAR: 'https://via.placeholder.com/40',
  BANNER: 'https://via.placeholder.com/800x400',
};

export const CURRENCY = {
  CODE: 'USD',
  LOCALE: {
    EN: 'en-US',
    KA: 'ka-GE',
  },
};
