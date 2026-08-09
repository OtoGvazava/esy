// /admins — the allow-list for this host.
//
// Two kinds of row, and the difference is the whole point of the screen. A
// 'db' row was granted here and can be taken back here. An 'env' row comes from
// ADMIN_EMAILS in the server environment: the API refuses to delete it (400),
// so the button is not merely disabled — the row says where the grant actually
// lives, because "why can't I remove this?" is the only question a locked row
// ever raises.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi, handleApiError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useAdminTokens } from './adminTokens';
import { Btn, Card, Chip, Field, Note, SectionTitle } from '../core/primitives';
import { Icons } from '../core/icons';
import { Empty, Failed, Loading, dateTime } from './AdminUI';

// Deliberately loose: the server is the authority on what it accepts. This only
// catches the typo that would otherwise cost a round-trip.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isEnv = (row) => String(row?.source || '').toLowerCase() === 'env';

function AdminRow({ T, t, lang, row, isSelf, busy, error, confirming, onConfirm, onCancel, onRemove }) {
  const env = isEnv(row);
  const granted = dateTime(row.grantedAt, lang);
  return (
    <div style={{ padding: '14px 16px', borderTop: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: T.textMute, display: 'flex' }}>
          {env ? <Icons.shield size={15} /> : <Icons.user size={15} />}
        </span>
        <span style={{ flex: 1, minWidth: 180, font: `600 13.5px ${T.font}`, color: T.text }}>
          {row.email}
          {isSelf && (
            <span style={{ font: `600 11px ${T.font}`, color: T.textMute, marginLeft: 8 }}>
              {t('admins.you')}
            </span>
          )}
        </span>
        <Chip T={T} tone={env ? 'admin' : 'neutral'}>
          {env ? t('admins.sourceEnv') : t('admins.sourceDb')}
        </Chip>
        {env ? (
          <Btn T={T} kind="quiet" size="sm" disabled title={t('admins.envLocked')}>
            {t('admins.remove')}
          </Btn>
        ) : (
          <Btn T={T} kind="ghost" size="sm" disabled={busy} onClick={() => onConfirm(row.email)}>
            {busy ? t('ui.working') : t('admins.remove')}
          </Btn>
        )}
      </div>

      <div style={{ font: `500 11.5px ${T.font}`, color: T.textMute, marginTop: 5, marginLeft: 25 }}>
        {env
          ? t('admins.envSource')
          : granted
            ? [
              t('admins.granted', { at: granted }),
              row.grantedBy ? t('admins.grantedBy', { email: row.grantedBy }) : null,
            ].filter(Boolean).join(' · ')
            : t('admins.grantedUnknown')}
      </div>

      {env && (
        <Note T={T} tone="admin" style={{ marginTop: 10 }}>{t('admins.envLocked')}</Note>
      )}

      {confirming && (
        <div style={{
          marginTop: 12, padding: '12px 14px', borderRadius: 14,
          background: T.dangerBg, border: `1px solid ${T.danger}33`,
        }}>
          <div style={{ font: `600 12.5px/1.55 ${T.font}`, color: T.text }}>
            {t('admins.removeConfirm', { email: row.email })}
          </div>
          {isSelf && (
            <div style={{ font: `600 12px/1.5 ${T.font}`, color: T.dangerFg, marginTop: 6 }}>
              {t('admins.removeSelf')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Btn T={T} kind="ghost" size="sm" onClick={onCancel} disabled={busy}>
              {t('ui.cancel')}
            </Btn>
            <Btn T={T} kind="danger" size="sm" onClick={() => onRemove(row.email)} disabled={busy}>
              {busy ? t('ui.working') : t('admins.removeConfirmYes')}
            </Btn>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, font: `500 12.5px ${T.font}`, color: T.dangerFg }}>{error}</div>
      )}
    </div>
  );
}

export default function AdminAdmins() {
  const T = useAdminTokens();
  const { t, i18n } = useTranslation('admin');
  const lang = i18n.language;
  const { user } = useAuth();

  const [admins, setAdmins] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState('');
  const [busy, setBusy] = useState('');
  const [rowError, setRowError] = useState({});
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listAdmins({ signal: ac.signal });
      if (ac.signal.aborted) return;
      setAdmins(Array.isArray(data) ? data : []);
    } catch (e) {
      if (ac.signal.aborted || e?.name === 'AbortError') return;
      setAdmins(null);
      setError(handleApiError(e, t('admins.loadFailed')));
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const add = async () => {
    const value = email.trim();
    if (adding) return;
    if (!EMAIL.test(value)) {
      setAddError(t('admins.invalidEmail'));
      return;
    }
    if ((admins || []).some((a) => a.email?.toLowerCase() === value.toLowerCase())) {
      setAddError(t('admins.duplicate'));
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const created = await adminApi.addAdmin(value);
      // 201 carries the new admin object; anything else means re-read the list
      // rather than show a row this screen invented.
      if (created?.email) setAdmins((prev) => [...(prev || []), created]);
      else await load();
      setEmail('');
    } catch (e) {
      setAddError(handleApiError(e, t('admins.addFailed')));
    } finally {
      setAdding(false);
    }
  };

  const remove = async (target) => {
    setBusy(target);
    setRowError((p) => ({ ...p, [target]: '' }));
    try {
      await adminApi.removeAdmin(target);
      setAdmins((prev) => (prev || []).filter((a) => a.email !== target));
      setConfirming('');
    } catch (e) {
      // The 400 an 'env' row answers with lands here too, so the message the
      // server gives is shown verbatim rather than being second-guessed.
      setRowError((p) => ({ ...p, [target]: handleApiError(e, t('admins.removeFailed')) }));
    } finally {
      setBusy('');
    }
  };

  const wrap = { padding: 20, maxWidth: 720, margin: '0 auto' };

  return (
    <div style={wrap}>
      <SectionTitle T={T} lang={lang} title={t('admins.title')} sub={t('admins.sub')} />

      <Card T={T} pad={16} style={{ marginBottom: 16 }}>
        <Field
          T={T}
          id="admin-add-email"
          label={t('admins.addLabel')}
          placeholder={t('admins.addPlaceholder')}
          hint={t('admins.addHint')}
          error={addError || undefined}
          value={email}
          type="email"
          autoComplete="off"
          onChange={(e) => { setAddError(''); setEmail(e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          right={
            <Btn T={T} kind="dark" size="sm" disabled={adding || !email.trim()} onClick={add}>
              {adding ? t('ui.working') : t('admins.add')}
              {!adding && <Icons.plus size={12} />}
            </Btn>
          }
        />
      </Card>

      {loading && !admins && <Loading T={T} />}

      {error && !loading && <Failed T={T} message={error} onRetry={load} />}

      {admins && admins.length === 0 && !loading && !error && (
        <Empty T={T} title={t('admins.empty')} body={t('admins.emptyBody')} />
      )}

      {admins && admins.length > 0 && (
        <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px', background: T.surface2,
            font: `600 10.5px ${T.font}`, color: T.textMute,
            letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>
            {t('admins.listHead')}
          </div>
          {admins.map((row) => (
            <AdminRow
              key={`${row.source}-${row.email}`}
              T={T}
              t={t}
              lang={lang}
              row={row}
              isSelf={!!user?.email && user.email.toLowerCase() === String(row.email).toLowerCase()}
              busy={busy === row.email}
              error={rowError[row.email]}
              confirming={confirming === row.email}
              onConfirm={setConfirming}
              onCancel={() => setConfirming('')}
              onRemove={remove}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
