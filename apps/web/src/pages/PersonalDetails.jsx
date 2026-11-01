import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import PersonalInfo from '../components/PersonalInfo';
import { BackTop, DeskTitle, Sk, useDev } from '../components/shop/kit';

// /account/personal — personal details on a page of their own (the design's
// D2), reached from the account's settings list (D1). A pushed screen: a back
// button to the account on a phone and a tablet, "‹ Account" above the title on
// a desktop.
export default function PersonalDetails() {
  const navigate = useNavigate();
  const dev = useDev();
  const { t } = useTranslation('storefront');
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  // Signed out, the account tab is where signing in starts.
  if (!isAuthenticated) return <Navigate to="/account" replace />;

  const title = t('account.personal.title');
  const back = () => navigate('/account');
  const wrap = dev === 'ph' ? { padding: '8px 16px 40px' }
    : dev === 'tab' ? { padding: '10px 28px 48px', display: 'flex', justifyContent: 'center' }
      : { padding: '28px 120px 56px', display: 'flex', justifyContent: 'center' };
  return (
    <Sk style={{ minHeight: '100vh' }}>
      {dev !== 'desk' && <BackTop title={title} onBack={back} backLabel={t('orderDetail.back')} />}
      <div style={wrap}>
        <div className="stk" style={{ gap: 18, width: '100%', maxWidth: dev === 'tab' ? 600 : dev === 'desk' ? 1040 : undefined }}>
          {dev === 'desk' && <DeskTitle title={title} back={t('account.personal.back')} onBack={back} />}
          <PersonalInfo />
        </div>
      </div>
    </Sk>
  );
}
