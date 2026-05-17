import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { useAuth } from '../contexts/AuthContext';
import DateOfBirthPicker from './DateOfBirthPicker';

// Blocking, full-screen prompt shown right after sign-in until the mandatory
// profile (name, surname, date of birth) is filled. Phone is NOT collected
// here — it is only required, and verified, at checkout.
export default function ProfileGate() {
  const { T } = useGlow();
  const { t } = useTranslation('storefront');
  const { isAuthenticated, loading, user, saveProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (loading || !isAuthenticated || !user || user.profileComplete) return null;

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
      await saveProfile({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        dateOfBirth: f.dateOfBirth,
      });
      // success → user.profileComplete becomes true → this gate unmounts
    } catch (e2) {
      setErr(e2?.message || t('profileGate.error'));
      setBusy(false);
    }
  };

  const label = { font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.04em', textTransform: 'uppercase' };
  const input = {
    padding: '12px 14px', borderRadius: 12, border: `1px solid ${T.border}`,
    background: T.dark ? T.surface2 : '#fff', color: T.text,
    font: `500 14px ${T.font}`, outline: 'none', width: '100%',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000, background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }}>
      <form onSubmit={submit} style={{
        width: '100%', maxWidth: 420, background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 22, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: T.dark ? '0 24px 60px rgba(0,0,0,0.5)' : '0 24px 60px rgba(20,20,60,0.15)',
      }}>
        <div>
          <div style={{ font: `800 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{t('profileGate.title')}</div>
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
        {err && <div style={{ font: `500 12.5px ${T.font}`, color: T.danger }}>{err}</div>}
        <button type="submit" disabled={busy} style={{
          height: 50, borderRadius: 14, border: 'none',
          background: busy ? T.surface2 : T.grad, color: busy ? T.textMute : '#fff',
          font: `700 14px ${T.font}`, cursor: busy ? 'not-allowed' : 'pointer',
          boxShadow: busy ? 'none' : `0 10px 28px ${T.accent}55`,
        }}>
          {busy ? t('profileGate.saving') : t('profileGate.save')}
        </button>
      </form>
    </div>
  );
}
