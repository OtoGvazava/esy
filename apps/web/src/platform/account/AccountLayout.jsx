// The account on esy.ge (the design's U2–U7): esy.ge's own bar and footer
// around the sections every app shares (account/AccountBody). Below a desktop
// each section says where it sits, since esy.ge's bar has no way back.
import { useNavigate } from 'react-router-dom';
import { usePlatform, PTopBar, PFooter } from '../PlatformShared';
import AccountBody from '../../account/AccountBody';

export default function AccountLayout() {
  const { T } = usePlatform();
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}` }}>
      <PTopBar current="account" />
      <main style={{ flex: '1 0 auto', paddingBottom: 48 }}>
        <AccountBody app="platform" T={T} crumb onSignedOut={() => navigate('/')} />
      </main>
      <PFooter />
    </div>
  );
}
