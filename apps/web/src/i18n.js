import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { STORAGE_KEYS, LANGUAGES } from './constants';

import enNavbar from './locales/en/navbar.json';
import kaNavbar from './locales/ka/navbar.json';
import enHome from './locales/en/home.json';
import kaHome from './locales/ka/home.json';
import enCart from './locales/en/cart.json';
import kaCart from './locales/ka/cart.json';
import enProduct from './locales/en/product.json';
import kaProduct from './locales/ka/product.json';
import enAuth from './locales/en/auth.json';
import kaAuth from './locales/ka/auth.json';
import enOrders from './locales/en/orders.json';
import kaOrders from './locales/ka/orders.json';
import enAccount from './locales/en/account.json';
import kaAccount from './locales/ka/account.json';
import enCommon from './locales/en/common.json';
import kaCommon from './locales/ka/common.json';
import enPlatform from './locales/en/platform.json';
import kaPlatform from './locales/ka/platform.json';
import enStorefront from './locales/en/storefront.json';
import kaStorefront from './locales/ka/storefront.json';

const resources = {
  en: {
    navbar: enNavbar,
    home: enHome,
    cart: enCart,
    product: enProduct,
    auth: enAuth,
    orders: enOrders,
    account: enAccount,
    common: enCommon,
    platform: enPlatform,
    storefront: enStorefront,
  },
  ka: {
    navbar: kaNavbar,
    home: kaHome,
    cart: kaCart,
    product: kaProduct,
    auth: kaAuth,
    orders: kaOrders,
    account: kaAccount,
    common: kaCommon,
    platform: kaPlatform,
    storefront: kaStorefront,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEYS.LANGUAGE)) || LANGUAGES.EN,
    fallbackLng: LANGUAGES.EN,
    interpolation: { escapeValue: false },
    ns: ['navbar', 'home', 'cart', 'product', 'auth', 'orders', 'account', 'common', 'platform', 'storefront'],
    defaultNS: 'navbar',
  });

export default i18n;


