// /account on a store (the design's S1–S5): the account's sections inside the
// store itself, under its bar or above its menu and in its theme, so a shopper
// never leaves the shop to manage their account.
//
// Below a desktop the store's own header line carries the title: the account's
// name on the overview, and on a section its name with the way back. On a
// desktop the page draws its title beside the list of sections.
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { useDevice } from '../contexts/DeviceContext';
import { useTenant } from '../contexts/TenantContext';
import { useBottomClearance } from '../core/design/useDesign';
import { GlowScreen, GlowTopNav } from '../components/glow/GlowChrome';
import AccountBody from '../account/AccountBody';
import { sectionOf, sectionTitle } from '../account/sections';
import SignIn from './SignIn';

export default function AccountPage() {
  const { T } = useGlow();
  const { isDesktop } = useDevice();
  const { tenant } = useTenant();
  const clearance = useBottomClearance();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation('account');
  const section = sectionOf(pathname);

  return (
    <GlowScreen T={T} padBottom={isDesktop ? 48 : clearance + 28}>
      {!isDesktop && (
        <GlowTopNav T={T} title={sectionTitle(t, section, 'store')} onBack={section ? () => navigate('/account') : undefined} />
      )}
      <AccountBody
        app="store" T={T} here={tenant?.subdomain || null}
        showTitle={isDesktop} signIn={<SignIn />} onSignedOut={() => navigate('/')}
      />
    </GlowScreen>
  );
}
