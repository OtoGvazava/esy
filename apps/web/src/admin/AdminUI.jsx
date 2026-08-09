// Shared pieces for the four /api/admin screens: the load/fail/empty states
// they all need, the money and date formatters, and the suspend dialog (used
// from both the store list and a single store's record, so the "typed reason,
// then confirm" rule exists in exactly one place).
//
// Everything user-facing arrives from the caller's `t()` or is read from the
// 'admin' namespace here — no copy is baked into a JSX literal.
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Btn, Card, Chip, Field, Note } from '../core/primitives';
import { Icons } from '../core/icons';
import { adminApi, handleApiError } from '../utils/api';

// ─── Formatting ─────────────────────────────────────────────────────────────
const localeFor = (lang) => (String(lang || '').toLowerCase().startsWith('ka') ? 'ka-GE' : 'en-GB');

/**
 * Georgian lari. Returns null — never a zero — when the value is missing or
 * unparseable, so a caller renders a dash instead of inventing an amount.
 * BigDecimal reaches us as a JSON number or a string depending on Jackson's
 * configuration; both parse.
 */
export function lari(value, lang) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const num = new Intl.NumberFormat(localeFor(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  // Georgian sets the symbol after the amount, English before it.
  return localeFor(lang) === 'ka-GE' ? `${num} ₾` : `₾${num}`;
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

// ─── Load / fail / empty ────────────────────────────────────────────────────
export function Loading({ T }) {
  const { t } = useTranslation('admin');
  return (
    <div style={{ padding: '48px 8px', textAlign: 'center', color: T.textMute, font: `500 13px ${T.font}` }}>
      {t('ui.loading')}
    </div>
  );
}

/**
 * A failed call. Says what failed and offers a retry — and deliberately renders
 * NO data alongside it, because a half-drawn screen next to an error reads as
 * "these numbers are current" when they are not.
 */
export function Failed({ T, message, onRetry }) {
  const { t } = useTranslation('admin');
  return (
    <Card T={T} pad={20} style={{ borderColor: `${T.danger}55`, background: T.dangerBg }}>
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
        font: `600 10.5px ${T.font}`, color: T.textMute,
        letterSpacing: '0.07em', textTransform: 'uppercase',
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
const MIN_REASON = 8;

/**
 * Suspending pulls a live storefront down, so it is two deliberate acts: type a
 * reason, then confirm it. The reason is not optional and not defaulted — it is
 * written to the store's record and the owner reads it, so a blank or a "test"
 * would be worse than useless.
 *
 * `onSuspended` receives the store object the API returns.
 */
export function SuspendDialog({ T, store, onCancel, onSuspended }) {
  const { t } = useTranslation('admin');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const reasonId = useId();
  const titleId = useId();

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON;

  useEffect(() => {
    if (!confirming) document.getElementById(reasonId)?.focus();
  }, [confirming, reasonId]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !sending) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, sending]);

  const name = store?.displayName || store?.name || store?.subdomain;

  const send = async () => {
    if (sending || tooShort) return;
    setSending(true);
    setError('');
    try {
      const updated = await adminApi.suspendStore(store.subdomain, trimmed);
      onSuspended(updated);
    } catch (e) {
      setError(handleApiError(e, t('suspend.failed')));
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !sending) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(6,6,14,0.55)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <Card
        T={T}
        pad={22}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ width: '100%', maxWidth: 460, boxShadow: T.shadow }}
      >
        <div id={titleId} style={{ font: `700 17px ${T.font}`, letterSpacing: '-0.01em' }}>
          {t('suspend.title', { store: name })}
        </div>
        <div style={{ font: `500 12px ${T.mono}`, color: T.textMute, marginTop: 3 }}>
          {store?.subdomain}
        </div>

        <Note T={T} tone="danger" style={{ margin: '14px 0' }}>{t('suspend.body')}</Note>

        {confirming ? (
          <div style={{
            padding: '12px 14px', borderRadius: 14,
            background: T.surface2, border: `1px solid ${T.border}`,
          }}>
            <div style={{
              font: `600 10.5px ${T.font}`, color: T.textMute,
              letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
              {t('suspend.reasonLabel')}
            </div>
            <div style={{ font: `500 13.5px/1.55 ${T.font}`, color: T.text, marginTop: 6 }}>
              {trimmed}
            </div>
          </div>
        ) : (
          <Field
            T={T}
            id={reasonId}
            tall
            label={t('suspend.reasonLabel')}
            placeholder={t('suspend.reasonPlaceholder')}
            hint={t('suspend.reasonHint')}
            error={touched && tooShort ? t('suspend.reasonTooShort', { n: MIN_REASON }) : undefined}
            value={reason}
            maxLength={240}
            onChange={(e) => { setTouched(true); setReason(e.target.value); }}
          />
        )}

        {confirming && (
          <div style={{ font: `600 13px/1.55 ${T.font}`, color: T.text, marginTop: 14 }}>
            {t('suspend.confirmPrompt', { store: name })}
          </div>
        )}

        {error && (
          <div style={{ font: `500 12.5px/1.5 ${T.font}`, color: T.dangerFg, marginTop: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Btn
            T={T}
            kind="ghost"
            size="sm"
            disabled={sending}
            onClick={() => (confirming ? setConfirming(false) : onCancel())}
          >
            {confirming ? t('suspend.back') : t('ui.cancel')}
          </Btn>
          {confirming ? (
            <Btn T={T} kind="danger" size="sm" disabled={sending} onClick={send}>
              {sending ? t('ui.working') : t('suspend.confirm')}
              {!sending && <Icons.shield size={13} />}
            </Btn>
          ) : (
            <Btn
              T={T}
              kind="danger"
              size="sm"
              disabled={tooShort}
              onClick={() => { setTouched(true); if (!tooShort) setConfirming(true); }}
            >
              {t('suspend.review')}
            </Btn>
          )}
        </div>
      </Card>
    </div>
  );
}
