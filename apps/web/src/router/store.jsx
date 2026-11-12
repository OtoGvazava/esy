// <sub>.esy.ge — a store's own routes, under the store's chrome (StoreLayout).
//
// This table is its own chunk (router/index.jsx loads the host's table only).
// The screens a shopper lands on or taps first — the shop, a product, the
// bag, search — come with it; the rest are their own chunks, fetched when a
// link to them is pointed at or pressed (prime.js), or once the page is idle,
// and the router keeps the old screen up while one arrives.
import { Navigate } from 'react-router-dom';
import { GoTo, StoreLayout } from '../App';
import { platformUrl } from '../utils/hosts';
import Home from '../pages/Home';
import ProductDetails from '../pages/ProductDetails';
import SearchOverlay from '../pages/SearchOverlay';
import Cart from '../pages/Cart';
import {
  aboutLoader, checkoutLoader, homeLoader, orderLoader, ordersLoader, productLoader,
} from './storeLoaders';
import { lazyScreen, searchStays } from './prime';
import { accountRoute } from './accountRoutes';

// The home page and a collection share an address: a sort, a search or a
// filter is a change within the page and never waits, but moving to another
// collection (or back to the shop) is a new screen and waits for its list.
const homeRevalidate = ({ currentUrl, nextUrl, defaultShouldRevalidate }) => (
  currentUrl.pathname !== nextUrl.pathname
  || currentUrl.searchParams.get('category') !== nextUrl.searchParams.get('category')
    ? defaultShouldRevalidate : false
);

export const routes = [{
  element: <StoreLayout />,
  children: [
    { index: true, element: <Home />, loader: homeLoader, shouldRevalidate: homeRevalidate },
    { path: 'product/:id', element: <ProductDetails />, loader: productLoader },
    { path: 'about', lazy: lazyScreen(() => import('../pages/StoreAbout')), loader: aboutLoader },
    { path: 'search', element: <SearchOverlay /> },
    { path: 'cart', element: <Cart /> },
    // Checkout's steps live in ?step=: moving between them never waits.
    { path: 'checkout', lazy: lazyScreen(() => import('../pages/Checkout')), loader: checkoutLoader, shouldRevalidate: searchStays },
    { path: 'pay/return', lazy: lazyScreen(() => import('../pages/PayReturn')) },
    { path: 'success', lazy: lazyScreen(() => import('../pages/OrderSuccess')) },
    // The esy account (S1–S5), inside the store: its bar, its menu, its theme.
    // Signed out the overview signs in, and language and display still works.
    accountRoute(lazyScreen(() => import('../pages/AccountPage'))),
    { path: 'orders', lazy: lazyScreen(() => import('../pages/Orders')), loader: ordersLoader },
    { path: 'orders/:orderNumber', lazy: lazyScreen(() => import('../pages/OrderDetail')), loader: orderLoader },
    { path: 'signin', lazy: lazyScreen(() => import('../pages/SignIn')) },
    { path: 'auth/callback', lazy: lazyScreen(() => import('../pages/AuthCallback')) },
    // Language and display became an account section; old links land there.
    { path: 'settings/display', element: <Navigate to="/account/display" replace /> },
    { path: 'settings/language', element: <Navigate to="/account/display" replace /> },
    { path: 'settings/appearance', element: <Navigate to="/account/display" replace /> },
    // /create-store was a real storefront route until the duplicate wizard was
    // removed. Bookmarks and old links still point at it, so it forwards to the
    // one flow that remains rather than dead-ending.
    { path: 'create-store', element: <GoTo href={platformUrl('/sell')} /> },
    // Without this, an unknown path rendered a blank page — the shell drew, the
    // router matched nothing, and the shopper got the chrome around an empty
    // middle.
    { path: '*', element: <Navigate to="/" replace /> },
  ],
}];

/** Where a shopper goes next from the shop, warmed once the page is idle. */
export const next = ['/orders', '/checkout'];
