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
import enOwner from './locales/en/owner.json';
import kaOwner from './locales/ka/owner.json';
import enAdminConfig from './locales/en/adminConfig.json';
import enManager from './locales/en/manager.json';
import kaAdminConfig from './locales/ka/adminConfig.json';
import kaManager from './locales/ka/manager.json';

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
    owner: enOwner,
    adminConfig: enAdminConfig,
    manager: enManager,
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
    owner: kaOwner,
    adminConfig: kaAdminConfig,
    manager: kaManager,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    // Georgian-first: esy serves Georgian merchants and shoppers, so a first
    // visit lands in Georgian and English is one toggle away. A stored choice
    // always wins. Keep this in step with useAppTheme's initializer — both are
    // read before React mounts, so a disagreement shows as a flash of the
    // wrong language.
    lng: (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEYS.LANGUAGE)) || LANGUAGES.KA,
    // Fallback stays English: an untranslated key should surface readable text
    // rather than a raw key, and English is the language every contributor reads.
    fallbackLng: LANGUAGES.EN,
    interpolation: { escapeValue: false },
    ns: ['navbar', 'home', 'cart', 'product', 'auth', 'orders', 'account', 'common', 'platform', 'storefront', 'owner', 'adminConfig', 'manager'],
    defaultNS: 'navbar',
  });

export default i18n;


