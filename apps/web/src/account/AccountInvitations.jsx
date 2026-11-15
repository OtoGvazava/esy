// Store roles offered to this account (review M36). An owner's "give someone
// a role" no longer grants anything: it leaves an invitation addressed to an
// email, and the role applies only once the person signed in with that email
// accepts it here. Shown at the top of the overview on every app, and only
// when there is something to answer.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { accountApi, handleApiError } from '../utils/api';
import { invitationsQuery, accountQuery } from '../core/query/queries';
import { safeAccent } from '../core/tokens';
import { Av, Btn, Lbl, List, initialsOf, liStyle } from '../platform/PlatformKit';
import { officeUrl, outProps, storeName, useAccount } from './parts';

export default function AccountInvitations() {
  const { T, dev } = useAccount();
  const { t } = useTranslation('account');
  const qc = useQueryClient();
  const read = useQuery(invitationsQuery());
  const [busy, setBusy] = useState(null);
  const [problem, setProblem] = useState('');
  // Stores just accepted, so the block can say so and open the back office.
  const [joined, setJoined] = useState([]);

  const open = read.data ?? [];
  if (!open.length && !joined.length) return null;

  const answer = async (inv, accept) => {
    setBusy(inv.id);
    setProblem('');
    try {
      const next = accept ? await accountApi.acceptInvitation(inv.id) : await accountApi.declineInvitation(inv.id);
      qc.setQueryData(invitationsQuery().queryKey, Array.isArray(next) ? next : []);
      if (accept) {
        setJoined((j) => [...j, inv.store]);
        // The stores this account runs come from the account.
        qc.invalidateQueries({ queryKey: accountQuery().queryKey });
      }
    } catch (e) {
      setProblem(handleApiError(e, t('invites.failed')));
      qc.invalidateQueries({ queryKey: invitationsQuery().queryKey });
    } finally {
      setBusy(null);
    }
  };

  const roleName = (role) => (role === 'OWNER' ? t('me.owner') : t('me.manager'));

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Lbl T={T} as="h2">{t('invites.title')}</Lbl>
      {problem && <div role="alert" style={{ fontSize: 12.5, color: T.danger }}>{problem}</div>}
      <List T={T}>
        {joined.map((s, i) => (
          <div key={`joined-${s?.subdomain}`} style={{ ...liStyle(T, i === joined.length - 1 && !open.length), flexWrap: 'wrap' }}>
            <Av T={T} size="sm" color={safeAccent(s?.primaryColor)}>{initialsOf(storeName(s))}</Av>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{t('invites.accepted', { store: storeName(s) })}</div>
            <Btn T={T} kind="p" size="sm" ph={dev.ph} href={officeUrl(s)} {...outProps(true)}>{t('invites.openOffice')}</Btn>
          </div>
        ))}
        {open.map((inv, i) => {
          const name = storeName(inv.store);
          return (
            <div key={inv.id} style={{ ...liStyle(T, i === open.length - 1), flexWrap: 'wrap' }}>
              <Av T={T} size="sm" color={safeAccent(inv.store?.primaryColor)}>{initialsOf(name)}</Av>
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 12.5, overflowWrap: 'anywhere' }}>
                  {t('invites.offer', { store: name, role: roleName(inv.role) })}
                </b>
                {inv.invitedBy && (
                  <div style={{ fontSize: 12, color: T.textDim, overflowWrap: 'anywhere' }}>
                    {t('invites.from', { email: inv.invitedBy })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn T={T} size="sm" ph={dev.ph} disabled={busy != null} onClick={() => answer(inv, false)}>
                  {t('invites.decline')}
                </Btn>
                <Btn T={T} kind="p" size="sm" ph={dev.ph} disabled={busy != null} onClick={() => answer(inv, true)}>
                  {t('invites.accept')}
                </Btn>
              </div>
            </div>
          );
        })}
      </List>
      {open.some((i) => i.role === 'OWNER') && (
        <p style={{ margin: 0, fontSize: 12, color: T.textDim }}>{t('invites.ownerNote')}</p>
      )}
    </section>
  );
}
