// esy.ge — the platform front door. A route table of its own, apart from the
// storefront's, so the same path renders differently per host.
import PlatformLanding from '../platform/PlatformLanding';
import PlatformDirectory from '../platform/PlatformDirectory';
import PlatformRegistration from '../platform/PlatformRegistration';
import PlatformAccount from '../platform/PlatformAccount';
import PlatformAuth from '../platform/PlatformAuth';
import PlatformNotFound from '../platform/PlatformNotFound';
import PlatformLegal from '../platform/PlatformLegal';
import PlatformHelp from '../platform/PlatformHelp';
import PlatformPersonal from '../platform/PlatformPersonal';
import AuthCallback from '../pages/AuthCallback';
import DisplaySettings from '../pages/DisplaySettings';
import { accountLoader, directoryLoader } from './platformLoaders';

export const platformRoutes = [
  { index: true, element: <PlatformLanding />, loader: directoryLoader },
  { path: 'stores', element: <PlatformDirectory />, loader: directoryLoader },
  { path: 'stores/:subdomain', element: <PlatformDirectory />, loader: directoryLoader },
  { path: 'sell', element: <PlatformRegistration /> },
  { path: 'create-store', element: <PlatformRegistration /> },
  { path: 'account', element: <PlatformAccount />, loader: accountLoader },
  // The account's two settings rows (L4): the one identity's details, and the
  // display settings every store shares.
  { path: 'account/personal', element: <PlatformPersonal /> },
  { path: 'settings/display', element: <DisplaySettings /> },
  { path: 'signin', element: <PlatformAuth /> },
  // The footer has always linked to these; until now every one 404'd.
  { path: 'help', element: <PlatformHelp /> },
  { path: 'terms', element: <PlatformLegal kind="terms" /> },
  { path: 'privacy', element: <PlatformLegal kind="privacy" /> },
  { path: 'returns', element: <PlatformLegal kind="returns" /> },
  { path: 'seller-terms', element: <PlatformLegal kind="seller" /> },
  { path: 'auth/callback', element: <AuthCallback /> },
  { path: '*', element: <PlatformNotFound /> },
];
