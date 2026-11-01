import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usePhoneVerify } from '../hooks/usePhoneVerify';
import { G, Otp } from './shop/kit';

// Georgian numbers only for now; the server also accepts a full +<country>
// number typed with its own prefix.
const DIAL = '+995';

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// The registration gate's second step (the design's B3–B5): the number, then
// the code, with the three ways it goes wrong — a wrong code (and how many
// tries are left), a number already on another account, and too many wrong
// codes. Nothing is written to the account until the code is confirmed — the
// server keeps the old number in force until then — so leaving at any point
// changes nothing.
//
// `progress(withPrev)` draws the step bar above the title (the gate's own),
// with "‹ previous step" on the number step; `existing` is the older account
// that has its profile and is asked for a number for the first time.
export default function PhoneStep({ progress, existing = false, name = '' }) {
  const { t } = useTranslation('storefront');
  const { logout, signInWithGoogle } = useAuth();
  const {
    sent, devCode, destination, code, setCode, busy, error, errorCode, attemptsLeft,
    resendIn, request, resend, confirm, reset,
  } = usePhoneVerify();
  const [number, setNumber] = useState('');
  // A wrong code is typed again from the first box, which takes the focus (B5).
  const otpRef = useRef(null);
  useEffect(() => {
    if (errorCode === 'CODE_WRONG') otpRef.current?.focus({ preventScroll: true });
  }, [errorCode, attemptsLeft]);

  const full =number.trim().startsWith('+') ? number.trim() : `${DIAL} ${number.trim()}`;
  const message = error ? t(`phoneGate.errors.${errorCode || 'generic'}`, { defaultValue: error }) : '';
  const taken = errorCode === 'PHONE_TAKEN';
  const locked = sent && errorCode === 'CODE_LOCKED';
  const num = <b className="num" style={{ color: 'var(--k-fg)', whiteSpace: 'nowrap' }} />;
  const head = (title, sub) => (
    <div className="stk" style={{ gap: 6 }}>
      <h1 id="gate-title" className="h1">{title}</h1>
      {sub && <p className="dim">{sub}</p>}
    </div>
  );

  // ── the number (B3), and the number someone else already has (B5 taken) ──
  if (!sent || taken) {
    const off = busy || !number.trim();
    const otherAccount = () => { logout(); signInWithGoogle(); };
    return (
      <form
        className="stk"
        style={{ gap: 18 }}
        noValidate
        onSubmit={(e) => { e.preventDefault(); if (!off) request(full); }}
      >
        {progress && progress(true)}
        {taken
          ? head(t('phoneGate.title'), t('phoneGate.takenSub'))
          : existing
            ? head(t('phoneGate.existingTitle', { name }), t('phoneGate.existingSubtitle'))
            : head(t('phoneGate.title'), t('phoneGate.subtitle'))}
        <label className="fld">
          {t('phoneGate.numberLabel')}
          <span className={`ingrp${error ? ' err' : ''}`}>
            <span style={{ padding: '0 4px 0 15px', color: 'var(--k-fg)', fontWeight: 600 }}>{DIAL}</span>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={t('phoneGate.numberPlaceholder')}
              aria-invalid={!!error || undefined}
              style={{ paddingLeft: 8 }}
              autoFocus
            />
          </span>
        </label>
        {taken ? (
          <div className="alert bad" role="alert">
            <G name="warn" />
            <span className="grow sm">{t('phoneGate.taken')}</span>
          </div>
        ) : (
          <>
            {message && <p className="errt" role="alert">{message}</p>}
            <div className="alert"><G name="info" /><span className="sm">{t('phoneGate.oneNumber')}</span></div>
          </>
        )}
        <button type="submit" className="btn btn-p btn-lg btn-b" disabled={off} aria-disabled={off || undefined} style={{ marginTop: taken ? 0 : 6 }}>
          {busy ? t('phoneGate.sending') : t('phoneGate.sendCode')}
        </button>
        {taken && (
          <button type="button" className="btn btn-g btn-b" onClick={otherAccount}>
            <span><Trans t={t} i18nKey="phoneGate.otherGoogle" components={{ nc: <span className="nc" /> }} /></span>
          </button>
        )}
      </form>
    );
  }

  // ── too many wrong codes (B5 locked) ──
  if (locked) {
    const m = Math.floor(resendIn / 60);
    const time = m > 0 ? t('phoneGate.minSec', { m, s: resendIn % 60 }) : t('phoneGate.sec', { s: resendIn });
    return (
      <div className="stk" style={{ gap: 20 }}>
        {progress && progress(false)}
        {head(t('phoneGate.lockedTitle'), t('phoneGate.lockedBody'))}
        {resendIn > 0 && (
          <div className="alert warn" role="status">
            <G name="clock" />
            <span className="sm"><Trans t={t} i18nKey="phoneGate.lockedWait" values={{ time }} components={{ num: <b className="num" style={{ whiteSpace: 'nowrap' }} /> }} /></span>
          </div>
        )}
        <button type="button" className="btn btn-p btn-lg btn-b" disabled={busy || resendIn > 0} aria-disabled={busy || resendIn > 0 || undefined} onClick={resend}>
          {busy ? t('phoneGate.sending') : t('phoneGate.newCode')}
        </button>
        <button type="button" className="link sm" style={{ alignSelf: 'center' }} onClick={reset}>{t('phoneGate.changeNumber')}</button>
      </div>
    );
  }

  // ── the code (B4), and a wrong one (B5 wrong) ──
  const wrong = errorCode === 'CODE_WRONG';
  const off = busy || code.length !== 4;
  return (
    <form
      className="stk"
      style={{ gap: 20 }}
      noValidate
      onSubmit={(e) => { e.preventDefault(); if (!off) confirm(); }}
    >
      {progress && progress(false)}
      {head(t('phoneGate.codeTitle'), destination
        ? <Trans t={t} i18nKey="phoneGate.codeSent" values={{ destination }} components={{ num }} />
        : t('phoneGate.codeSentPlain'))}
      {devCode && <p className="xs dim mono" style={{ textAlign: 'center' }}>{t('phone.devCode', { code: devCode })}</p>}
      <Otp value={code} onChange={setCode} label={t('phoneGate.codeLabel')} invalid={wrong} autoFocus inputRef={otpRef} />
      {wrong && (
        <p className="errt" role="alert" style={{ textAlign: 'center' }}>
          {attemptsLeft != null ? t('phoneGate.wrong', { count: attemptsLeft }) : message}
        </p>
      )}
      {error && !wrong && <p className="errt" role="alert" style={{ textAlign: 'center' }}>{message}</p>}
      <div className="rowb sm">
        {resendIn > 0 ? (
          <span className="dim"><Trans t={t} i18nKey="phoneGate.resendIn" values={{ time: mmss(resendIn) }} components={{ num }} /></span>
        ) : (
          <button type="button" className="link" onClick={resend} disabled={busy}>{t('phoneGate.resend')}</button>
        )}
        <button type="button" className="link" onClick={reset}>{t('phoneGate.changeNumber')}</button>
      </div>
      <button type="submit" className="btn btn-p btn-lg btn-b" disabled={off} aria-disabled={off || undefined} style={{ marginTop: wrong ? 0 : 4 }}>
        {busy ? t('phoneGate.checking') : t('phoneGate.confirm')}
      </button>
      {!error && <p className="hint" style={{ textAlign: 'center' }}>{t('phoneGate.codeHint')}</p>}
    </form>
  );
}
