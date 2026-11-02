// /admins — who can open this host (the design's AD4).
//
// A read-only list, and beside it how to add someone. The allow-list is the
// server's ADMIN_EMAILS, and this screen deliberately cannot add to it: an
// admin who could grant admin from a browser could be made to, and the design
// and the plan (W6) settle that the list is changed in the environment only.
//
// Older grants made from this screen (source "db") may still exist. They stay
// visible, marked as such, and can still be taken back here — that is the one
// write left, so a grant from before this rule is never stranded.
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, handleApiError } from '../utils/api';
import { adminAdminsQuery } from '../core/query/adminQueries';
import { useAuth } from '../contexts/AuthContext';
import { useAdminTokens } from './adminTokens';
import { useAdminHead } from './adminHead';
import { useDevice } from '../contexts/DeviceContext';
import { Empty, Failed, dateTime } from './AdminUI';
import { KitBtn, KitChip, List, Mono } from './AdminKit';
import { AdminsSkeleton } from './AdminSkeletons';

const isEnv = (row) => String(row?.source || '').toLowerCase() === 'env';

// Latin letters only: toUpperCase() would turn Georgian into Mtavruli capitals.
const latinUpper = (s) => String(s).replace(/[a-z]/g, (c) => c.toUpperCase());
function initials(row) {
  const parts = String(row.name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length) return latinUpper(parts.slice(0, 2).map((w) => Array.from(w)[0]).join(''));
  return latinUpper(Array.from(String(row.email || '?'))[0] || '?');
}

function AdminRow({ T, t, lang, row, isSelf, last, busy, error, confirming, onConfirm, onCancel, onRemove }) {
  const env = isEnv(row);
  const granted = dateTime(row.grantedAt, lang);
  const sub = [
    row.name ? row.email : null,
    env ? null : (granted ? t('admins.grantedHere', { at: granted }) : t('admins.sourceDb')),
  ].filter(Boolean).join(' · ');
  return (
    <div style={{ borderBottom: last ? 'none' : `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56, boxSizing: 'border-box' }}>
        <span aria-hidden="true" style={{
          width: 34, height: 34, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
          background: 'var(--k-ink)', color: 'var(--k-on-ink)', font: `700 12px ${T.font}`, letterSpacing: '0.02em',
          boxShadow: T.dark ? '0 0 0 1px rgba(255,255,255,.16)' : 'none',
        }}>
          {initials(row)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}`, color: T.text, overflowWrap: 'anywhere' }}>
            {row.name || row.email}
            {isSelf && <span style={{ fontWeight: 400, color: T.textDim }}>{t('admins.youMark')}</span>}
          </b>
          {sub && <div style={{ font: `400 12px/1.4 ${T.font}`, color: T.textDim, overflowWrap: 'anywhere' }}>{sub}</div>}
        </div>
        {!env && !confirming && (
          <KitBtn T={T} size="sm" disabled={busy} onClick={() => onConfirm(row.email)}>
            {busy ? t('ui.working') : t('admins.remove')}
          </KitBtn>
        )}
      </div>

      {confirming && (
        <div style={{ margin: '0 16px 14px', padding: '12px 14px', borderRadius: 14, background: 'var(--k-bad-bg)' }}>
          <div style={{ font: `600 12.5px/1.55 ${T.font}`, color: T.text }}>
            {t('admins.removeConfirm', { email: row.email })}
          </div>
          {isSelf && (
            <div style={{ font: `600 12px/1.5 ${T.font}`, color: 'var(--k-bad)', marginTop: 6 }}>
              {t('admins.removeSelf')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <KitBtn T={T} size="sm" onClick={onCancel} disabled={busy}>{t('ui.cancel')}</KitBtn>
            <KitBtn T={T} size="sm" kind="danger" onClick={() => onRemove(row.email)} disabled={busy}>
              {busy ? t('ui.working') : t('admins.removeConfirmYes')}
            </KitBtn>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ padding: '0 16px 12px', font: `500 12.5px ${T.font}`, color: 'var(--k-bad)' }}>{error}</div>
      )}
    </div>
  );
}

export default function AdminAdmins() {
  const T = useAdminTokens();
  const { t, i18n } = useTranslation('admin');
  const lang = i18n.language;
  const { user } = useAuth();
  const { isDesktop } = useDevice();
  const qc = useQueryClient();

  const [confirming, setConfirming] = useState('');
  const [busy, setBusy] = useState('');
  const [rowError, setRowError] = useState({});

  useAdminHead({ title: t('admins.title'), sub: t('admins.sub') });

  // The list from the query cache. A failed read shows no rows at all.
  const list = useQuery(adminAdminsQuery());
  const admins = list.isError ? null : (list.data ?? null);
  // A retry after a failure draws the skeleton again, as the first load did.
  const pending = list.isPending || (list.isError && list.isFetching);
  const error = list.isError && !pending ? handleApiError(list.error, t('admins.loadFailed')) : '';

  const remove = async (target) => {
    setBusy(target);
    setRowError((p) => ({ ...p, [target]: '' }));
    try {
      await adminApi.removeAdmin(target);
      // Off the list at once; the re-read the write sets off confirms it.
      qc.setQueryData(adminAdminsQuery().queryKey, (prev) => prev && prev.filter((a) => a.email !== target));
      setConfirming('');
    } catch (e) {
      // An 'env' row answers 400; the server's message is shown as it is.
      setRowError((p) => ({ ...p, [target]: handleApiError(e, t('admins.removeFailed')) }));
    } finally {
      setBusy('');
    }
  };

  const mono = <Mono T={T} />;
  const rows = admins || [];
  const envCount = rows.filter(isEnv).length;
  const dbCount = rows.length - envCount;
  // "Both admins come from ADMIN_EMAILS" — said for the list as it is.
  const footKey = dbCount > 0 ? 'admins.footDb' : rows.length === 1 ? 'admins.footOne' : rows.length === 2 ? 'admins.footTwo' : 'admins.footAll';

  const how = (
    <div style={{
      padding: 22, borderRadius: 'var(--k-r-card)', background: T.surface, border: 'var(--k-card-bd)',
      boxShadow: 'var(--k-card-sh)', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
    }}>
      <h2 style={{ margin: 0, font: `600 16px/1.3 ${T.font}`, color: T.text }}>{t('admins.howTitle')}</h2>
      <p style={{ margin: 0, font: `400 12.5px/1.45 ${T.font}`, color: T.textDim, textWrap: 'pretty' }}>
        <Trans t={t} i18nKey="admins.howBody" components={{ mono }} />
      </p>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['howStep1', 'howStep2', 'howStep3'].map((k, i) => (
          <li key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, font: `400 12.5px/1.45 ${T.font}`, color: T.text }}>
            <KitChip T={T} tone="proc">{i + 1}</KitChip>
            <span style={{ paddingTop: 4 }}><Trans t={t} i18nKey={`admins.${k}`} components={{ mono }} /></span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <div style={{
      display: 'grid', gap: 20, alignItems: 'start',
      gridTemplateColumns: isDesktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        {pending && <AdminsSkeleton />}
        {error && <Failed T={T} message={error} onRetry={() => list.refetch()} />}
        {admins && rows.length === 0 && (
          <Empty T={T} title={t('admins.empty')} body={t('admins.emptyBody')} />
        )}
        {rows.length > 0 && (
          <>
            <List T={T}>
              {rows.map((row, i) => (
                <AdminRow
                  key={`${row.source}-${row.email}`}
                  T={T}
                  t={t}
                  lang={lang}
                  row={row}
                  last={i === rows.length - 1}
                  isSelf={!!user?.email && user.email.toLowerCase() === String(row.email).toLowerCase()}
                  busy={busy === row.email}
                  error={rowError[row.email]}
                  confirming={confirming === row.email}
                  onConfirm={setConfirming}
                  onCancel={() => setConfirming('')}
                  onRemove={remove}
                />
              ))}
            </List>
            <p style={{ margin: 0, padding: '0 4px', font: `400 12px/1.45 ${T.font}`, color: T.textDim }}>
              <Trans t={t} i18nKey={footKey} count={dbCount} values={{ n: dbCount }} components={{ mono }} />
            </p>
          </>
        )}
      </div>
      {how}
    </div>
  );
}
