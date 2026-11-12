// /account in the back office (the design's S6, S8): the account's sections in
// the back office's own frame. Its bar carries the title and, on a section,
// the way back to the overview; every link keeps the store chosen (?tenant=).
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTK } from '../core/useTK';
import AccountBody from '../account/AccountBody';
import { sectionOf, sectionTitle } from '../account/sections';
import { PageHead } from './officeKit';

export default function ManagerAccount() {
  const { T } = useTK();
  const { t } = useTranslation('account');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const sub = params.get('tenant');
  const q = sub ? `?tenant=${encodeURIComponent(sub)}` : '';
  const link = (path) => `${path}${q}`;
  const section = sectionOf(pathname);

  return (
    <>
      <PageHead
        T={T} title={sectionTitle(t, section)} backLabel={t('hub.account')}
        onBack={section ? () => navigate(link('/account')) : undefined}
      />
      <AccountBody app="manager" T={T} here={sub} link={link} showTitle={false} padded={false} />
    </>
  );
}
