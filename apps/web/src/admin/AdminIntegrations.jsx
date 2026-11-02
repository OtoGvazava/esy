// /integrations — SMS and email, the channels the platform speaks through
// (the design's AD7).
//
// Two channel cards (SMS Office, Resend): the master switch, whether an API
// key is set, the sender and where it comes from. Then the message matrix —
// one row per notice, a switch per channel — and the editor for the selected
// message. On a phone the editor opens as a sheet from the row.
//
// Two kinds of thing live here and behave differently on purpose:
//
//   The API keys are SECRETS. The screen reports only whether one is set; a
//   credential echoed into a browser is a credential in screenshots and bug
//   reports. Rotating one is a deployment action.
//
//   The senders, the switches and the message texts are OPERATIONAL. They
//   change after the first week of real deliveries, so they are editable here
//   and take effect within seconds.
//
// The SMS editor counts characters and billed units as the message will be
// sent: {order} is counted at the longest number (#99999) and {code} at four
// digits. Georgian is Unicode, so 70 characters is one unit and 71 is two —
// an admin editing copy has no other way to see they just doubled the bill.
//
// The verification code has no switch (checkout needs it), and cancellations
// and refunds go by email only: the matrix draws both rules.
import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminApi, handleApiError } from '../utils/api';
import { adminIntegrationsQuery } from '../core/query/adminQueries';
import { useAdminTokens } from './adminTokens';
import { useAdminHead } from './adminHead';
import { useDevice } from '../contexts/DeviceContext';
import { Failed, dateTime } from './AdminUI';
import {
  Alert, Dialog, DialogPoint, Glyph, KitBtn, KitChip, List, Mono, Progress, RowIcon, Seg, SourceChip,
  Switch, SwitchMark,
} from './AdminKit';
import { IntegrationsSkeleton } from './AdminSkeletons';

/** Matrix rows, top to bottom: the code, the four order notices, then email-only. */
const ROWS = ['otp', 'orderPlaced', 'orderShipped', 'orderOut', 'orderDelivered', 'orderCancelled', 'orderRefunded'];

// What a token is counted as: its longest real value.
const COUNT_AS = { order: '#99999', code: '1234' };
const smsLength = (text) => [...String(text || '').replace(/\{(order|code)\}/g, (_, k) => COUNT_AS[k])].length;
const smsUnits = (len) => (len === 0 ? 0 : len <= 70 ? 1 : Math.ceil(len / 67));

// The kit's `.in`: a 1.5px border, the brand with its 4px ring while focused.
const fieldStyle = (T, bad, focus) => ({
  width: '100%', boxSizing: 'border-box', borderRadius: 12, background: 'var(--k-in-bg)', color: T.text,
  border: `1.5px solid ${bad ? T.danger : focus ? T.accent : 'var(--k-in-bd)'}`, outline: 'none',
  boxShadow: focus && !bad ? `0 0 0 4px color-mix(in oklab, ${T.accent} 18%, transparent)` : 'none',
});

/** The editor for one message on one channel. Remounted (by key) when the selection changes. */
function Editor({ T, t, phone, kind, row, name, channels, onChannel, canWrite, busy, error, onSave, showTitle = true }) {
  const isSms = kind === 'sms';
  const [text, setText] = useState(row.text ?? '');
  const [subject, setSubject] = useState(row.subject ?? '');
  const [body, setBody] = useState(row.body ?? '');
  const [focus, setFocus] = useState('');
  const focusProps = (name) => ({ onFocus: () => setFocus(name), onBlur: () => setFocus('') });
  const mono = <Mono T={T} />;

  // The server's copy the fields were filled from, and whether a save or a
  // reset from here is waiting for its answer. A read that brings another
  // copy fills the fields again only when they still hold the last one
  // untouched, or when it is that answer: a read never overwrites what is
  // being typed. (The copy keeps its identity while nothing in it changes:
  // the query cache shares what is equal from one read to the next.)
  const [base, setBase] = useState(row);
  const [saving, setSaving] = useState(false);
  if (row !== base) {
    const untouched = text === (base.text ?? '') && subject === (base.subject ?? '') && body === (base.body ?? '');
    setBase(row);
    if (untouched || saving) {
      setText(row.text ?? '');
      setSubject(row.subject ?? '');
      setBody(row.body ?? '');
      setSaving(false);
    }
  }
  const typing = (set) => (e) => { set(e.target.value); setSaving(false); };

  const changed = isSms ? text !== row.text : (subject !== row.subject || body !== row.body);
  const len = smsLength(text);
  const units = smsUnits(len);
  const tokens = (row.tokens || []).map((k) => `{${k}}`).join(', ');
  const extra = isSms && /\{(store|url)\}/.test(text);

  const send = (patch) => {
    setSaving(true);
    onSave(patch).then((ok) => { if (!ok) setSaving(false); });
  };
  const save = () => send(isSms ? { templates: { [row.key]: text } }
    : { email: { templates: { [row.key]: { subject, body } } } });
  const reset = () => {
    if (isSms) {
      setText(row.defaultText);
      send({ templates: { [row.key]: row.defaultText } });
    } else {
      setSubject(row.defaultSubject);
      setBody(row.defaultBody);
      send({ email: { templates: { [row.key]: { subject: row.defaultSubject, body: row.defaultBody } } } });
    }
  };
  const atDefault = isSms ? text === row.defaultText
    : subject === row.defaultSubject && body === row.defaultBody;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(showTitle || row.isDefault) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {showTitle && (
            <b style={{ font: `600 16px/1.3 ${T.font}`, color: T.text, minWidth: 0 }}>
              {t('integrations.editorTitle', { name, channel: isSms ? 'SMS' : t('integrations.email') })}
            </b>
          )}
          {row.isDefault && <KitChip T={T} tone="proc">{t('integrations.default')}</KitChip>}
        </div>
      )}

      {channels.length > 1 && (
        <Seg
          T={T}
          phone={phone}
          label={t('integrations.channelLabel')}
          value={kind}
          onChange={onChannel}
          options={channels.map((c) => ({ id: c, label: c === 'sms' ? 'SMS' : t('integrations.email') }))}
        />
      )}

      {isSms ? (
        <>
          <textarea
            value={text}
            onChange={typing(setText)}
            aria-label={t('integrations.textLabel')}
            maxLength={1000}
            {...focusProps('text')}
            style={{ ...fieldStyle(T, !!error, focus === 'text'), height: 84, padding: '12px 15px', resize: 'none', font: `500 15px/1.5 ${T.font}` }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Progress T={T} pct={(len / 70) * 100} over={len > 70} />
            <span style={{ font: `500 12px ${T.font}`, color: len > 70 ? 'var(--k-warn)' : T.textDim, whiteSpace: 'nowrap' }}>
              {t('integrations.units', { len, units })}
            </span>
          </div>
          <p style={{ margin: 0, font: `500 12px/1.55 ${T.font}`, color: T.textDim }}>
            {row.requiredToken && (
              <><Trans t={t} i18nKey="integrations.requiredToken" values={{ token: `{${row.requiredToken}}` }} components={{ mono }} />{' '}</>
            )}
            {(row.tokens || []).includes('order') && (
              <><Trans t={t} i18nKey="integrations.orderCounted" components={{ mono }} />{' '}</>
            )}
            {t('integrations.unicode')}
            {extra && <>{' '}<Trans t={t} i18nKey="integrations.notCounted" components={{ mono }} /></>}
          </p>
        </>
      ) : (
        <>
          <input
            value={subject}
            onChange={typing(setSubject)}
            aria-label={t('integrations.subjectLabel')}
            maxLength={200}
            {...focusProps('subject')}
            style={{ ...fieldStyle(T, !!error, focus === 'subject'), height: 50, padding: '0 15px', font: `500 15px ${T.font}` }}
          />
          <textarea
            value={body}
            onChange={typing(setBody)}
            aria-label={t('integrations.bodyLabel')}
            rows={7}
            maxLength={5000}
            {...focusProps('body')}
            style={{ ...fieldStyle(T, !!error, focus === 'body'), padding: '12px 15px', resize: 'vertical', font: `500 14px/1.55 ${T.font}` }}
          />
          <p style={{ margin: 0, font: `500 12px/1.55 ${T.font}`, color: T.textDim }}>{t('integrations.emailPlain')}</p>
        </>
      )}

      {tokens && (
        <span style={{ font: `500 12px/1.5 ${T.font}`, color: T.textDim }}>
          <Trans t={t} i18nKey="integrations.tokens" values={{ tokens }} components={{ mono }} />
        </span>
      )}
      {error && <span role="alert" style={{ font: `500 12px/1.45 ${T.font}`, color: T.dangerFg }}>{error}</span>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <KitBtn T={T} size="sm" disabled={!canWrite || busy || (row.isDefault && atDefault)} onClick={reset}>
          {t('integrations.reset')}
        </KitBtn>
        <KitBtn T={T} kind="primary" size="sm" disabled={!canWrite || busy || !changed} onClick={save}>
          {busy ? t('ui.working') : t('integrations.save')}
        </KitBtn>
      </div>
    </div>
  );
}

/** The sender / from line in a channel card, with its inline edit. */
function Sender({ T, t, phone, value, source, maxLength, canWrite, busy, error, onSave, bad }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '5px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{t('integrations.sender')}</span>
        {!editing && (
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => { setDraft(value || ''); setEditing(true); }}
            style={{
              border: 'none', background: 'transparent', padding: phone ? '12px 0' : '4px 0', margin: phone ? '-12px 0' : 0,
              color: canWrite ? T.accentFg : T.textMute, font: `600 12.5px ${T.font}`,
              cursor: canWrite ? 'pointer' : 'not-allowed',
            }}
          >
            {t('integrations.change')}
          </button>
        )}
      </div>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={draft}
            autoFocus
            spellCheck={false}
            maxLength={maxLength}
            aria-label={t('integrations.sender')}
            onChange={(e) => setDraft(e.target.value)}
            style={{ ...fieldStyle(T, !!error), height: 44, padding: '0 14px', font: `600 13px ${T.mono}` }}
          />
          {error && <span role="alert" style={{ font: `500 12px/1.45 ${T.font}`, color: T.dangerFg }}>{error}</span>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <KitBtn T={T} size="sm" disabled={busy} onClick={() => setEditing(false)}>{t('ui.cancel')}</KitBtn>
            <KitBtn
              T={T}
              kind="primary"
              size="sm"
              disabled={busy || !draft.trim() || draft.trim() === value}
              onClick={async () => { if (await onSave(draft.trim())) setEditing(false); }}
            >
              {busy ? t('ui.working') : t('integrations.save')}
            </KitBtn>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ font: `500 12px ${T.mono}`, color: bad ? T.dangerFg : T.text, overflowWrap: 'anywhere' }}>{value}</span>
          <SourceChip T={T} source={source} />
        </div>
      )}
    </div>
  );
}

function KeyLine({ T, t, configured }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '5px 0' }}>
      <span style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{t('integrations.apiKey')}</span>
      {configured
        ? <span style={{ font: `600 12.5px ${T.font}`, color: 'var(--k-ok)' }}>{t('integrations.keySet')}</span>
        : <KitChip T={T} tone="warn">{t('integrations.keyMissing')}</KitChip>}
    </div>
  );
}

function ChannelCard({ T, icon, title, sub, master, children }) {
  return (
    <div style={{
      padding: 16, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <RowIcon T={T} name={icon} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', font: `700 15px/1.3 ${T.font}`, color: T.text }}>{title}</b>
          <div style={{ font: `500 12px/1.4 ${T.font}`, color: T.textDim }}>{sub}</div>
        </div>
        {master}
      </div>
      {children}
    </div>
  );
}

export default function AdminIntegrations() {
  const T = useAdminTokens();
  const { t, i18n } = useTranslation('admin');
  const lang = i18n.language;
  const { isMobile, isDesktop } = useDevice();

  const [sel, setSel] = useState({ key: 'orderPlaced', channel: 'sms' });
  const [sheet, setSheet] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});
  const later = useRef(null);

  // The settings from the query cache. The editor and the sender lines fill
  // their own fields from them, and a read never overwrites what is typed.
  const settings = useQuery(adminIntegrationsQuery());
  const { refetch } = settings;
  const data = settings.data ?? null;

  useEffect(() => () => clearTimeout(later.current), []);

  /**
   * One write, then read back what is in effect: now — the read every write
   * sets off (core/query/client.js), waited for rather than doubled — and
   * once more after the cache TTL.
   */
  const write = async (id, patch) => {
    setBusy(id);
    setErrors((p) => ({ ...p, [id]: '' }));
    try {
      await adminApi.updateIntegrations(patch);
      await refetch({ cancelRefetch: false });
      clearTimeout(later.current);
      later.current = setTimeout(() => { refetch(); }, 2500);
      return true;
    } catch (e) {
      setErrors((p) => ({ ...p, [id]: handleApiError(e, t('integrations.saveFailed')) }));
      return false;
    } finally {
      setBusy('');
    }
  };

  useAdminHead({ title: t('integrations.title'), sub: t('integrations.sub') });

  // A retry after a failure draws the skeleton again, as the first load did.
  if (settings.isPending || (settings.isError && !data && settings.isFetching)) return <IntegrationsSkeleton />;
  if (settings.isError && !data) {
    return <Failed T={T} message={handleApiError(settings.error, t('integrations.loadFailed'))} onRetry={() => refetch()} />;
  }

  const sms = data?.sms || {};
  const email = data?.email || {};
  const smsRows = Object.fromEntries((sms.templates || []).map((r) => [r.key, r]));
  const emailRows = Object.fromEntries((email.templates || []).map((r) => [r.key, r]));
  const canSms = !!sms.storeReady;
  const canEmail = !!email.storeReady;
  const mono = <Mono T={T} />;
  // SMS Office's ErrorCode 150: the sender is not registered with them.
  const senderRejected = sms.lastFailure?.errorCode === 150;
  // "today 14:02" for a failure today, the full date and time otherwise.
  const when = (at) => {
    const d = at ? new Date(at) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    if (d.toDateString() !== new Date().toDateString()) return dateTime(at, lang);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return t('integrations.todayAt', { time });
  };

  const channelsOf = (key) => [smsRows[key] && 'sms', emailRows[key] && 'email'].filter(Boolean);
  const pick = (key, channel) => {
    const chans = channelsOf(key);
    setSel({ key, channel: chans.includes(channel) ? channel : chans[0] });
    if (isMobile) setSheet(true);
  };
  const selRow = sel.channel === 'sms' ? smsRows[sel.key] : emailRows[sel.key];

  const rowSub = (key) => {
    if (key === 'otp') {
      if (!sms.configured) return [t('integrations.codeNoKey'), true];
      if (!sms.enabled) return [t('integrations.codeOff'), true];
      if (senderRejected) return [t('integrations.codeRejected'), true];
      return [t('integrations.rowSub.otp'), false];
    }
    if (!isMobile && key === sel.key) return [t('integrations.editingNow'), false];
    return [t(`integrations.rowSub.${key}`), false];
  };

  const smsCell = (key) => {
    const r = smsRows[key];
    if (!r) return <span style={{ color: T.textDim }}>—</span>;
    if (!r.switchable) {
      return (
        <span role="img" aria-label={t('integrations.always')} style={{ display: 'inline-flex' }}>
          <SwitchMark T={T} on={sms.enabled !== false} dim />
        </span>
      );
    }
    return (
      <Switch
        T={T}
        on={!!r.enabled}
        dim={!sms.enabled}
        disabled={!canSms || !!busy}
        label={`${t(`integrations.row.${key}`)} · SMS`}
        onChange={(on) => write(`sms:${key}`, { templateEnabled: { [key]: on } })}
      />
    );
  };
  const emailCell = (key) => {
    const r = emailRows[key];
    if (!r) return <span style={{ color: T.textDim }}>—</span>;
    return (
      <Switch
        T={T}
        on={!!r.enabled}
        dim={!email.configured || !email.enabled}
        disabled={!canEmail || !!busy}
        label={`${t(`integrations.row.${key}`)} · ${t('integrations.email')}`}
        onChange={(on) => write(`email:${key}`, { email: { templateEnabled: { [key]: on } } })}
      />
    );
  };

  const col = { width: isMobile ? 46 : 72, flex: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', whiteSpace: 'nowrap' };
  // The kit's `.lbl`, as the matrix's column heads use it.
  const lbl = { font: '600 11.5px/1.2 var(--k-font-m)', letterSpacing: '0.06em', color: T.textDim };

  const matrix = (
    <List T={T}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', minHeight: 48,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <b style={{ flex: 1, minWidth: 0, font: `600 16px/1.3 ${T.font}`, color: T.text }}>{t('integrations.templatesTitle')}</b>
        <span style={{ ...col, ...lbl }}>
          {isMobile ? <Glyph name="sms" size={16} label="SMS" /> : 'SMS'}
        </span>
        <span style={{ ...col, ...lbl }}>
          {isMobile ? <Glyph name="mail" size={16} label={t('integrations.email')} /> : t('integrations.email')}
        </span>
        {isMobile && <span style={{ width: 16, flex: 'none' }} />}
      </div>
      {ROWS.map((key) => {
        const [subText, alarm] = rowSub(key);
        const on = !isMobile && key === sel.key;
        const err = errors[`sms:${key}`] || errors[`email:${key}`];
        return (
          <div key={key} style={{ borderBottom: `1px solid ${T.border}`, background: on ? `color-mix(in oklab, ${T.accent} 7%, ${T.surface})` : 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', minHeight: 56 }}>
              <button
                type="button"
                onClick={() => pick(key, sel.channel)}
                aria-current={on || undefined}
                style={{
                  flex: 1, minWidth: 0, padding: '11px 0', border: 'none', background: 'transparent', textAlign: 'left',
                  cursor: 'pointer', color: T.text, display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}` }}>{t(`integrations.row.${key}`)}</b>
                  <span style={{ display: 'block', font: `500 12px/1.4 ${T.font}`, color: alarm ? T.dangerFg : T.textDim }}>{subText}</span>
                </span>
              </button>
              <span style={col}>{smsCell(key)}</span>
              <span style={col}>{emailCell(key)}</span>
              {isMobile && (
                <span aria-hidden="true" onClick={() => pick(key, sel.channel)} style={{ width: 16, flex: 'none', color: T.textDim, display: 'flex', cursor: 'pointer' }}>
                  <Glyph name="chevR" size={16} />
                </span>
              )}
            </div>
            {err && (
              <div role="alert" style={{ padding: '0 16px 10px', font: `500 12px/1.45 ${T.font}`, color: T.dangerFg }}>{err}</div>
            )}
          </div>
        );
      })}
      <div style={{ padding: 16, font: `500 12px/1.5 ${T.font}`, color: T.textDim }}>{t('integrations.cancelNote')}</div>
    </List>
  );

  const editor = selRow && (
    <Editor
      showTitle={!isMobile}
      key={`${sel.channel}:${sel.key}`}
      T={T}
      t={t}
      phone={isMobile}
      kind={sel.channel}
      row={selRow}
      name={t(`integrations.row.${sel.key}`)}
      channels={channelsOf(sel.key)}
      onChannel={(c) => setSel((s) => ({ ...s, channel: c }))}
      canWrite={sel.channel === 'sms' ? canSms : canEmail}
      busy={busy === `text:${sel.channel}:${sel.key}`}
      error={errors[`text:${sel.channel}:${sel.key}`]}
      onSave={(patch) => write(`text:${sel.channel}:${sel.key}`, patch)}
    />
  );

  const smsCard = (
    <ChannelCard
      T={T}
      icon="sms"
      title="SMS"
      sub={t('integrations.smsSub')}
      master={(
        <Switch
          T={T}
          on={!!sms.enabled}
          disabled={!canSms || !!busy}
          label="SMS"
          onChange={(on) => (on ? write('sms:master', { enabled: true }) : setConfirmOff(true))}
        />
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <KeyLine T={T} t={t} configured={sms.configured} />
        <Sender
          T={T}
          t={t}
          phone={isMobile}
          value={sms.sender}
          source={sms.senderSource}
          maxLength={11}
          bad={senderRejected}
          canWrite={canSms}
          busy={busy === 'sms:sender'}
          error={errors['sms:sender']}
          onSave={(v) => write('sms:sender', { sender: v })}
        />
      </div>
      <p style={{ margin: 0, font: `500 12px/1.5 ${T.font}`, color: T.textDim }}>
        <Trans t={t} i18nKey="integrations.senderEnvNote" components={{ mono }} />
      </p>
      {errors['sms:master'] && <span role="alert" style={{ font: `500 12px ${T.font}`, color: T.dangerFg }}>{errors['sms:master']}</span>}
      {!sms.configured && (
        <Alert T={T} tone="warn"><Trans t={t} i18nKey="integrations.smsNoKey" components={{ mono }} /></Alert>
      )}
      {sms.configured && !sms.enabled && <Alert T={T} tone="bad">{t('integrations.smsOff')}</Alert>}
      {sms.lastFailure && (
        <Alert T={T} tone="bad" title={t('integrations.lastFailureTitle')}>
          {senderRejected ? (
            // SMS Office's 150 has one meaning, so it is said in words, as the design does.
            <>
              {t('integrations.senderNotApproved', { sender: sms.sender, when: when(sms.lastFailure.at) })}
              {' '}{t('integrations.senderAdvice')}
            </>
          ) : (
            <>
              {[sms.lastFailure.reason, when(sms.lastFailure.at)].filter(Boolean).join(' · ')}
              {sms.lastFailure.errorCode != null && ` · ErrorCode ${sms.lastFailure.errorCode}`}
            </>
          )}
        </Alert>
      )}
    </ChannelCard>
  );

  const emailCard = (
    <ChannelCard
      T={T}
      icon="mail"
      title={t('integrations.email')}
      sub={t('integrations.emailSub')}
      master={(
        <Switch
          T={T}
          on={!!email.enabled}
          disabled={!canEmail || !!busy}
          label={t('integrations.email')}
          onChange={(on) => write('email:master', { email: { enabled: on } })}
        />
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <KeyLine T={T} t={t} configured={email.configured} />
        <Sender
          T={T}
          t={t}
          phone={isMobile}
          value={email.from}
          source={email.fromSource}
          maxLength={200}
          canWrite={canEmail}
          busy={busy === 'email:from'}
          error={errors['email:from']}
          onSave={(v) => write('email:from', { email: { from: v } })}
        />
      </div>
      {errors['email:master'] && <span role="alert" style={{ font: `500 12px ${T.font}`, color: T.dangerFg }}>{errors['email:master']}</span>}
      {!email.configured && (
        <Alert T={T} tone="warn"><Trans t={t} i18nKey="integrations.emailNoKey" components={{ mono }} /></Alert>
      )}
      {email.configured && !email.enabled && <Alert T={T} tone="warn">{t('integrations.emailDisabledWarning')}</Alert>}
      {email.lastFailure && (
        <Alert T={T} tone="bad" title={t('integrations.emailFailureTitle')}>
          {[email.lastFailure.reason, when(email.lastFailure.at)].filter(Boolean).join(' · ')}
          {email.lastFailure.statusCode != null && ` · HTTP ${email.lastFailure.statusCode}`}
        </Alert>
      )}
    </ChannelCard>
  );

  const left = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div style={{
        display: 'grid', gap: 16, alignItems: 'start',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
      }}>
        {smsCard}
        {emailCard}
      </div>
      {!isMobile && editor && (
        <div style={{ padding: 16, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}` }}>
          {editor}
        </div>
      )}
      <p style={{ margin: 0, font: `500 12px/1.5 ${T.font}`, color: T.textDim }}>{t('integrations.keysNote')}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      {(!canSms || !canEmail) && (
        <Alert T={T} tone="bad" style={{ marginBottom: 16 }}>{t('integrations.storeOffline')}</Alert>
      )}

      <div style={{
        display: 'grid', gap: isMobile ? 14 : 20, alignItems: 'start',
        gridTemplateColumns: isDesktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
      }}>
        {left}
        {matrix}
      </div>

      {/* Kept mounted with `open`, so the sheet and the confirmation animate out as well as in. */}
      {isMobile && editor && (
        <Dialog
          T={T}
          phone
          open={sheet}
          title={t('integrations.editorTitle', {
            name: t(`integrations.row.${sel.key}`),
            channel: sel.channel === 'sms' ? 'SMS' : t('integrations.email'),
          })}
          onClose={() => setSheet(false)}
          busy={!!busy}
        >
          {editor}
        </Dialog>
      )}

      <Dialog
        T={T}
        phone={isMobile}
        open={confirmOff}
        title={t('integrations.offTitle')}
        onClose={() => setConfirmOff(false)}
        busy={busy === 'sms:master'}
      >
        <List T={T}>
          <DialogPoint T={T} first icon="lock" tone={T.dangerFg}>{t('integrations.offPointCode')}</DialogPoint>
          <DialogPoint T={T} icon="sms">{t('integrations.offPointOrders')}</DialogPoint>
        </List>
        {errors['sms:master'] && <span role="alert" style={{ font: `500 12px ${T.font}`, color: T.dangerFg }}>{errors['sms:master']}</span>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <KitBtn T={T} disabled={busy === 'sms:master'} onClick={() => setConfirmOff(false)}>{t('ui.cancel')}</KitBtn>
          <KitBtn
            T={T}
            kind="danger"
            disabled={busy === 'sms:master'}
            style={{ flex: isMobile ? '1 1 0' : 'none' }}
            onClick={async () => { if (await write('sms:master', { enabled: false })) setConfirmOff(false); }}
          >
            {busy === 'sms:master' ? t('ui.working') : t('integrations.offConfirm')}
          </KitBtn>
        </div>
      </Dialog>
    </div>
  );
}
