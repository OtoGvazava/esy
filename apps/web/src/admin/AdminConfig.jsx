// /config — live platform configuration.
//
// This screen used to be pages/ConfigSettings.jsx, reached from a STORE url and
// drawn in the storefront's chrome. It moved here for the reason the design
// gives: a store contains no admin functions, so a platform-wide switch has no
// business living on a merchant's host. Same API, same values — new home, and
// the teal chrome that says whose data this is.
//
// Rows edit ONE key at a time. That is not decoration: PUT /api/admin/config
// writes only the keys present in the body, so a per-row save touches exactly
// what the admin changed and leaves a half-typed value in another field
// unwritten. The old screen saved all five together.
//
// The reserved-subdomain list below is read-only and comes from the server
// (TenantService.RESERVED). It is shown here because it is the other half of
// "what is fixed about this platform", and because an admin asking "why can't
// this store be called `billing`?" has nowhere else to look.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi, handleApiError } from '../utils/api';
import { useAdminTokens } from './adminTokens';
import { Btn, Card, Chip, Field, Note, SectionTitle } from '../core/primitives';
import { Icons } from '../core/icons';
import { Failed, Loading } from './AdminUI';

// The editable keys, in the order an admin is most likely to want them. `store`
// is the key as it exists in the config store — shown verbatim because that is
// what an admin greps for in logs; `field` is the name the JSON API uses.
const ROWS = [
  { field: 'serviceFeeRate', store: 'app.platform.service-fee-rate', kind: 'number', placeholder: '0.02' },
  { field: 'bogEnv', store: 'app.bog.env', kind: 'enum', options: ['live', 'sandbox'] },
  { field: 'publicBaseUrl', store: 'app.public-base-url', kind: 'url', placeholder: 'https://www.esy.ge' },
  { field: 'bogAuthUrl', store: 'app.bog.auth-url', kind: 'url', advanced: true },
  { field: 'bogBaseUrl', store: 'app.bog.base-url', kind: 'url', advanced: true },
];

// Platform surfaces own these names; the rest are infra and service labels. The
// distinction is worth drawing because these three are the ones whose loss
// would take down a whole host rather than merely look odd.
const SURFACE_SUBS = new Set(['manager', 'manage', 'admin']);

function ConfigRow({ T, t, row, value, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const begin = () => { setDraft(value ?? ''); setError(''); setEditing(true); };
  const cancel = () => { setEditing(false); setError(''); };

  const save = async (next) => {
    setBusy(true);
    setError('');
    try {
      await adminApi.updateConfig({ [row.field]: String(next ?? draft).trim() });
      setEditing(false);
      // The store's cache TTL applies the write in a second or two; the parent
      // re-reads so the row shows what is actually in effect, not what we sent.
      onSaved();
    } catch (e) {
      setError(handleApiError(e, t('config.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  const shown = value === '' || value == null ? t('config.unset') : String(value);

  return (
    <div style={{ padding: '15px 18px', borderTop: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ flex: '1 1 220px', minWidth: 0 }}>
          <span style={{ display: 'block', font: `700 12.5px ${T.mono}`, color: T.text, wordBreak: 'break-all' }}>
            {row.store}
          </span>
          <span style={{ display: 'block', font: `400 11.5px ${T.font}`, color: T.textMute, marginTop: 3 }}>
            {t(`config.desc.${row.field}`)}
          </span>
        </span>

        {!editing && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 200px', minWidth: 0 }}>
            <span style={{
              flex: 1, minWidth: 0, font: `600 12.5px ${T.mono}`,
              color: value === '' || value == null ? T.textMute : T.textDim,
              wordBreak: 'break-all',
            }}>{shown}</span>
            <Btn T={T} kind="quiet" size="sm" onClick={begin}>{t('config.edit')}</Btn>
          </span>
        )}
      </div>

      {editing && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {row.kind === 'enum' ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {row.options.map((opt) => (
                <Btn
                  key={opt}
                  T={T}
                  kind={draft === opt ? 'primary' : 'ghost'}
                  size="sm"
                  disabled={busy}
                  onClick={() => { setDraft(opt); save(opt); }}
                >
                  {opt}
                </Btn>
              ))}
            </div>
          ) : (
            <Field
              T={T}
              id={`cfg-${row.field}`}
              value={draft}
              placeholder={row.placeholder || t('config.blankDerives')}
              onChange={(e) => setDraft(e.target.value)}
              inputMode={row.kind === 'number' ? 'decimal' : undefined}
              error={error || undefined}
            />
          )}
          {row.kind !== 'enum' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn T={T} size="sm" disabled={busy} onClick={() => save()}>
                {busy ? t('ui.working') : t('config.save')}
              </Btn>
              <Btn T={T} kind="ghost" size="sm" disabled={busy} onClick={cancel}>
                {t('config.cancel')}
              </Btn>
            </div>
          )}
          {error && row.kind === 'enum' && (
            <span style={{ font: `500 12px ${T.font}`, color: T.dangerFg }}>{error}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminConfig() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await adminApi.getConfig());
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // A write lands in Redis/Valkey and the beans re-read it within their cache
  // TTL, so an immediate re-fetch would show the OLD value and read as a failed
  // save. Wait past the TTL before believing the server again.
  const reload = useCallback(() => { setTimeout(load, 2500); }, [load]);

  if (loading) return <Loading T={T} />;
  if (error && !data) return <Failed T={T} message={error} onRetry={load} />;

  const ready = !!data?.storeReady;
  const reserved = Array.isArray(data?.reservedSubdomains) ? data.reservedSubdomains : [];
  const rows = ROWS.filter((r) => !r.advanced || showAdvanced);

  return (
    <>
      <SectionTitle
        T={T}
        title={t('config.title')}
        sub={t('config.sub')}
        right={(
          <Chip T={T} tone={ready ? 'success' : 'danger'}>
            {ready ? t('config.storeConnected') : t('config.storeOffline')}
          </Chip>
        )}
      />

      <div style={{ marginBottom: 14 }}>
        <Note T={T} tone="admin">{t('config.movedNote')}</Note>
      </div>

      {!ready && (
        <div style={{ marginBottom: 14 }}>
          <Note T={T} tone="danger">{t('config.storeOfflineHint')}</Note>
        </div>
      )}

      <Card T={T} pad={0} style={{ overflow: 'hidden', marginBottom: 20 }}>
        {rows.map((row) => (
          <ConfigRow
            key={row.field}
            T={T}
            t={t}
            row={row}
            value={data?.[row.field]}
            onSaved={reload}
          />
        ))}
        <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, background: T.surface2 }}>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
              font: `600 12px ${T.font}`, color: T.accentFg,
            }}
          >
            {showAdvanced ? t('config.hideAdvanced') : t('config.showAdvanced')}
          </button>
        </div>
      </Card>

      <SectionTitle T={T} title={t('config.reservedTitle')} sub={t('config.reservedSub')} />
      <Card T={T} pad={18}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {reserved.map((s) => {
            const own = SURFACE_SUBS.has(s);
            return (
              <span
                key={s}
                style={{
                  padding: '7px 12px', borderRadius: 999,
                  background: own ? T.adminBg : T.surface2,
                  color: own ? T.adminFg : T.textDim,
                  font: `600 12px ${T.mono}`,
                  border: `1px solid ${own ? `${T.admin}55` : 'transparent'}`,
                }}
              >
                {s}
              </span>
            );
          })}
          {reserved.length === 0 && (
            <span style={{ font: `500 12.5px ${T.font}`, color: T.textMute }}>
              {t('config.reservedEmpty')}
            </span>
          )}
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: T.textMute, display: 'flex' }}><Icons.shield size={13} /></span>
          <span style={{ font: `400 11.5px/1.5 ${T.font}`, color: T.textMute }}>
            {t('config.reservedNote')}
          </span>
        </div>
      </Card>
    </>
  );
}
