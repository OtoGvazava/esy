// Team — who runs this store (the design's MTeam, decision D17).
//
// OWNER-only. Until this screen existed a store role could only be granted
// from admin.esy.ge, so an owner adding their own colleague had to ask the
// platform. The rules are the server's and are shared with the admin screen:
// a store always keeps an owner, a role goes only to an account that already
// exists, and CUSTOMER is not grantable.
//
// Refusals are shown verbatim. Each one names which rule was hit, and that
// sentence is more useful than any generic "could not save" this screen could
// invent.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { Btn, Card, Field, Note } from '../core/primitives';
import { RoleChip } from '../core/domain';
import { Icons } from '../core/icons';
import { teamApi, handleApiError } from '../utils/api';
import { MTop } from './ManagerShell';

const ROLES = ['OWNER', 'MANAGER'];

export default function ManagerTeam() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const { user } = useAuth();
  const { isDesktop, isMobile } = useDevice();
  const [params] = useSearchParams();
  const devTenant = params.get('tenant') || undefined;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MANAGER');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await teamApi.list(devTenant);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
      setError(handleApiError(e, t('team.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [devTenant, t]);

  useEffect(() => { load(); }, [load]);

  // Every write answers with the refreshed list, so the table is the server's
  // answer rather than a local guess — promoting a second owner changes what
  // is allowed for the first.
  const write = async (fn, fallbackKey) => {
    setBusy(true);
    setError('');
    try {
      const next = await fn();
      setRows(Array.isArray(next) ? next : []);
      return true;
    } catch (e) {
      setError(handleApiError(e, t(fallbackKey)));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    const ok = await write(() => teamApi.assign(value, role, devTenant), 'team.assignFailed');
    if (ok) setEmail('');
  };

  const mode = isDesktop ? 'desktop' : isMobile ? 'mobile' : 'tablet';
  const owners = rows.filter((r) => r.role === 'OWNER').length;

  return (
    <div>
      <MTop
        T={T}
        mode={mode}
        title={t('team.title')}
        sub={t('team.sub')}
      />

      {error && (
        <Note T={T} tone="danger" style={{ marginBottom: 14 }}>{error}</Note>
      )}

      <Card T={T} pad={0} style={{ overflow: 'hidden', marginBottom: 14 }}>
        {loading ? (
          <div style={{ padding: 18, font: `500 13px ${T.font}`, color: T.textMute }}>
            {t('team.loading')}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 18, font: `500 13px ${T.font}`, color: T.textMute }}>
            {t('team.empty')}
          </div>
        ) : rows.map((m, i) => {
          const isSelf = user?.email && m.email === user.email;
          // The last owner cannot go — the server refuses it, and offering the
          // button anyway would just produce an error the owner can predict.
          const lastOwner = m.role === 'OWNER' && owners <= 1;
          const other = ROLES.find((r) => r !== m.role);
          return (
            <div key={m.email} style={{
              display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap',
              padding: '13px 15px', borderTop: i ? `1px solid ${T.border}` : 'none',
            }}>
              <span style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: T.surface2, color: T.textDim,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                font: `800 12.5px ${T.font}`,
              }}>{(m.email || '?').charAt(0).toUpperCase()}</span>

              <span style={{ flex: 1, minWidth: 150 }}>
                <span style={{
                  display: 'block', font: `600 13px ${T.font}`, color: T.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {m.email}
                  {isSelf && (
                    <span style={{ marginLeft: 7, font: `600 10.5px ${T.font}`, color: T.textMute }}>
                      · {t('team.you')}
                    </span>
                  )}
                </span>
              </span>

              <RoleChip T={T} role={m.role} label={t(`role.${m.role}`)} showCode={false} />

              {!lastOwner && other && (
                <Btn T={T} kind="quiet" size="sm" disabled={busy}
                     onClick={() => write(() => teamApi.assign(m.email, other, devTenant), 'team.assignFailed')}>
                  {t(`team.makeRole.${other}`)}
                </Btn>
              )}
              {!lastOwner && (
                <Btn T={T} kind="danger" size="sm" disabled={busy}
                     onClick={() => {
                       const msg = isSelf ? t('team.removeSelfConfirm') : t('team.removeConfirm', { email: m.email });
                       if (window.confirm(msg)) {
                         write(() => teamApi.remove(m.email, devTenant), 'team.removeFailed');
                       }
                     }}>
                  {t('team.remove')}
                </Btn>
              )}
              {lastOwner && (
                <span style={{ font: `500 11.5px ${T.font}`, color: T.textMute }}>
                  {t('team.lastOwner')}
                </span>
              )}
            </div>
          );
        })}
      </Card>

      <Card T={T} pad={16}>
        <form onSubmit={add}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Field
                T={T}
                label={t('team.addLabel')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                type="email"
                autoComplete="off"
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {ROLES.map((r) => (
                <Btn key={r} T={T} kind={role === r ? 'dark' : 'quiet'} size="md"
                     type="button" onClick={() => setRole(r)}>
                  {t(`role.${r}`)}
                </Btn>
              ))}
            </div>
            <Btn T={T} kind="dark" size="md" type="submit" disabled={busy || !email.trim()}>
              <Icons.plus width="14" height="14" /> {t('team.add')}
            </Btn>
          </div>
        </form>
        <Note T={T} style={{ marginTop: 12 }}>{t('team.addHint')}</Note>
      </Card>
    </div>
  );
}
