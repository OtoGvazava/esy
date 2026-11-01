// Account → personal details on the platform (the row the design's L4 lists
// as "personal details · name, phone"). The same cards a store's account page
// carries — name, surname and date of birth, then the phone with its code —
// because they edit the one esy identity either way.
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform, PTopBar, PFooter } from './PlatformShared';
import { useAuth } from '../contexts/AuthContext';
import PersonalInfo from '../components/PersonalInfo';
import { type, usePDevice } from './PlatformKit';

export default function PlatformPersonal() {
  const { T } = usePlatform();
  const { ph, desk, gut } = usePDevice();
  const { t } = useTranslation('platform');
  const { isAuthenticated, loading } = useAuth();
  const ty = type(T, desk);

  if (!loading && !isAuthenticated) return <Navigate to="/account" replace />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}` }}>
      <PTopBar current="account" />
      <main style={{ flex: '1 0 auto', paddingBottom: 48 }}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: ph ? '10px 0 0' : `30px ${desk ? 0 : gut}px 0` }}>
          <div style={{ padding: `0 ${ph ? gut : 16}px 12px` }}>
            <Link to="/account" style={{ display: 'inline-block', marginBottom: 4, fontSize: 12.5, fontWeight: 600, color: T.accentFg, textDecoration: 'none' }}>
              {t('me.back')}
            </Link>
            <h1 style={ty.h1}>{t('me.personal')}</h1>
          </div>
          <PersonalInfo />
        </div>
      </main>
      <PFooter />
    </div>
  );
}
