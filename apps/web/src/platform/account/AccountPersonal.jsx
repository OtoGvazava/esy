// /account/personal — the one identity's details: name, surname and date of
// birth, then the phone with its code. The cards are the shop kit's
// (components/PersonalInfo), so they sit inside its root here as they do on a
// store.
import { useTranslation } from 'react-i18next';
import PersonalInfo from '../../components/PersonalInfo';
import { Sk } from '../../components/shop/kit';
import { Head, useAccount } from './parts';

export default function AccountPersonal() {
  const { T, dev } = useAccount();
  const { t } = useTranslation('platform');
  return (
    <>
      <Head T={T} desk={dev.desk} title={t('me.personal')} />
      <Sk><PersonalInfo /></Sk>
    </>
  );
}
