import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usePhoneVerify } from '../hooks/usePhoneVerify';
import DateOfBirthPicker from './DateOfBirthPicker';
import { G, GoogleMark, Otp, phoneText, useDev } from './shop/kit';

const DIAL = '+995';
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// The two cards of personal details (the design's D2), side by side on a
// desktop. The profile — name, surname, date of birth — is edited in place;
// the email comes from Google and is only shown. The phone is its own card,
// because a new number needs its own code: the current one stays active, and
// keeps receiving order notices and codes, until the new one is confirmed.
//
// Drawn inside a .sk root (account/AccountPersonal).
export default function PersonalInfo() {
  const dev = useDev();
  const { t } = useTranslation('storefront');
  const { user, saveProfile } = useAuth();

  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  // The picker keeps its own partial picks, so Cancel remounts it.
  const [pickerKey, setPickerKey] = useState(0);

  // phone — the number on the account when the change began, so a confirmed
  // change (the number moves) closes the change by itself
  const [changing, setChanging] = useState(false);
  const [phoneAtStart, setPhoneAtStart] = useState(null);
  const [number, setNumber] = useState('');
  const verify = usePhoneVerify();

  useEffect(() => {
    if (changing && user?.phoneVerified && user.phoneNumber !== phoneAtStart) {
      setChanging(false);
      verify.reset();
    }
    // verify.reset is a new function every render; only the account matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changing, phoneAtStart, user?.phoneNumber, user?.phoneVerified]);

  if (!user) return null;

  const base = { firstName: user.firstName || '', lastName: user.lastName || '', dateOfBirth: user.dateOfBirth || '' };
  const f = form || base;
  const dirty = !!form && (f.firstName !== base.firstName || f.lastName !== base.lastName || f.dateOfBirth !== base.dateOfBirth);
  const edit = (k, v) => { setForm({ ...f, [k]: v }); setErr(''); setSaved(false); };

  const cancel = () => { setForm(null); setErr(''); setPickerKey((k) => k + 1); };
  const save = async (e) => {
    e.preventDefault();
    if (!dirty || busy) return;
    if (!f.firstName.trim() || !f.lastName.trim() || !f.dateOfBirth) {
      setErr(t('account.personal.required'));
      return;
    }
    setBusy(true);
    try {
      await saveProfile({ firstName: f.firstName.trim(), lastName: f.lastName.trim(), dateOfBirth: f.dateOfBirth });
      setForm(null);
      setSaved(true);
    } catch (e2) {
      setErr(e2?.message || t('account.personal.saveError'));
    } finally {
      setBusy(false);
    }
  };

  const startChange = () => { setPhoneAtStart(user.phoneNumber || null); setNumber(''); verify.reset(); setChanging(true); };
  const keepOld = () => { verify.reset(); setChanging(false); };
  const full = number.trim().startsWith('+') ? number.trim() : `${DIAL} ${number.trim()}`;
  const message = verify.error
    ? (verify.errorCode === 'CODE_WRONG' && verify.attemptsLeft != null
      ? t('phoneGate.wrong', { count: verify.attemptsLeft })
      : t(`phoneGate.errors.${verify.errorCode || 'generic'}`, { defaultValue: verify.error }))
    : '';
  const num = <b className="num" style={{ color: 'var(--k-fg)' }} />;

  const profile = (
    <form className="card padl stk" style={{ gap: 14 }} onSubmit={save} noValidate>
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        <label className="fld grow">
          {t('account.personal.firstName')}
          <input className="in" value={f.firstName} onChange={(e) => edit('firstName', e.target.value)} autoComplete="given-name" />
        </label>
        <label className="fld grow">
          {t('account.personal.lastName')}
          <input className="in" value={f.lastName} onChange={(e) => edit('lastName', e.target.value)} autoComplete="family-name" />
        </label>
      </div>
      <div className="fld">
        {t('account.personal.dob')}
        <DateOfBirthPicker key={pickerKey} value={f.dateOfBirth} onChange={(v) => edit('dateOfBirth', v)} />
      </div>
      <div className="fld">
        {t('account.personal.email')}
        <span className="row" style={{ gap: 10, padding: '4px 0 0', color: 'var(--k-fg)', fontSize: 15 }}>
          <GoogleMark size={18} />
          <span className="grow" style={{ overflowWrap: 'anywhere' }}>{user.email}</span>
        </span>
        <span className="hint">{t('account.personal.emailHint')}</span>
      </div>
      {err && <p className="errt" role="alert">{err}</p>}
      <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
        {saved && !dirty && <span className="sm okt grow" role="status">{t('account.personal.saved')}</span>}
        <button type="button" className="btn btn-g btn-sm" onClick={cancel} disabled={!dirty || busy}>{t('account.personal.cancel')}</button>
        <button type="submit" className="btn btn-p btn-sm" disabled={!dirty || busy} aria-disabled={!dirty || busy || undefined}>
          {busy ? t('account.personal.saving') : t('account.personal.save')}
        </button>
      </div>
    </form>
  );

  const offSend = verify.busy || !number.trim();
  const offConfirm = verify.busy || verify.code.length !== 4;
  const phone = (
    <div className="card padl stk" style={{ gap: 14 }}>
      <div className="rowb">
        <h2 className="h3">{t('account.personal.phoneTitle')}</h2>
        {user.phoneVerified && <span className="chip c-done">{t('account.personal.active')}</span>}
      </div>
      <div className="row" style={{ gap: 12 }}>
        <span className="li-ic"><G name="phone" cls="" /></span>
        <div className="grow">
          <b className="num" style={{ whiteSpace: 'nowrap' }}>{user.phoneNumber ? phoneText(user.phoneNumber) : '—'}</b>
          <div className="xs dim">{t('account.personal.phoneSub')}</div>
        </div>
      </div>

      {!changing ? (
        <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={startChange}>{t('account.personal.change')}</button>
      ) : (
        <>
          <div className="sep" />
          <span className="sm"><Trans t={t} i18nKey="account.personal.newNumber" components={{ b: <b /> }} /></span>
          {!verify.sent ? (
            <form className="stk" style={{ gap: 12 }} noValidate onSubmit={(e) => { e.preventDefault(); if (!offSend) verify.request(full); }}>
              <label className="fld">
                {t('phoneGate.numberLabel')}
                <span className={`ingrp${verify.error ? ' err' : ''}`}>
                  <span style={{ padding: '0 4px 0 15px', color: 'var(--k-fg)', fontWeight: 600 }}>{DIAL}</span>
                  <input
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder={t('phoneGate.numberPlaceholder')}
                    aria-invalid={!!verify.error || undefined}
                    style={{ paddingLeft: 8 }}
                  />
                </span>
              </label>
              {message && <p className="errt" role="alert">{message}</p>}
              <button type="submit" className="btn btn-p btn-b" disabled={offSend} aria-disabled={offSend || undefined}>
                {verify.busy ? t('phoneGate.sending') : t('phoneGate.sendCode')}
              </button>
            </form>
          ) : (
            <form className="stk" style={{ gap: 14 }} noValidate onSubmit={(e) => { e.preventDefault(); if (!offConfirm) verify.confirm(); }}>
              <div className="row" style={{ gap: 8 }}>
                <b className="num" style={{ fontSize: 15, whiteSpace: 'nowrap' }}>{phoneText(full)}</b>
                <span className="dim" aria-hidden="true">{'·'}</span>
                <button type="button" className="link sm" onClick={verify.reset}>{t('account.personal.edit')}</button>
              </div>
              <div className="stk" style={{ gap: 8 }}>
                <span className="sm dim">{t('account.personal.codeLabel')}</span>
                <Otp
                  value={verify.code}
                  onChange={verify.setCode}
                  label={t('account.personal.codeLabel')}
                  invalid={verify.errorCode === 'CODE_WRONG'}
                  align="start"
                  autoFocus
                />
              </div>
              {verify.devCode && <span className="xs dim mono">{t('phone.devCode', { code: verify.devCode })}</span>}
              {message && <p className="errt" role="alert">{message}</p>}
              {verify.resendIn > 0 ? (
                <span className="sm dim"><Trans t={t} i18nKey="phoneGate.resendIn" values={{ time: mmss(verify.resendIn) }} components={{ num }} /></span>
              ) : (
                <button type="button" className="link sm" style={{ alignSelf: 'flex-start' }} onClick={verify.resend} disabled={verify.busy}>{t('phoneGate.resend')}</button>
              )}
              <button type="submit" className="btn btn-p btn-b" disabled={offConfirm} aria-disabled={offConfirm || undefined}>
                {verify.busy ? t('phoneGate.checking') : t('account.personal.confirmNew')}
              </button>
            </form>
          )}
          <button type="button" className="link sm" style={{ alignSelf: 'center' }} onClick={keepOld}>{t('account.personal.keepOld')}</button>
        </>
      )}
    </div>
  );

  return (
    <div style={dev === 'desk'
      ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24, alignItems: 'start' }
      : { display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      {profile}
      {phone}
    </div>
  );
}
