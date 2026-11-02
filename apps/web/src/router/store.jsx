// <sub>.esy.ge — a store's own routes, under the store's chrome (StoreLayout).
import { Navigate } from 'react-router-dom';
import { GoTo, StoreLayout } from '../App';
import { platformUrl } from '../utils/hosts';
import Home from '../pages/Home';
import ProductDetails from '../pages/ProductDetails';
import StoreAbout from '../pages/StoreAbout';
import SearchOverlay from '../pages/SearchOverlay';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import PayReturn from '../pages/PayReturn';
import OrderSuccess from '../pages/OrderSuccess';
import Account from '../pages/Account';
import PersonalDetails from '../pages/PersonalDetails';
import Orders from '../pages/Orders';
import OrderDetail from '../pages/OrderDetail';
import SignIn from '../pages/SignIn';
import AuthCallback from '../pages/AuthCallback';
import DisplaySettings from '../pages/DisplaySettings';
import {
  aboutLoader, checkoutLoader, homeLoader, orderLoader, ordersLoader, productLoader,
} from './storeLoaders';
import { searchStays } from './prime';

// The home page and a collection share an address: a sort, a search or a
// filter is a change within the page and never waits, but moving to another
// collection (or back to the shop) is a new screen and waits for its list.
const homeRevalidate = ({ currentUrl, nextUrl, defaultShouldRevalidate }) => (
  currentUrl.pathname !== nextUrl.pathname
  || currentUrl.searchParams.get('category') !== nextUrl.searchParams.get('category')
    ? defaultShouldRevalidate : false
);

export const storeRoutes = [{
  element: <StoreLayout />,
  children: [
    { index: true, element: <Home />, loader: homeLoader, shouldRevalidate: homeRevalidate },
    { path: 'product/:id', element: <ProductDetails />, loader: productLoader },
    { path: 'about', element: <StoreAbout />, loader: aboutLoader },
    { path: 'search', element: <SearchOverlay /> },
    { path: 'cart', element: <Cart /> },
    // Checkout's steps live in ?step=: moving between them never waits.
    { path: 'checkout', element: <Checkout />, loader: checkoutLoader, shouldRevalidate: searchStays },
    { path: 'pay/return', element: <PayReturn /> },
    { path: 'success', element: <OrderSuccess /> },
    { path: 'account', element: <Account />, loader: ordersLoader },
    { path: 'account/personal', element: <PersonalDetails /> },
    { path: 'orders', element: <Orders />, loader: ordersLoader },
    { path: 'orders/:orderNumber', element: <OrderDetail />, loader: orderLoader },
    { path: 'signin', element: <SignIn /> },
    { path: 'auth/callback', element: <AuthCallback /> },
    { path: 'settings/display', element: <DisplaySettings /> },
    // Language and appearance became the one display screen; old links land there.
    { path: 'settings/language', element: <Navigate to="/settings/display" replace /> },
    { path: 'settings/appearance', element: <Navigate to="/settings/display" replace /> },
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
