// What the storefront's chrome shares: the one list of places a shopper can go
// (the store's menu draws it six ways), and whether StoreBar is the header.
import { useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../contexts/CartContext';
import { Icon } from '../glow/GlowPrimitives';

/**
 * Shop · search · bag · orders · account, each a real route, with the bag's
 * live count. `Icon` is the glyph's component; the tab bar swaps in the
 * signed-in avatar and first name for the account item.
 */
export function useStoreNav() {
  const { pathname } = useLocation();
  const { getTotalItems } = useCart();
  const { t } = useTranslation('navbar');
  const count = getTotalItems();
  const items = [
    { key: 'shop', to: '/', label: t('dock.shop'), Icon: Icon.grid, active: pathname === '/' || pathname.startsWith('/product') },
    { key: 'search', to: '/search', label: t('dock.search'), Icon: Icon.search, active: pathname === '/search' },
    { key: 'bag', to: '/cart', label: t('dock.bag'), Icon: Icon.bag, badge: count, active: ['/cart', '/checkout', '/success'].includes(pathname) },
    // Orders is where a shopper goes back to, so it has its own place rather
    // than sitting under Account.
    { key: 'orders', to: '/orders', label: t('dock.orders'), Icon: Icon.check, active: pathname === '/orders' },
    { key: 'account', to: '/account', label: t('dock.account'), Icon: Icon.user, active: pathname === '/account' },
  ];
  return { items, count };
}

// StoreBar is the header wherever App.jsx mounts it (tablet and desktop today).
// Where it is absent, Home draws the store's own header and GlowDock draws the
// menu. App.jsx decides which; this lets the rest follow without a second copy
// of its breakpoint. Both sides run in layout effects, so a change lands before
// the browser paints and no frame ever shows both headers.
let bars = 0;
// StoreBar's height, border included: a page toolbar pins under it.
export const STORE_BAR_H = 76;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

/** Called by StoreBar: it is on screen while mounted. */
export function useStoreBarMounted() {
  useLayoutEffect(() => {
    bars += 1;
    notify();
    return () => {
      bars -= 1;
      notify();
    };
  }, []);
}

/** True while StoreBar is the header. */
export function useStoreBarShown() {
  const [shown, setShown] = useState(() => bars > 0);
  useLayoutEffect(() => {
    const update = () => setShown(bars > 0);
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  return shown;
}
