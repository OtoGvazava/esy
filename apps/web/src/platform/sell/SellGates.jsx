// The gates before quick setup: sign in with Google (the design's O2), the
// profile every esy account needs (name, surname, date of birth — the
// storefront's registration gate asks the same), and the seller's phone check
// with an SMS code (O2b). Each is shown only to an account that has not passed
// it yet, so someone who already shops on esy goes straight to naming the
// store. The server enforces the phone itself (PhoneRequiredFilter): an
// account without a verified number cannot create a store.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { usePhoneVerify } from '../../hooks/usePhoneVerify';
import DateOfBirthPicker from '../../components/DateOfBirthPicker';
import LookThumb from '../../components/design/LookThumb';
import { lookById } from '../../core/design/looks';
import { Btn, GoogleG, Ic, Logo, SellScreen, Wrap, maskedNumber } from './kit';

// The server keeps a code for ten minutes (PhoneVerificationService.TTL_SECONDS).
const CODE_MINUTES = 10;

/** "What happens next" on the sign-in screen: the phone, the setup steps, the review. */
function AheadCard({ t, setup }) {
  return (
    <div className="sl-card sl-pad sl-stk" style={{ gap: 10 }}>
      <span className="sl-lbl">{t('open.signin.ahead')}</span>
      <div className="sl-row sl-sm" style={{ gap: 10 }}>
        <span className="sl-chip proc sl-n" aria-hidden="true"><Ic name="phone" /></span>
        <span className="sl-grow">{t('open.steps.phone')}</span>
        <span className="sl-xs sl-dim">{t('open.signin.bySms')}</span>
      </div>
      {setup.map((key, i) => (
        <div key={key} className="sl-row sl-sm" style={{ gap: 10 }}>
          <span className="sl-chip proc sl-n" aria-hidden="true">{i + 1}</span>
          <span>{t(`open.steps.${key}`)}</span>
        </div>
      ))}
      <div className="sl-row sl-sm" style={{ gap: 10 }}>
        <span className="sl-chip proc sl-n" aria-hidden="true"><Ic name="eye" /></span>
        <span>{t('open.steps.check')}</span>
      </div>
    </div>
  );
}

/** O2 — open a store starts with Google. */
export function SellSignIn({ dev, setup, onGoogle, onHome }) {
  const { t } = useTranslation('platform');
  return (
    <div className="sl" style={{ flexDirection: 'row' }}>
      {dev === 'desk' && (
        <div className="sl-panel" style={{ minHeight: 760 }}>
          <Logo onBrand />
          <div aria-hidden="true" style={{ position: 'absolute', left: 56, right: 56, top: 156, display: 'flex', gap: 36, justifyContent: 'center', transform: 'rotate(-6deg)' }}>
            {/* A clothes shop and a food shop, as the board draws them. */}
            <LookThumb design={lookById('social').design} brand="#db2777" group="fashion" />
            <LookThumb design={lookById('studio').design} brand="#16a34a" group="food" />
          </div>
          <div className="sl-stk" style={{ gap: 10, maxWidth: 360, position: 'relative' }}>
            <h2 className="sl-h1" style={{ color: '#fff' }}>{t('open.signin.panelTitle')}</h2>
            <p style={{ margin: 0 }}>{t('open.signin.panelBody')}</p>
          </div>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: dev === 'ph' ? '64px 16px 24px' : dev === 'tab' ? '72px 28px 40px' : '40px' }}>
        <button
          type="button" className="sl-ibtn" aria-label={t('open.backHome')} onClick={onHome}
          style={{ position: 'absolute', left: 'var(--sl-gut)', top: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}
        ><Ic name="back" /></button>
        <div className="sl-stk" style={{ gap: 20, width: '100%', maxWidth: 420 }}>
          {dev !== 'desk' && <Logo />}
          <div className="sl-stk" style={{ gap: 8 }}>
            <h1 className="sl-h1">{t('open.signin.title')}</h1>
            <p className="sl-p">{t('open.signin.body')}</p>
          </div>
          <button
            type="button" className="sl-btn lg b" onClick={onGoogle}
            style={{ background: '#fff', color: '#1f1f1f', boxShadow: 'inset 0 0 0 1.5px #dadce0' }}
          ><GoogleG />{t('open.signin.google')}</button>
          <AheadCard t={t} setup={setup} />
          <p className="sl-xs sl-dim" style={{ margin: 0 }}>
            {t('open.signin.termsPre')}<Link to="/terms" className="sl-link">{t('open.signin.termsLink')}</Link>{t('open.signin.termsPost')}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Where the seller stands: Google done, then (when this account needs it)
 * the profile, the phone, and the setup still ahead. A phone shows the
 * steps ahead as one line.
 */
function ProgressCard({ t, dev, setup, at, needsProfile }) {
  const row = (state, icon, label, key) => (
    <div key={key} className={`sl-row sl-sm ${state === 'todo' ? 'sl-dim' : ''}`} style={{ gap: 12 }}>
      {state === 'done' && <span className="sl-chip done sl-n" role="img" aria-label={t('open.progress.done')}><Ic name="check" style={{ strokeWidth: 3 }} /></span>}
      {state === 'now' && <span className="sl-chip conf sl-n sl-now" aria-hidden="true">{icon}</span>}
      {state === 'todo' && <span className="sl-chip proc sl-n" aria-hidden="true">{icon}</span>}
      {state === 'now' ? <b className="sl-grow">{label}</b> : <span className="sl-grow">{label}</span>}
      {state === 'now' && <span className="sl-chip conf" style={{ height: 22 }}>{t('open.progress.now')}</span>}
    </div>
  );
  const gates = [
    row('done', null, t('open.progress.google'), 'google'),
    needsProfile && row(at === 'profile' ? 'now' : 'done', <Ic name="user" />, t('open.steps.profile'), 'profile'),
    row(at === 'phone' ? 'now' : 'todo', <Ic name="phone" />, t('open.steps.phone'), 'phone'),
  ];
  if (dev === 'ph') {
    // Run into one sentence, so lower case (Georgian has no case to change).
    const ahead = [...setup.map((k) => t(`open.steps.${k}`)), t('open.steps.check')].map((s) => s.toLowerCase()).join(', ');
    return (
      <div className="sl-card sl-pad sl-stk" style={{ gap: 10 }}>
        {gates}
        <div className="sl-row sl-xs sl-dim" style={{ gap: 12, alignItems: 'flex-start' }}>
          <span className="sl-chip proc sl-n" aria-hidden="true"><Ic name="dots" /></span>
          <span className="sl-grow" style={{ paddingTop: 4 }}>{t('open.progress.ahead', { steps: ahead })}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="sl-card sl-padl sl-stk" style={{ gap: 14 }}>
      {gates}
      {setup.map((k, i) => row('todo', i + 1, t(`open.steps.${k}`), k))}
      {row('todo', <Ic name="eye" />, t('open.steps.check'), 'check')}
    </div>
  );
}

function GateAside({ t, dev, setup, at, needsProfile }) {
  return (
    <>
      <span className="sl-lbl">{t('open.progress.title')}</span>
      <ProgressCard t={t} dev={dev} setup={setup} at={at} needsProfile={needsProfile} />
      <p className="sl-xs sl-dim" style={{ margin: 0 }}>{t('open.progress.once')}</p>
    </>
  );
}

/** The profile every esy account carries, asked here when the account has none yet. */
export function SellProfile({ dev, setup, onHome }) {
  const { t } = useTranslation('platform');
  const { user, saveProfile, logout } = useAuth();
  const [first, setFirst] = useState(user?.firstName || '');
  const [last, setLast] = useState(user?.lastName || '');
  const [dob, setDob] = useState(user?.dateOfBirth || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ready = first.trim() && last.trim() && dob;

  const submit = async () => {
    if (!ready) { setErr(t('open.profile.required')); return; }
    setBusy(true);
    setErr('');
    try {
      await saveProfile({ firstName: first.trim(), lastName: last.trim(), dateOfBirth: dob });
      // profileComplete flips and the phone check takes the screen
    } catch {
      setErr(t('open.profile.failed'));
    } finally {
      setBusy(false);
    }
  };

  const cta = <Btn off={busy} onClick={submit}>{busy ? t('open.profile.saving') : t('open.next')}</Btn>;
  return (
    <SellScreen label={t('open.profile.label')} onBack={onHome} backLabel={t('open.backHome')} onCancel={onHome} bar={dev === 'ph' ? cta : null}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Wrap dev={dev} side aside={<GateAside t={t} dev={dev} setup={setup} at="profile" needsProfile />} gap={{ ph: 22, tab: 32 }}>
          <div className="sl-stk" style={{ gap: dev === 'ph' ? 16 : 18 }}>
            <div className="sl-stk" style={{ gap: 8 }}>
              <h1 className="sl-h1">{t('open.profile.title')}</h1>
              <p className="sl-p">{t('open.profile.body')}</p>
            </div>
            <label className="sl-fld">{t('open.profile.first')}
              <input className="sl-in" value={first} onChange={(e) => { setFirst(e.target.value); setErr(''); }} autoComplete="given-name" />
            </label>
            <label className="sl-fld">{t('open.profile.last')}
              <input className="sl-in" value={last} onChange={(e) => { setLast(e.target.value); setErr(''); }} autoComplete="family-name" />
            </label>
            <div className="sl-fld">{t('open.profile.dob')}
              <DateOfBirthPicker value={dob} onChange={(v) => { setDob(v); setErr(''); }} />
            </div>
            <p className="sl-hint">{t('open.profile.dobWhy')}</p>
            {err && <p className="sl-err" role="alert">{err}</p>}
            {dev !== 'ph' && <div style={{ marginTop: 8 }}>{cta}</div>}
            <button type="button" className="sl-link sl-sm" onClick={logout} style={{ alignSelf: 'flex-start', color: 'var(--k-dim)' }}>{t('open.signOut')}</button>
          </div>
        </Wrap>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </SellScreen>
  );
}

// 5XX XX XX XX, as the number is typed.
const formatLocal = (digits) => [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean).join(' ');
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** O2b — the seller's number, then the four-digit code sent to it. */
export function SellPhone({ dev, setup, needsProfile, onHome }) {
  const { t } = useTranslation('platform');
  const { t: ts } = useTranslation('storefront');
  const { user, logout } = useAuth();
  const {
    sent, devCode, destination, code, setCode, busy, error, errorCode,
    resendIn, request, resend, confirm, reset,
  } = usePhoneVerify();
  // An older account may already carry a Georgian number it never confirmed: start from it.
  const [number, setNumber] = useState(() => {
    const d = String(user?.phoneNumber || '').replace(/\D/g, '');
    return d.length === 12 && d.startsWith('995') ? d.slice(3) : '';
  });
  const [focus, setFocus] = useState(false);
  const digits = number.replace(/\D/g, '');
  const full = `+995${digits}`;
  const message = error ? ts(`phoneGate.errors.${errorCode || 'generic'}`, { defaultValue: error }) : '';
  const locked = errorCode === 'CODE_LOCKED';

  const sendOff = busy || digits.length !== 9;
  const confirmOff = busy || code.length !== 4;
  const onSend = () => { if (!sendOff) request(full); };
  const onConfirm = () => {
    if (locked) { if (!busy && resendIn <= 0) resend(); return; }
    if (!confirmOff) confirm();
  };

  const cta = !sent
    ? <Btn off={sendOff} onClick={onSend}>{busy ? ts('phone.sending') : t('open.phone.send')}</Btn>
    : locked
      ? <Btn off={busy || resendIn > 0} onClick={onConfirm}>{resendIn > 0 ? t('open.phone.resendIn', { time: clock(resendIn) }) : t('open.phone.newCode')}</Btn>
      : <Btn off={confirmOff} onClick={onConfirm}>{busy ? ts('phone.checking') : t('open.phone.confirm')}</Btn>;

  const back = sent ? reset : onHome;
  const taken = errorCode === 'PHONE_TAKEN';

  return (
    <SellScreen
      label={t('open.phone.label')} onBack={back} backLabel={sent ? t('open.phone.changeNumber') : t('open.backHome')}
      onCancel={onHome} bar={dev === 'ph' ? cta : null}
    >
      <form onSubmit={(e) => { e.preventDefault(); if (sent) onConfirm(); else onSend(); }}>
        <Wrap dev={dev} side aside={<GateAside t={t} dev={dev} setup={setup} at="phone" needsProfile={needsProfile} />} gap={{ ph: 22, tab: 32 }}>
          {!sent ? (
            <div className="sl-stk" style={{ gap: dev === 'ph' ? 16 : 18 }}>
              <div className="sl-stk" style={{ gap: 8 }}>
                <h1 className="sl-h1">{t('open.phone.title')}</h1>
                <p className="sl-p">{t('open.phone.body')}</p>
              </div>
              <label className="sl-fld">{t('open.phone.field')}
                <span className={`sl-ingrp ${message ? 'err' : ''}`}>
                  <span style={{ padding: '0 4px 0 15px', color: 'var(--k-fg)', fontWeight: 600 }}>{'+995'}</span>
                  <input
                    value={formatLocal(digits)}
                    onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    inputMode="numeric" autoComplete="tel-national" placeholder={t('open.phone.placeholder')}
                    aria-invalid={!!message} style={{ paddingLeft: 8 }} autoFocus
                  />
                </span>
              </label>
              {message ? <p className="sl-err" role="alert">{message}</p> : <p className="sl-hint">{t('open.phone.hint')}</p>}
              {taken && (
                <div className="sl-alert">
                  <Ic name="info" />
                  <div className="sl-stk sl-sm" style={{ gap: 8 }}>
                    <span>{ts('phoneGate.takenHelp')}</span>
                    <button type="button" className="sl-link" onClick={logout} style={{ alignSelf: 'flex-start' }}>{t('open.signOut')}</button>
                  </div>
                </div>
              )}
              {dev !== 'ph' && <div style={{ marginTop: 8 }}>{cta}</div>}
            </div>
          ) : (
            <div className="sl-stk" style={{ gap: dev === 'ph' ? 16 : 18 }}>
              <div className="sl-stk" style={{ gap: 8 }}>
                <h1 className="sl-h1">{t('open.phone.codeTitle')}</h1>
                <p className="sl-p">{t('open.phone.codeSent')} <b className="sl-num" style={{ color: 'var(--k-fg)' }}>{maskedNumber(full, destination)}</b></p>
              </div>
              {!locked && (
                <div className={`sl-otp ${message ? 'err' : ''}`} role="group" aria-label={t('open.phone.codeLabel')}>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={focus && i === Math.min(code.length, 3) ? 'on' : ''} aria-hidden="true">{code[i] || ''}</span>
                  ))}
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
                    inputMode="numeric" autoComplete="one-time-code" maxLength={4} autoFocus
                    aria-label={t('open.phone.codeLabel')} aria-invalid={!!message}
                  />
                </div>
              )}
              <div className="sl-rowb sl-sm">
                {resendIn > 0
                  ? <span className="sl-dim">{t('open.phone.resendInPre')}<b className="sl-num" style={{ color: 'var(--k-fg)' }}>{clock(resendIn)}</b>{t('open.phone.resendInPost')}</span>
                  : <button type="button" className="sl-link" onClick={resend} disabled={busy}>{t('open.phone.resend')}</button>}
                <button type="button" className="sl-link" onClick={reset}>{t('open.phone.changeNumber')}</button>
              </div>
              {message && <p className="sl-err" role="alert">{message}</p>}
              {devCode && <p className="sl-hint">{ts('phone.devCode', { code: devCode })}</p>}
              {dev !== 'ph' && <div style={{ marginTop: 8 }}>{cta}</div>}
              <p className="sl-hint">{t('open.phone.codeHint', { minutes: CODE_MINUTES })}</p>
            </div>
          )}
        </Wrap>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </SellScreen>
  );
}
