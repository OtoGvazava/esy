// /account on a store. The account is not a store's page any more: it lives on
// esy.ge (platform/account/), and the store's account menu is how a shopper
// reaches it. This route stays for what still arrives at it:
//
//   - signed out, the menu's account item, which leads here to sign in;
//   - signed in, an old bookmark or link, forwarded to the account on esy.ge
//     with this store as where it came from, so the way back is offered there.
import { GoTo } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { hubUrl } from '../components/account/hub';
import SignIn from './SignIn';

export default function AccountDoor({ to = '/account' }) {
  const { isAuthenticated, loading } = useAuth();
  const { tenant } = useTenant();
  // The session is still being restored: neither answer is known yet.
  if (loading) return null;
  if (!isAuthenticated) return <SignIn />;
  return <GoTo href={hubUrl(to, 'store', tenant?.subdomain)} />;
}
