import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { usePhoneVerify } from '../hooks/usePhoneVerify';

// Georgian numbers only for now; the server also accepts a full +<country>
// number typed with its own prefix.
const DIAL = '+995';

// Number → code → confirm, as one card body. Used by the registration gate
// (step 2 of 2) and by the account page to change a number. Nothing is written
// to the account until the code is confirmed — the server keeps the old number
// in force until then — so cancelling at any point changes nothing.
export default function PhoneStep({ initialNumber = '', confirmLabel, onCancel }) {
  const { T } = useGlow();
  const { t } = useTranslation('storefront');
  const {
    sent, devCode, destination, code, setCode, busy, error, errorCode,
    resendIn, request, resend, confirm, reset,
  } = usePhoneVerify();
  const [number, setNumber] = useState(initialNumber);

  // A translated sentence for the server's code; its own English reason when
  // the code is one this screen does not know.
  const message = error
    ? t(`phoneGate.errors.${errorCode || 'generic'}`, { defaultValue: error })
    : '';
  const locked = errorCode === 'CODE_LOCKED';
  const full = number.trim().startsWith('+') ? number.trim() : `${DIAL} ${number.trim()}`;

  const field = {
    height: 52, borderRadius: 14, border: `1.5px solid ${error && !sent ? T.danger : T.border}`,
    background: T.dark ? T.surface2 : '#fff', color: T.text,
    font: `500 15px ${T.font}`, outline: 'none', padding: '0 16px',
  };
  const primary = (off) => ({
    height: 50, borderRadius: 14, border: 'none', width: '100%',
    background: off ? T.surface2 : T.grad, color: off ? T.textMute : '#fff',
    font: `700 14px ${T.font}`, cursor: off ? 'not-allowed' : 'pointer',
    boxShadow: off ? 'none' : `0 10px 28px ${T.accent}55`,
  });
  const link = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    color: T.accentFg || T.accent, font: `600 12.5px ${T.font}`,
  };
  const muted = { font: `500 12.5px ${T.font}`, color: T.textMute, textAlign: 'center' };
  const errorLine = message && (
    <div role="alert" style={{ font: `500 12.5px/1.5 ${T.font}`, color: T.danger }}>{message}</div>
  );

  if (!sent) {
    const off = busy || !number.trim();
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); if (!off) request(full); }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <label htmlFor="phone-step-number" style={{ font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {t('phoneGate.numberLabel')}
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ ...field, width: 88, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>
            {DIAL}
          </span>
          <input
            id="phone-step-number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={t('phoneGate.numberPlaceholder')}
            aria-invalid={!!error}
            style={{ ...field, flex: 1, minWidth: 0 }}
          />
        </div>
        {errorLine}
        {errorCode === 'PHONE_TAKEN' && (
          <div style={{ padding: '12px 14px', borderRadius: 14, background: T.surface2, color: T.textDim, font: `500 12.5px/1.55 ${T.font}` }}>
            {t('phoneGate.takenHelp')}
          </div>
        )}
        <button type="submit" disabled={off} style={primary(off)}>
          {busy ? t('phone.sending') : t('phoneGate.sendCode')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ ...link, alignSelf: 'center' }}>
            {t('phoneGate.cancelChange')}
          </button>
        )}
      </form>
    );
  }

  const off = busy || code.trim().length !== 4;
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (locked) resend(); else if (!off) confirm(); }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {/* Naming the number is the point: it is how someone spots that they
          mistyped it, rather than waiting for a code that reached a
          stranger's phone. */}
      <div style={{ font: `500 13px/1.5 ${T.font}`, color: T.textDim }}>
        {destination ? t('phone.sentHintTo', { destination }) : t('phone.sentHint')}
      </div>
      {devCode && (
        <div style={{ font: `600 12px ${T.mono || T.font}`, color: T.textMute }}>
          {t('phone.devCode', { code: devCode })}
        </div>
      )}
      {!locked && (
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          aria-label={t('phoneGate.codeLabel')}
          aria-invalid={!!error}
          placeholder="····"
          style={{
            height: 64, borderRadius: 16, border: `1.5px solid ${error ? T.danger : T.accent}`,
            background: T.dark ? T.surface2 : '#fff', color: T.text, outline: 'none',
            font: `700 26px ${T.mono || T.font}`, letterSpacing: '0.6em', textAlign: 'center', paddingLeft: '0.6em',
          }}
        />
      )}
      {errorLine}
      {locked ? (
        <button type="submit" disabled={busy || resendIn > 0} style={primary(busy || resendIn > 0)}>
          {resendIn > 0 ? t('phoneGate.resendIn', { seconds: resendIn }) : t('phoneGate.newCode')}
        </button>
      ) : (
        <button type="submit" disabled={off} style={primary(off)}>
          {busy ? t('phone.checking') : (confirmLabel || t('phone.confirm'))}
        </button>
      )}
      {!locked && (
        <div style={muted}>
          {t('phoneGate.noCode')}{' '}
          {resendIn > 0 ? (
            <span style={{ color: T.textDim, fontWeight: 600 }}>{t('phoneGate.resendIn', { seconds: resendIn })}</span>
          ) : (
            <button type="button" onClick={resend} disabled={busy} style={link}>{t('phoneGate.resend')}</button>
          )}
        </div>
      )}
      <div style={muted}>
        {t('phoneGate.wrongNumber')}{' '}
        <button type="button" onClick={reset} style={link}>{t('phoneGate.changeNumber')}</button>
      </div>
    </form>
  );
}
