import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { useAuth } from '../contexts/AuthContext';
import { PHONE_REQUIRED_EVENT } from '../utils/api';
import DateOfBirthPicker from './DateOfBirthPicker';
import PhoneStep from './PhoneStep';
import { Sk, initials, useDev } from './shop/kit';

// The registration gate (the design's B2–B5), shown after sign-in until the
// account has BOTH the mandatory profile (name, surname, date of birth) and a
// verified phone. Step 1 is the profile, step 2 the phone with an SMS code.
// On a phone it is the page itself; on a tablet or desktop a card in the
// middle of it. The store's name heads it, because the shopper signed in to
// buy here.
//
// "Back to the store" lets the shopper look around first. It is safe: the
// server refuses every write from an account without a verified phone
// (PHONE_REQUIRED), and that refusal, or opening checkout, brings the gate
// straight back. Signing out is the other way past it.
//
// An account that already has a profile but no verified phone — one created
// before the phone was required — sees only step 2, with copy that says why it
// is being asked now.
export default function ProfileGate() {
  const { tenant } = useGlow();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dev = useDev();
  const { t } = useTranslation('storefront');
  const { isAuthenticated, loading, user, saveProfile, logout } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Whether step 1 was shown in this visit: tells a new registration apart
  // from an older account meeting the phone requirement for the first time.
  const [didProfile, setDidProfile] = useState(false);
  // "‹ previous step" from the phone: the saved profile, open again.
  const [editProfile, setEditProfile] = useState(false);
  const [away, setAway] = useState(false);

  useEffect(() => {
    const back = () => setAway(false);
    window.addEventListener(PHONE_REQUIRED_EVENT, back);
    return () => window.removeEventListener(PHONE_REQUIRED_EVENT, back);
  }, []);

  if (loading || !isAuthenticated || !user) return null;
  if (user.profileComplete && user.phoneVerified) return null;
  if (away && pathname !== '/checkout') return null;

  const onPhoneStep = user.profileComplete && !editProfile;
  const existingAccount = user.profileComplete && !didProfile;

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
      setEditProfile(false);
      setForm(null);
    } catch (e2) {
      if (!user.profileComplete) setDidProfile(false);
      setErr(e2?.message || t('profileGate.error'));
    } finally {
      setBusy(false);
    }
  };

  const backToStore = () => {
    setAway(true);
    if (pathname === '/checkout') navigate('/');
  };

  const progress = (n) => (withPrev) => (
    <div className="stk" style={{ gap: 8 }}>
      <div className="steps" aria-hidden="true"><i className="on" /><i className={n === 2 ? 'on' : undefined} /></div>
      <div className="rowb sm">
        <span className="dim">{t('profileGate.step', { n })}</span>
        {withPrev && n === 2 && (
          <button type="button" className="link" onClick={() => { setEditProfile(true); setErr(''); }}>{t('phoneGate.prevStep')}</button>
        )}
      </div>
    </div>
  );

  const card = dev !== 'ph';
  return (
    <Sk
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'var(--k-bg)', overflowY: 'auto' }}
    >
      <div style={card
        ? { minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }
        : { padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 16px 32px', display: 'flex', justifyContent: 'center' }}
      >
        <div className={card ? 'stk card padl' : 'stk'} style={{ gap: onPhoneStep ? 20 : 18, width: '100%', maxWidth: 460 }}>
          <div className="rowb">
            <span className="row sm"><span className="av sm">{initials(tenant.name)}</span><b>{tenant.name}</b></span>
            <button type="button" className="link sm" onClick={backToStore}>{t('profileGate.backToStore')}</button>
          </div>

          {onPhoneStep ? (
            <PhoneStep
              progress={existingAccount ? null : progress(2)}
              existing={existingAccount}
              name={user.firstName || ''}
            />
          ) : (
            <form className="stk" style={{ gap: 18 }} onSubmit={submit} noValidate>
              {progress(1)(false)}
              <div className="stk" style={{ gap: 6 }}>
                <h1 id="gate-title" className="h1">{t('profileGate.title')}</h1>
                <p className="dim">{t('profileGate.subtitle')}</p>
              </div>
              <label className="fld">
                {t('profileGate.firstName')}
                <input className="in" value={f.firstName} onChange={set('firstName')} autoComplete="given-name" />
              </label>
              <label className="fld">
                {t('profileGate.lastName')}
                <input className="in" value={f.lastName} onChange={set('lastName')} autoComplete="family-name" />
              </label>
              <div className="fld">
                {t('profileGate.dob')}
                <DateOfBirthPicker
                  value={f.dateOfBirth}
                  onChange={(v) => { setForm({ ...f, dateOfBirth: v }); setErr(''); }}
                />
              </div>
              <p className="hint">{t('profileGate.dobHint')}</p>
              {err && <p className="errt" role="alert">{err}</p>}
              <button type="submit" className="btn btn-p btn-lg btn-b" disabled={busy} aria-disabled={busy || undefined} style={{ marginTop: 6 }}>
                {busy ? t('profileGate.saving') : t('profileGate.next')}
              </button>
            </form>
          )}

          <button type="button" className="link sm" style={{ alignSelf: 'center', color: 'var(--k-dim)' }} onClick={logout}>
            {t('profileGate.signOut')}
          </button>
        </div>
      </div>
    </Sk>
  );
}
