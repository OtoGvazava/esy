// /integrations — the channels the platform speaks through.
//
// Today that is SMS Office (smsoffice.ge). Two kinds of thing live here and
// they behave differently on purpose:
//
//   The API key is a SECRET and is not shown or editable. The screen reports
//   only whether one is set, because a credential echoed back into a browser
//   to fill a "current value" box is a credential in screenshots and bug
//   reports. Rotating it is a deployment action.
//
//   The sender name and the message texts are OPERATIONAL. They are the things
//   that change after the first week of real deliveries, so they are editable
//   here and take effect within seconds, no redeploy.
//
// Each template shows its character count and billed units. That is not
// decoration: Georgian is Unicode, so 70 characters is one unit and 71 is two,
// and an admin editing copy has no other way to see they just doubled the
// platform's SMS bill.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi, handleApiError } from '../utils/api';
import { useAdminTokens } from './adminTokens';
import { Btn, Card, Chip, Note, SectionTitle } from '../core/primitives';
import { Failed, Loading } from './AdminUI';

function TemplateRow({ T, t, row, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const begin = () => { setDraft(row.text); setError(''); setEditing(true); };

  const save = async (text) => {
    setBusy(true);
    setError('');
    try {
      await adminApi.updateIntegrations({ templates: { [row.key]: text } });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(handleApiError(e, t('integrations.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  // Live counts while typing, so the cost of a longer sentence is visible
  // before it is saved rather than after.
  const shown = editing ? draft : row.text;
  const len = shown.length;
  const units = len === 0 ? 0 : len <= 70 ? 1 : Math.ceil(len / 67);

  return (
    <div style={{ padding: '15px 18px', borderTop: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ font: `700 13px ${T.font}`, color: T.text }}>{t(`integrations.tpl.${row.key}`)}</span>
        {row.isDefault && <Chip T={T}>{t('integrations.default')}</Chip>}
        <span style={{ flex: 1 }} />
        <span style={{ font: `500 11px ${T.mono}`, color: units > 1 ? T.warnFg : T.textMute }}>
          {t('integrations.units', { len, units })}
        </span>
      </div>

      {!editing ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <span style={{ flex: 1, minWidth: 0, font: `500 13px/1.6 ${T.font}`, color: T.textDim, wordBreak: 'break-word' }}>
            {row.text}
          </span>
          <Btn T={T} kind="quiet" size="sm" onClick={begin}>{t('integrations.edit')}</Btn>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              padding: '10px 12px', borderRadius: 12,
              background: T.surface, border: `1.5px solid ${error ? T.danger : T.border}`,
              color: T.text, font: `500 13px/1.6 ${T.font}`, outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn T={T} size="sm" disabled={busy} onClick={() => save(draft)}>
              {busy ? t('ui.working') : t('integrations.save')}
            </Btn>
            <Btn T={T} kind="ghost" size="sm" disabled={busy} onClick={() => setEditing(false)}>
              {t('integrations.cancel')}
            </Btn>
            {!row.isDefault && (
              <Btn T={T} kind="ghost" size="sm" disabled={busy} onClick={() => save(row.defaultText)}>
                {t('integrations.reset')}
              </Btn>
            )}
          </div>
          {error && <span style={{ font: `500 12px ${T.font}`, color: T.dangerFg }}>{error}</span>}
        </div>
      )}

      {/* The tokens this message may use. Anything else is refused by the API
          rather than sent to a shopper as a literal brace. */}
      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {row.tokens.map((tok) => (
          <span
            key={tok}
            style={{
              padding: '3px 8px', borderRadius: 999, font: `600 10.5px ${T.mono}`,
              background: tok === row.requiredToken ? T.accentBg : T.surface2,
              color: tok === row.requiredToken ? T.accentFg : T.textMute,
            }}
          >{`{${tok}}`}{tok === row.requiredToken ? ' *' : ''}</span>
        ))}
        {row.requiredToken && (
          <span style={{ font: `400 11px ${T.font}`, color: T.textMute }}>
            {t('integrations.requiredHint', { token: `{${row.requiredToken}}` })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminIntegrations() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sender, setSender] = useState('');
  const [editingSender, setEditingSender] = useState(false);
  const [senderBusy, setSenderBusy] = useState(false);
  const [senderError, setSenderError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const d = await adminApi.getIntegrations();
      setData(d);
      setSender(d?.sms?.sender || '');
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // A write lands in the config store and is read back through its cache, so
  // an immediate re-fetch would show the old value and read as a failed save.
  const reload = useCallback(() => { setTimeout(load, 2500); }, [load]);

  const saveSender = async () => {
    setSenderBusy(true);
    setSenderError('');
    try {
      await adminApi.updateIntegrations({ sender });
      setEditingSender(false);
      reload();
    } catch (e) {
      setSenderError(handleApiError(e, t('integrations.saveFailed')));
    } finally {
      setSenderBusy(false);
    }
  };

  if (loading) return <Loading T={T} />;
  if (error && !data) return <Failed T={T} message={error} onRetry={load} />;

  const sms = data?.sms || {};
  const rows = Array.isArray(sms.templates) ? sms.templates : [];

  return (
    <>
      <SectionTitle
        T={T}
        title={t('integrations.title')}
        sub={t('integrations.sub')}
        right={(
          <Chip T={T} tone={sms.configured ? 'success' : 'warn'}>
            {sms.configured ? t('integrations.keySet') : t('integrations.keyMissing')}
          </Chip>
        )}
      />

      {!sms.configured && (
        <div style={{ marginBottom: 14 }}>
          <Note T={T} tone="warn">{t('integrations.keyMissingHint')}</Note>
        </div>
      )}

      <Card T={T} pad={0} style={{ overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '15px 18px' }}>
          <div style={{ font: `700 14.5px ${T.font}`, color: T.text }}>SMS Office</div>
          <div style={{ marginTop: 3, font: `500 11.5px ${T.mono}`, color: T.textMute }}>{sms.endpoint}</div>
        </div>

        {/* The key: status only, never the value. */}
        <div style={{ padding: '15px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 220px', minWidth: 0 }}>
            <span style={{ display: 'block', font: `700 12.5px ${T.mono}`, color: T.text }}>APP_SMS_KEY</span>
            <span style={{ display: 'block', font: `400 11.5px/1.5 ${T.font}`, color: T.textMute, marginTop: 3 }}>
              {t('integrations.keyNote')}
            </span>
          </span>
          <Chip T={T} tone={sms.configured ? 'success' : 'neutral'}>
            {sms.configured ? t('integrations.keySet') : t('integrations.keyMissing')}
          </Chip>
        </div>

        {/* The sender name: editable, because it must match what SMS Office
            has approved and that can change while approval is pending. */}
        <div style={{ padding: '15px 18px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 220px', minWidth: 0 }}>
              <span style={{ display: 'block', font: `700 12.5px ${T.mono}`, color: T.text }}>app.sms.sender</span>
              <span style={{ display: 'block', font: `400 11.5px/1.5 ${T.font}`, color: T.textMute, marginTop: 3 }}>
                {t('integrations.senderNote')}
              </span>
            </span>
            {!editingSender && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 200px', minWidth: 0 }}>
                <span style={{ flex: 1, minWidth: 0, font: `600 12.5px ${T.mono}`, color: T.textDim }}>{sms.sender}</span>
                <Btn T={T} kind="quiet" size="sm" onClick={() => { setSender(sms.sender); setEditingSender(true); }}>
                  {t('integrations.edit')}
                </Btn>
              </span>
            )}
          </div>
          {editingSender && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                maxLength={11}
                style={{
                  height: 44, padding: '0 14px', borderRadius: 12, boxSizing: 'border-box',
                  background: T.surface, border: `1.5px solid ${senderError ? T.danger : T.border}`,
                  color: T.text, font: `600 13px ${T.mono}`, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn T={T} size="sm" disabled={senderBusy} onClick={saveSender}>
                  {senderBusy ? t('ui.working') : t('integrations.save')}
                </Btn>
                <Btn T={T} kind="ghost" size="sm" disabled={senderBusy} onClick={() => setEditingSender(false)}>
                  {t('integrations.cancel')}
                </Btn>
              </div>
              {senderError && <span style={{ font: `500 12px ${T.font}`, color: T.dangerFg }}>{senderError}</span>}
            </div>
          )}
        </div>
      </Card>

      <SectionTitle T={T} title={t('integrations.templatesTitle')} sub={t('integrations.templatesSub')} />
      <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
        {rows.map((row) => (
          <TemplateRow key={row.key} T={T} t={t} row={row} onSaved={reload} />
        ))}
      </Card>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Note T={T} tone="admin">{t('integrations.langNote')}</Note>
        <Note T={T}>{t('integrations.cancelNote')}</Note>
      </div>
    </>
  );
}
