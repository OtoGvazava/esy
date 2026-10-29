// /integrations — the channels the platform speaks through.
//
// Today that is SMS Office (smsoffice.ge) for text and Resend for mail. Two
// kinds of thing live here and
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
import { Btn, Card, Chip, Note, SectionTitle, Toggle } from '../core/primitives';
import { Failed, Loading } from './AdminUI';

function TemplateRow({ T, t, row, onSaved, canWrite }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.text);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const begin = () => { setDraft(row.text); setError(''); setEditing(true); };

  const toggle = async (on) => {
    setBusy(true);
    setError('');
    try {
      await adminApi.updateIntegrations({ templateEnabled: { [row.key]: on } });
      onSaved();
    } catch (e) {
      setError(handleApiError(e, t('integrations.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        {/* The switch sits first: whether a message goes out at all is a bigger
            fact about it than what it says. The OTP has none — silencing it
            stops checkout rather than saving money. */}
        {row.switchable ? (
          <Toggle
            T={T}
            on={row.enabled}
            disabled={busy || !canWrite}
            onClick={() => toggle(!row.enabled)}
          />
        ) : (
          <Chip T={T} tone="accent">{t('integrations.always')}</Chip>
        )}
        <span style={{
          font: `700 13px ${T.font}`,
          color: row.enabled ? T.text : T.textMute,
          textDecoration: row.enabled ? 'none' : 'line-through',
        }}>{t(`integrations.tpl.${row.key}`)}</span>
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
  const [masterBusy, setMasterBusy] = useState(false);

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

  const toggleMaster = async (on) => {
    setMasterBusy(true);
    try {
      await adminApi.updateIntegrations({ enabled: on });
      reload();
    } catch (e) {
      setError(handleApiError(e, t('integrations.saveFailed')));
    } finally {
      setMasterBusy(false);
    }
  };

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

      {/* Nothing on this screen can be saved without the config store, so say
          that before an admin edits five things and loses all of them. */}
      {!sms.storeReady && (
        <div style={{ marginBottom: 14 }}>
          <Note T={T} tone="danger">{t('integrations.storeOffline')}</Note>
        </div>
      )}

      {!sms.configured && (
        <div style={{ marginBottom: 14 }}>
          <Note T={T} tone="warn">{t('integrations.keyMissingHint')}</Note>
        </div>
      )}

      {sms.configured && !sms.enabled && (
        <div style={{ marginBottom: 14 }}>
          <Note T={T} tone="danger">{t('integrations.disabledWarning')}</Note>
        </div>
      )}

      {/* The provider's own answer for why the last message failed. Without
          this the only symptom is a shopper seeing "could not send the code",
          and the cause sits in a log on a host nobody opens. */}
      {sms.lastFailure && (
        <div style={{
          marginBottom: 14, padding: '13px 15px', borderRadius: 14,
          background: T.dangerBg, border: `1px solid ${T.danger}55`,
        }}>
          <div style={{ font: `700 13px ${T.font}`, color: T.dangerFg }}>
            {t('integrations.lastFailureTitle')}
          </div>
          <div style={{ marginTop: 5, font: `500 12.5px/1.55 ${T.font}`, color: T.text }}>
            {sms.lastFailure.reason}
          </div>
          <div style={{ marginTop: 6, font: `500 10.5px ${T.mono}`, color: T.textMute }}>
            {sms.lastFailure.errorCode != null && `ErrorCode ${sms.lastFailure.errorCode} · `}
            {sms.lastFailure.at}
          </div>
        </div>
      )}

      <Card T={T} pad={0} style={{ overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', font: `700 14.5px ${T.font}`, color: T.text }}>SMS Office</span>
            <span style={{ display: 'block', marginTop: 3, font: `500 11.5px ${T.mono}`, color: T.textMute }}>{sms.endpoint}</span>
          </span>
          {/* Master switch. Off stops every message including the code, which
              stops checkout — the warning above spells that out. */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ font: `600 12px ${T.font}`, color: sms.enabled ? T.successFg : T.textMute }}>
              {sms.enabled ? t('integrations.on') : t('integrations.off')}
            </span>
            <Toggle
              T={T}
              on={!!sms.enabled}
              disabled={masterBusy || !sms.storeReady}
              onClick={() => toggleMaster(!sms.enabled)}
            />
          </span>
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
          <TemplateRow key={row.key} T={T} t={t} row={row} onSaved={reload} canWrite={!!sms.storeReady} />
        ))}
      </Card>

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Note T={T} tone="admin">{t('integrations.langNote')}</Note>
        <Note T={T}>{t('integrations.cancelNote')}</Note>
      </div>

      <EmailSection T={T} t={t} email={data?.email || {}} onSaved={reload} />
    </>
  );
}

// ---- Email (Resend) --------------------------------------------------------
//
// The same shape as the SMS block above, because the same two kinds of thing
// live in it: a secret key that is reported but never shown, and operational
// wording that is editable and live.
//
// Two differences, both deliberate. There are no billed-unit counts — mail is
// not priced per 70 characters, so the number would be noise. And every
// template is switchable, including cancellation and refund: nothing in
// checkout waits on an email, so turning one off costs courtesy rather than
// function, which is the opposite of the verification SMS.
function EmailSection({ T, t, email, onSaved }) {
  const [from, setFrom] = useState(email.from || '');
  const [editingFrom, setEditingFrom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const rows = Array.isArray(email.templates) ? email.templates : [];
  const canWrite = !!email.storeReady;

  const save = async (patch) => {
    setBusy(true);
    setError('');
    try {
      await adminApi.updateIntegrations({ email: patch });
      setEditingFrom(false);
      onSaved();
    } catch (e) {
      setError(handleApiError(e, t('integrations.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 28 }}>
      <SectionTitle
        T={T}
        title={t('integrations.emailTitle')}
        sub={t('integrations.emailSub')}
        right={(
          <Chip T={T} tone={email.configured ? 'success' : 'warn'}>
            {email.configured ? t('integrations.keySet') : t('integrations.keyMissing')}
          </Chip>
        )}
      />

      {!email.configured && (
        <div style={{ marginBottom: 14 }}>
          <Note T={T} tone="warn">{t('integrations.emailKeyMissingHint')}</Note>
        </div>
      )}

      {email.configured && !email.enabled && (
        <div style={{ marginBottom: 14 }}>
          <Note T={T} tone="warn">{t('integrations.emailDisabledWarning')}</Note>
        </div>
      )}

      {/* Resend's own reason — "the domain is not verified" is the usual one,
          and it is the single thing an operator can act on from here. */}
      {email.lastFailure && (
        <div style={{
          marginBottom: 14, padding: '13px 15px', borderRadius: 14,
          background: T.dangerBg, border: `1px solid ${T.danger}55`,
        }}>
          <div style={{ font: `700 13px ${T.font}`, color: T.dangerFg }}>
            {t('integrations.lastFailureTitle')}
          </div>
          <div style={{ marginTop: 5, font: `500 12.5px/1.55 ${T.font}`, color: T.text }}>
            {email.lastFailure.reason}
          </div>
          <div style={{ marginTop: 6, font: `500 10.5px ${T.mono}`, color: T.textMute }}>
            {email.lastFailure.statusCode != null && `HTTP ${email.lastFailure.statusCode} · `}
            {email.lastFailure.at}
          </div>
        </div>
      )}

      <Card T={T} pad={0} style={{ overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', font: `700 14.5px ${T.font}`, color: T.text }}>Resend</span>
            <span style={{ display: 'block', marginTop: 3, font: `500 11.5px ${T.mono}`, color: T.textMute }}>{email.endpoint}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ font: `600 12px ${T.font}`, color: email.enabled ? T.successFg : T.textMute }}>
              {email.enabled ? t('integrations.on') : t('integrations.off')}
            </span>
            <Toggle
              T={T}
              on={!!email.enabled}
              disabled={busy || !canWrite}
              onClick={() => save({ enabled: !email.enabled })}
            />
          </span>
        </div>

        <div style={{ padding: '15px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 220px', minWidth: 0 }}>
            <span style={{ display: 'block', font: `700 12.5px ${T.mono}`, color: T.text }}>APP_EMAIL_KEY</span>
            <span style={{ display: 'block', font: `400 11.5px/1.5 ${T.font}`, color: T.textMute, marginTop: 3 }}>
              {t('integrations.keyNote')}
            </span>
          </span>
          <Chip T={T} tone={email.configured ? 'success' : 'neutral'}>
            {email.configured ? t('integrations.keySet') : t('integrations.keyMissing')}
          </Chip>
        </div>

        {/* The from-address: editable, because it has to sit on a domain
            verified with Resend and that verification takes time to land. */}
        <div style={{ padding: '15px 18px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 220px', minWidth: 0 }}>
              <span style={{ display: 'block', font: `700 12.5px ${T.mono}`, color: T.text }}>app.email.from</span>
              <span style={{ display: 'block', font: `400 11.5px/1.5 ${T.font}`, color: T.textMute, marginTop: 3 }}>
                {t('integrations.fromNote')}
              </span>
            </span>
            {!editingFrom && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 200px', minWidth: 0 }}>
                <span style={{ flex: 1, minWidth: 0, font: `600 12.5px ${T.mono}`, color: T.textDim }}>{email.from}</span>
                <Btn T={T} kind="quiet" size="sm" onClick={() => { setFrom(email.from || ''); setEditingFrom(true); }}>
                  {t('integrations.edit')}
                </Btn>
              </span>
            )}
          </div>
          {editingFrom && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                maxLength={200}
                style={{
                  height: 44, padding: '0 14px', borderRadius: 12, boxSizing: 'border-box',
                  background: T.surface, border: `1.5px solid ${error ? T.danger : T.border}`,
                  color: T.text, font: `600 13px ${T.mono}`, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn T={T} size="sm" disabled={busy} onClick={() => save({ from })}>
                  {busy ? t('ui.working') : t('integrations.save')}
                </Btn>
                <Btn T={T} kind="ghost" size="sm" disabled={busy} onClick={() => setEditingFrom(false)}>
                  {t('integrations.cancel')}
                </Btn>
              </div>
              {error && <span style={{ font: `500 12px ${T.font}`, color: T.dangerFg }}>{error}</span>}
            </div>
          )}
        </div>
      </Card>

      <SectionTitle T={T} title={t('integrations.emailTemplatesTitle')} sub={t('integrations.emailTemplatesSub')} />
      <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
        {rows.map((row) => (
          <EmailTemplateRow key={row.key} T={T} t={t} row={row} onSaved={onSaved} canWrite={canWrite} />
        ))}
      </Card>
    </div>
  );
}

function EmailTemplateRow({ T, t, row, onSaved, canWrite }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(row.subject);
  const [body, setBody] = useState(row.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const begin = () => {
    setSubject(row.subject);
    setBody(row.body);
    setError('');
    setEditing(true);
  };

  const run = async (patch) => {
    setBusy(true);
    setError('');
    try {
      await adminApi.updateIntegrations({ email: patch });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(handleApiError(e, t('integrations.saveFailed')));
    } finally {
      setBusy(false);
    }
  };

  const field = {
    padding: '10px 12px', borderRadius: 10, boxSizing: 'border-box', width: '100%',
    background: T.surface, border: `1.5px solid ${error ? T.danger : T.border}`,
    color: T.text, font: `500 12.5px ${T.font}`, outline: 'none',
  };

  return (
    <div style={{ padding: '15px 18px', borderTop: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ flex: '1 1 240px', minWidth: 0 }}>
          <span style={{ display: 'block', font: `700 13px ${T.font}`, color: T.text }}>
            {t(`integrations.emailTemplate.${row.key}`, { defaultValue: row.key })}
          </span>
          <span style={{ display: 'block', marginTop: 3, font: `600 11.5px ${T.mono}`, color: T.textDim }}>
            {row.subject}
          </span>
          <span style={{ display: 'block', marginTop: 4, font: `400 11.5px/1.5 ${T.font}`, color: T.textMute, whiteSpace: 'pre-wrap' }}>
            {row.body}
          </span>
          {/* The tokens this message may use — anything else is refused as a
              typo rather than rendered as nothing. */}
          <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
            {(row.tokens || []).map((tok) => (
              <span key={tok} style={{ padding: '2px 7px', borderRadius: 999, background: T.surface2, font: `600 10px ${T.mono}`, color: T.textMute }}>
                {`{${tok}}`}
              </span>
            ))}
          </span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Toggle
            T={T}
            on={!!row.enabled}
            disabled={busy || !canWrite}
            onClick={() => run({ templateEnabled: { [row.key]: !row.enabled } })}
          />
          <Btn T={T} kind="quiet" size="sm" disabled={!canWrite} onClick={begin}>
            {t('integrations.edit')}
          </Btn>
        </span>
      </div>

      {editing && (
        <div style={{ marginTop: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} style={field} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={5000}
            style={{ ...field, resize: 'vertical', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn T={T} size="sm" disabled={busy} onClick={() => run({ templates: { [row.key]: { subject, body } } })}>
              {busy ? t('ui.working') : t('integrations.save')}
            </Btn>
            <Btn T={T} kind="ghost" size="sm" disabled={busy} onClick={() => setEditing(false)}>
              {t('integrations.cancel')}
            </Btn>
            {!row.isDefault && (
              <Btn
                T={T}
                kind="ghost"
                size="sm"
                disabled={busy}
                onClick={() => run({ templates: { [row.key]: { subject: row.defaultSubject, body: row.defaultBody } } })}
              >
                {t('integrations.reset')}
              </Btn>
            )}
          </div>
          {error && <span style={{ font: `500 12px ${T.font}`, color: T.dangerFg }}>{error}</span>}
        </div>
      )}
    </div>
  );
}
