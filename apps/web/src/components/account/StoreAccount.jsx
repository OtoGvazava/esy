// The store's one account menu (the design's U1), mounted once by the store's
// layout and opened by whichever control was pressed: the desktop bar's
// account button, or the account item of the store's menu, whatever its style
// (accountSheet.js). Out of the bar's button it is a popover; from a menu it
// rises as a sheet.
//
// Its code is fetched the first time it is opened, so a shopper who never
// opens it never downloads it.
import { Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDevice } from '../../contexts/DeviceContext';
import { useTenant } from '../../contexts/TenantContext';
import { closeAccountMenu, openAccountMenu, useAccountMenuState } from './accountSheet';

const AccountMenu = lazy(() => import('./AccountMenu'));

const onOpenChange = (next) => (next ? openAccountMenu() : closeAccountMenu());

export default function StoreAccount() {
  const { open, anchor, ever } = useAccountMenuState();
  const { isAuthenticated, isStoreOwner, canManageStore } = useAuth();
  const { isMobile, isDesktop } = useDevice();
  const { tenant } = useTenant();
  const { pathname } = useLocation();

  // Going anywhere closes it, and so does leaving this layout.
  useEffect(() => { closeAccountMenu(); }, [pathname]);
  useEffect(() => closeAccountMenu, []);

  // Signed out there is no menu: the account's controls lead to sign-in.
  if (!ever || !isAuthenticated) return null;
  // Platform ADMIN grants nothing inside a store: only its own team sees the back office row.
  const role = canManageStore ? (isStoreOwner ? 'OWNER' : 'MANAGER') : null;
  return (
    <Suspense fallback={null}>
      <AccountMenu
        app="store"
        store={{ subdomain: tenant?.subdomain }}
        storeRole={role}
        open={open}
        onOpenChange={onOpenChange}
        anchorEl={anchor}
        sheet={!anchor || !isDesktop}
        wide={!isMobile}
      />
    </Suspense>
  );
}
