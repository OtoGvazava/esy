// Shared pieces for the four /api/admin screens: the fail and empty states
// they all need (a screen still loading draws its skeleton, AdminSkeletons),
// the money and date formatters, and the suspend dialog (used from both the
// store list and a single store's record, so the "typed reason, then confirm"
// rule exists in exactly one place).
//
// Everything user-facing arrives from the caller's `t()` or is read from the
// 'admin' namespace here — no copy is baked into a JSX literal.
/* eslint-disable react-refresh/only-export-components */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Btn, Card, Chip } from '../core/primitives';
import { adminApi, handleApiError } from '../utils/api';
import { alpha } from '../core/tokens';
import { money } from '../core/money';
import { useDevice } from '../contexts/DeviceContext';
import { Dialog, DialogPoint, Glyph, KitBtn, List } from './AdminKit';

// ─── Formatting ─────────────────────────────────────────────────────────────
const localeFor = (lang) => (String(lang || '').toLowerCase().startsWith('ka') ? 'ka-GE' : 'en-GB');

/**
 * Georgian lari. Returns null — never a zero — when the value is missing or
 * unparseable, so a caller renders a dash instead of inventing an amount.
 * BigDecimal reaches us as a JSON number or a string depending on Jackson's
 * configuration; both parse.
 */
export function lari(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  // The platform's one format (core/money): "184 200 ₾", "97,20 ₾" in either
  // language. The admin used to keep a ledger-style ",00" on every figure; the
  // design review settled on one format for every surface, so an amount reads
  // the same here as in the store's own back office.
  return money(n);
}

/** A whole number (counts). Null for anything unparseable. */
export function count(value, lang) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat(localeFor(lang)).format(n);
}

/** Timestamp with the time of day — admin records are read for their sequence. */
export function dateTime(value, lang) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(localeFor(lang), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

// ─── Fail / empty ───────────────────────────────────────────────────────────
/**
 * A failed call. Says what failed and offers a retry — and deliberately renders
 * NO data alongside it, because a half-drawn screen next to an error reads as
 * "these numbers are current" when they are not.
 */
export function Failed({ T, message, onRetry }) {
  const { t } = useTranslation('admin');
  return (
    <Card T={T} pad={20} style={{ borderColor: `${alpha(T.danger, 0.33)}`, background: T.dangerBg }}>
      <div style={{ font: `700 14px ${T.font}`, color: T.dangerFg, marginBottom: 6 }}>
        {t('ui.failedTitle')}
      </div>
      <div style={{ font: `500 13px/1.55 ${T.font}`, color: T.textDim, marginBottom: onRetry ? 14 : 0 }}>
        {message || t('ui.failedBody')}
      </div>
      {onRetry && (
        <Btn T={T} kind="ghost" size="sm" onClick={onRetry}>{t('ui.retry')}</Btn>
      )}
    </Card>
  );
}

export function Empty({ T, title, body }) {
  return (
    <Card T={T} pad={28} style={{ textAlign: 'center' }}>
      <div style={{ font: `700 14px ${T.font}`, color: T.text }}>{title}</div>
      {body && (
        <div style={{ font: `500 13px/1.55 ${T.font}`, color: T.textMute, marginTop: 6 }}>{body}</div>
      )}
    </Card>
  );
}

// ─── Store status ───────────────────────────────────────────────────────────
/** A store is suspended when it carries a suspension, or the API says inactive. */
export const isSuspended = (store) => !!store?.suspendedAt || store?.active === false;

export function StoreStatus({ T, store }) {
  const { t } = useTranslation('admin');
  const off = isSuspended(store);
  return (
    <Chip T={T} tone={off ? 'danger' : 'success'}>
      {off ? t('stores.suspended') : t('stores.active')}
    </Chip>
  );
}

/** One labelled figure. `value` already formatted; null renders as a dash. */
export function Stat({ T, label, value, tone }) {
  return (
    <div style={{ minWidth: 96 }}>
      <div style={{
        font: `600 11px ${T.font}`, color: T.textMute,
        letterSpacing: '0.07em',
      }}>
        {label}
      </div>
      <div style={{
        font: `700 16px ${T.mono}`, marginTop: 3,
        color: value == null ? T.textMute : (tone || T.text),
      }}>
        {value == null ? '—' : value}
      </div>
    </div>
  );
}

// ─── Suspend ────────────────────────────────────────────────────────────────
/** Why a store is suspended — the reason's first words on the record. */
export const SUSPEND_REASONS = ['counterfeit', 'prohibited', 'fraud', 'ownerRequest', 'other'];
const MIN_NOTE = 8;

/**
 * The design's AD3. Suspending pulls a live storefront down, so the dialog
 * says first what happens — to shoppers, to the orders already placed, and
 * what the owner is (not) told — then asks why, and takes effect only once the
 * admin has ticked that they know it is immediate.
 *
 * The reason is a choice from a short list plus an optional note ("other"
 * needs the note): both are written, as one line, to the store's record and
 * the audit log. Nothing is sent to the owner — the platform has no such
 * message — and the dialog says so rather than promise an email.
 *
 * `onSuspended` receives the store object the API returns.
 */
export function SuspendDialog({ T, store, onCancel, onSuspended }) {
  const { t } = useTranslation('admin');
  const { isMobile } = useDevice();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [sure, setSure] = useState(false);
  const [focus, setFocus] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const reasonId = useId();
  const noteId = useId();
  const sureId = useId();

  const name = store?.displayName || store?.name || store?.subdomain;
  const trimmed = note.trim();
  const noteMissing = reason === 'other' && trimmed.length < MIN_NOTE;
  const ready = !!reason && !noteMissing && sure && !sending;

  const send = async () => {
    if (!ready) return;
    setSending(true);
    setError('');
    const why = [t(`suspend.reason.${reason}`), trimmed].filter(Boolean).join(': ');
    try {
      const updated = await adminApi.suspendStore(store.subdomain, why);
      onSuspended(updated);
    } catch (e) {
      setError(handleApiError(e, t('suspend.failed')));
    } finally {
      setSending(false);
    }
  };

  const field = (on) => ({
    width: '100%', boxSizing: 'border-box', borderRadius: 12, background: 'var(--k-in-bg)', color: T.text,
    border: `1.5px solid ${on ? T.accent : 'var(--k-in-bd)'}`, outline: 'none', font: `15px ${T.font}`,
    boxShadow: on ? `0 0 0 4px color-mix(in oklab, ${T.accent} 18%, transparent)` : 'none',
  });
  const label = { display: 'flex', flexDirection: 'column', gap: 7, font: `400 12.5px ${T.font}`, color: T.textDim };

  return (
    <Dialog T={T} phone={isMobile} title={t('suspend.title', { store: name })} onClose={onCancel} busy={sending}>
      <List T={T}>
        <DialogPoint T={T} first icon="ban" tone="var(--k-bad)">{t('suspend.pointShoppers')}</DialogPoint>
        <DialogPoint T={T} icon="receipt">{t('suspend.pointOrders')}</DialogPoint>
        <DialogPoint T={T} icon="mail">{t('suspend.pointOwner')}</DialogPoint>
      </List>

      <label htmlFor={reasonId} style={label}>
        {t('suspend.reasonLabel')}
        <span style={{ position: 'relative', display: 'block' }}>
          <select
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onFocus={() => setFocus('reason')}
            onBlur={() => setFocus('')}
            style={{ ...field(focus === 'reason'), height: 50, padding: '0 44px 0 15px', appearance: 'none', cursor: 'pointer', color: reason ? T.text : T.textDim }}
          >
            <option value="" disabled>{t('suspend.reasonPick')}</option>
            {SUSPEND_REASONS.map((r) => <option key={r} value={r}>{t(`suspend.reason.${r}`)}</option>)}
          </select>
          <span aria-hidden="true" style={{ position: 'absolute', right: 14, top: 15, color: T.textDim, pointerEvents: 'none', display: 'flex' }}>
            <Glyph name="chevD" />
          </span>
        </span>
      </label>

      <label htmlFor={noteId} style={label}>
        {t('suspend.noteLabel')}
        <textarea
          id={noteId}
          value={note}
          maxLength={240}
          placeholder={t('suspend.notePlaceholder')}
          onChange={(e) => setNote(e.target.value)}
          onFocus={() => setFocus('note')}
          onBlur={() => setFocus('')}
          style={{ ...field(focus === 'note'), minHeight: 110, padding: '13px 15px', lineHeight: 1.5, resize: 'none' }}
        />
        {noteMissing && trimmed.length > 0 && (
          <span style={{ font: `400 12.5px ${T.font}`, color: 'var(--k-bad)' }}>{t('suspend.noteTooShort', { n: MIN_NOTE })}</span>
        )}
      </label>

      <label htmlFor={sureId} style={{ display: 'flex', alignItems: 'center', gap: 10, font: `400 12.5px/1.45 ${T.font}`, color: T.text, cursor: 'pointer' }}>
        <input
          id={sureId}
          type="checkbox"
          checked={sure}
          onChange={(e) => setSure(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1, margin: 0 }}
          onFocus={() => setFocus('sure')}
          onBlur={() => setFocus('')}
        />
        <span aria-hidden="true" style={{
          width: 22, height: 22, borderRadius: 6, flex: 'none', display: 'grid', placeItems: 'center', boxSizing: 'border-box',
          border: `2px solid ${sure ? T.accent : T.border}`, background: sure ? T.accent : 'transparent', color: T.onAccent,
          boxShadow: focus === 'sure' ? `0 0 0 3px color-mix(in oklab, ${T.accent} 30%, transparent)` : 'none',
        }}>
          {sure && <Glyph name="check" size={14} style={{ strokeWidth: 3 }} />}
        </span>
        {t('suspend.sure')}
      </label>

      {error && <span role="alert" style={{ font: `500 12.5px/1.5 ${T.font}`, color: T.dangerFg }}>{error}</span>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <KitBtn T={T} disabled={sending} onClick={onCancel}>{t('ui.cancel')}</KitBtn>
        <KitBtn
          T={T}
          kind="danger"
          aria-disabled={!ready}
          onClick={send}
          style={{
            flex: '1 1 0',
            // Not ready reads as quiet, not broken: the label stays legible (the kit's aria-disabled).
            ...(ready ? null : {
              background: `color-mix(in srgb, ${T.text} 9%, ${T.surface})`,
              color: `color-mix(in srgb, ${T.text} 56%, ${T.surface})`, cursor: 'default',
            }),
          }}
        >
          {sending ? t('ui.working') : t('suspend.confirm')}
        </KitBtn>
      </div>
    </Dialog>
  );
}
