// /account in administration (the design's S7): the account's sections in
// admin's own frame, whose bar carries the title and, on a section, the way
// back to the overview.
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AccountBody from '../account/AccountBody';
import { sectionOf, sectionTitle } from '../account/sections';
import { useAdminTokens } from './adminTokens';
import { useAdminHead } from './adminHead';

export default function AdminAccount() {
  const T = useAdminTokens();
  const { t } = useTranslation('account');
  const { pathname } = useLocation();
  const section = sectionOf(pathname);
  useAdminHead({ title: sectionTitle(t, section), back: section ? '/account' : undefined });
  return <AccountBody app="admin" T={T} showTitle={false} padded={false} />;
}
