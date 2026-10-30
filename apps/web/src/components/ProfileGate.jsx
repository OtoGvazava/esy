import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { useAuth } from '../contexts/AuthContext';
import DateOfBirthPicker from './DateOfBirthPicker';
import PhoneStep from './PhoneStep';

// The registration gate: a blocking, full-screen prompt shown after sign-in
// until the account has BOTH the mandatory profile (name, surname, date of
// birth) and a verified phone. Step 1 is the profile, step 2 the phone with an
// SMS code; there is no skip, and signing out is the only way past it.
//
// An account that already has a profile but no verified phone — one created
// before the phone was required — sees only step 2, with copy that says why
// it is being asked now. The server refuses that account's writes until it is
// verified (PHONE_REQUIRED), so this gate is the way out, not just a nudge.
export default function ProfileGate() {
  const { T } = useGlow();
  const { t } = useTranslation('storefront');
  const { isAuthenticated, loading, user, saveProfile, logout } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Whether step 1 was shown in this visit: tells a new registration apart
  // from an older account meeting the phone requirement for the first time.
  const [didProfile, setDidProfile] = useState(false);

  if (loading || !isAuthenticated || !user) return null;
  if (user.profileComplete && user.phoneVerified) return null;

  const onPhoneStep = user.profileComplete;
  const existingAccount = onPhoneStep && !didProfile;

  const f = form || {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    dateOfBirth: user.dateOfBirth || '',
  };
  const set = (k) => (e) => { setForm({ ...f, [k]: e.target.value }); setErr(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.firstName.trim() || !f.lastName.trim() || !f.dateOfBirth) {
      setErr(t('profileGate.required'));
      return;
    }
    setBusy(true);
    try {
      setDidProfile(true);
      await saveProfile({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        dateOfBirth: f.dateOfBirth,
      });
      // success → user.profileComplete becomes true → step 2 renders
    } catch (e2) {
      setDidProfile(false);
      setErr(e2?.message || t('profileGate.error'));
    } finally {
      setBusy(false);
    }
  };

  const label = { font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.04em', textTransform: 'uppercase' };
  const input = {
    padding: '12px 14px', borderRadius: 12, border: `1px solid ${T.border}`,
    background: T.dark ? T.surface2 : '#fff', color: T.text,
    font: `500 14px ${T.font}`, outline: 'none', width: '100%',
  };
  const card = {
    width: '100%', maxWidth: 420, background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 22, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
    boxShadow: T.dark ? '0 24px 60px rgba(0,0,0,0.5)' : '0 24px 60px rgba(20,20,60,0.15)',
  };

  // The design's step bar: two segments, filled up to the current step.
  const steps = !existingAccount && (
    <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
      {[0, 1].map((i) => (
        <span key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= (onPhoneStep ? 1 : 0) ? T.accent : T.surface2 }} />
      ))}
    </div>
  );

  const signOut = (
    <div style={{ textAlign: 'center', font: `500 12.5px ${T.font}`, color: T.textMute }}>
      {t('phoneGate.otherAccount')}{' '}
      <button type="button" onClick={logout} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: T.accentFg, font: `600 12.5px ${T.font}` }}>
        {t('phoneGate.signOut')}
      </button>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000, background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }}>
      {onPhoneStep ? (
        <div style={card} role="dialog" aria-modal="true" aria-labelledby="gate-title">
          {steps}
          {!existingAccount && (
            <span style={{ alignSelf: 'flex-start', padding: '5px 11px', borderRadius: 999, background: T.accentBg, color: T.accentFg, font: `700 11px ${T.font}` }}>
              {t('phoneGate.stepChip')}
            </span>
          )}
          <div>
            <div id="gate-title" style={{ font: `800 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>
              {existingAccount ? t('phoneGate.existingTitle', { name: user.firstName || '' }) : t('phoneGate.title')}
            </div>
            <div style={{ marginTop: 6, font: `400 13px/1.55 ${T.font}`, color: T.textDim }}>
              {existingAccount ? t('phoneGate.existingSubtitle') : t('phoneGate.subtitle')}
            </div>
          </div>
          <PhoneStep initialNumber="" />
          {signOut}
        </div>
      ) : (
        <form onSubmit={submit} style={card} aria-labelledby="gate-title">
          {steps}
          <div>
            <div id="gate-title" style={{ font: `800 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{t('profileGate.title')}</div>
            <div style={{ marginTop: 6, font: `400 13px ${T.font}`, color: T.textDim }}>{t('profileGate.subtitle')}</div>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={label}>{t('profileGate.firstName')}</span>
            <input value={f.firstName} onChange={set('firstName')} autoComplete="given-name" style={input} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={label}>{t('profileGate.lastName')}</span>
            <input value={f.lastName} onChange={set('lastName')} autoComplete="family-name" style={input} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={label}>{t('profileGate.dob')}</span>
            <DateOfBirthPicker
              value={f.dateOfBirth}
              onChange={(v) => { setForm({ ...f, dateOfBirth: v }); setErr(''); }}
            />
          </label>
          {err && <div role="alert" style={{ font: `500 12.5px ${T.font}`, color: T.danger }}>{err}</div>}
          <button type="submit" disabled={busy} style={{
            height: 50, borderRadius: 14, border: 'none',
            background: busy ? T.surface2 : T.grad, color: busy ? T.textMute : '#fff',
            font: `700 14px ${T.font}`, cursor: busy ? 'not-allowed' : 'pointer',
            boxShadow: busy ? 'none' : `0 10px 28px ${T.accent}55`,
          }}>
            {busy ? t('profileGate.saving') : t('profileGate.next')}
          </button>
          {signOut}
        </form>
      )}
    </div>
  );
}
