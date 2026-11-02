// Which face of the app this page is: esy.ge → the platform front door;
// manager.esy.ge → the back office; admin.esy.ge → administration;
// <sub>.esy.ge → a storefront. Each has its own route table (router/index.jsx)
// and its own translations (i18n.js).
import { isAdminHost, isManagerHost, isPlatformHost } from '../hooks/usePlatformHost';

export function hostKey() {
  if (isAdminHost()) return 'admin';
  if (isManagerHost()) return 'manager';
  return isPlatformHost() ? 'platform' : 'store';
}

export default hostKey;
