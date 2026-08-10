import { Routes, Route } from 'react-router-dom';
import PlatformLanding from './PlatformLanding';
import PlatformDirectory from './PlatformDirectory';
import PlatformRegistration from './PlatformRegistration';
import PlatformAccount from './PlatformAccount';
import PlatformAuth from './PlatformAuth';
import PlatformNotFound from './PlatformNotFound';
import PlatformLegal from './PlatformLegal';
import PlatformHelp from './PlatformHelp';
import AuthCallback from '../pages/AuthCallback';

// esy.ge — the platform front door. Mounted (instead of the storefront shell)
// when usePlatformHost() is true. Distinct route table from the storefront so
// the same path renders differently per host.
export default function PlatformShell() {
  return (
    <Routes>
      <Route path="/" element={<PlatformLanding />} />
      <Route path="/stores" element={<PlatformDirectory />} />
      <Route path="/stores/:subdomain" element={<PlatformDirectory />} />
      <Route path="/sell" element={<PlatformRegistration />} />
      <Route path="/create-store" element={<PlatformRegistration />} />
      <Route path="/account" element={<PlatformAccount />} />
      <Route path="/signin" element={<PlatformAuth />} />
      {/* The footer has always linked to these; until now every one 404'd. */}
      <Route path="/help" element={<PlatformHelp />} />
      <Route path="/terms" element={<PlatformLegal kind="terms" />} />
      <Route path="/privacy" element={<PlatformLegal kind="privacy" />} />
      <Route path="/returns" element={<PlatformLegal kind="returns" />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<PlatformNotFound />} />
    </Routes>
  );
}
