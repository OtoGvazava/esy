import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { useAuth } from '../contexts/AuthContext';
import PhoneVerifyBox from './PhoneVerifyBox';
import DateOfBirthPicker from './DateOfBirthPicker';

// Account-page cards. The mandatory profile (name, surname, date of birth) and
// the phone number are edited separately: changing the phone clears its
// verification, so it lives in its own card with its own save + verify flow.
export default function PersonalInfo() {
  const { T } = useGlow();
  const { t } = useTranslation('storefront');
  const { user, saveProfile, savePhone } = useAuth();

  // profile (name / surname / dob)
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // phone (separate)
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneErr, setPhoneErr] = useState('');

  if (!user) return null;

  const base = {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    dateOfBirth: user.dateOfBirth || '',
  };
  const f = form || base;
  const set = (k) => (e) => { setForm({ ...f, [k]: e.target.value }); setErr(''); };

  const startEdit = () => { setForm(base); setEditing(true); setErr(''); };
  const cancel = () => { setEditing(false); setForm(null); setErr(''); };

  const save = async () => {
    if (!f.firstName.trim() || !f.lastName.trim() || !f.dateOfBirth) {
      setErr(t('account.personal.required'));
      return;
    }
    setBusy(true);
    try {
      await saveProfile({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        dateOfBirth: f.dateOfBirth,
      });
      setEditing(false);
      setForm(null);
    } catch (e) {
      setErr(e?.message || t('account.personal.saveError'));
    } finally {
      setBusy(false);
    }
  };

  const startPhoneEdit = () => { setPhoneInput(user.phoneNumber || ''); setPhoneEditing(true); setPhoneErr(''); };
  const cancelPhone = () => { setPhoneEditing(false); setPhoneErr(''); };

  const savePhoneNumber = async () => {
    setPhoneBusy(true);
    setPhoneErr('');
    try {
      await savePhone(phoneInput.trim());
      setPhoneEditing(false);
    } catch (e) {
      setPhoneErr(e?.message || t('account.personal.saveError'));
    } finally {
      setPhoneBusy(false);
    }
  };

  const card = { padding: 16, borderRadius: 18, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 12 };
  const label = { font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.04em', textTransform: 'uppercase' };
  const input = { padding: '11px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.dark ? T.surface2 : '#fff', color: T.text, font: `500 13px ${T.font}`, outline: 'none', width: '100%' };
  const row = { display: 'flex', flexDirection: 'column', gap: 5 };
  const val = { font: `600 14px ${T.font}`, color: T.text };
  const linkBtn = { font: `600 12.5px ${T.font}`, color: T.accentFg, cursor: 'pointer', background: 'none', border: 'none', padding: 0 };
  const primaryBtn = (disabled) => ({ height: 42, borderRadius: 12, border: 'none', background: disabled ? T.surface2 : T.grad, color: disabled ? T.textMute : '#fff', font: `700 13px ${T.font}`, cursor: disabled ? 'not-allowed' : 'pointer' });
  const ghostBtn = { height: 42, padding: '0 16px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, font: `600 13px ${T.font}`, cursor: 'pointer' };

  return (
    <>
      {/* personal information (name / surname / date of birth) */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ font: `700 14px ${T.font}`, color: T.text, letterSpacing: '-0.01em' }}>{t('account.personal.title')}</div>
            {!editing && (
              <button onClick={startEdit} style={linkBtn}>{t('account.personal.edit')}</button>
            )}
          </div>

          {editing ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={row}><span style={label}>{t('account.personal.firstName')}</span><input value={f.firstName} onChange={set('firstName')} style={input} /></label>
                <label style={row}><span style={label}>{t('account.personal.lastName')}</span><input value={f.lastName} onChange={set('lastName')} style={input} /></label>
                <label style={{ ...row, gridColumn: '1 / -1' }}><span style={label}>{t('account.personal.dob')}</span><DateOfBirthPicker value={f.dateOfBirth} onChange={(v) => { setForm({ ...f, dateOfBirth: v }); setErr(''); }} /></label>
              </div>
              {err && <div style={{ font: `500 12px ${T.font}`, color: T.danger }}>{err}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={save} disabled={busy} style={{ ...primaryBtn(busy), flex: 1 }}>{busy ? t('account.personal.saving') : t('account.personal.save')}</button>
                <button onClick={cancel} disabled={busy} style={ghostBtn}>{t('account.personal.cancel')}</button>
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={row}><span style={label}>{t('account.personal.firstName')}</span><span style={val}>{user.firstName || '—'}</span></div>
              <div style={row}><span style={label}>{t('account.personal.lastName')}</span><span style={val}>{user.lastName || '—'}</span></div>
              <div style={{ ...row, gridColumn: '1 / -1' }}><span style={label}>{t('account.personal.dob')}</span><span style={val}>{user.dateOfBirth || '—'}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* phone number (separate — changing it requires re-verification) */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ font: `700 14px ${T.font}`, color: T.text, letterSpacing: '-0.01em' }}>{t('phone.title')}</div>
            {!phoneEditing && (
              <button onClick={startPhoneEdit} style={linkBtn}>
                {user.phoneNumber ? t('phone.change') : t('phone.add')}
              </button>
            )}
          </div>

          {phoneEditing ? (
            <>
              <label style={row}>
                <span style={label}>{t('account.personal.phone')}</span>
                <input value={phoneInput} onChange={(e) => { setPhoneInput(e.target.value); setPhoneErr(''); }} placeholder="+995…" style={input} />
              </label>
              {phoneErr && <div style={{ font: `500 12px ${T.font}`, color: T.danger }}>{phoneErr}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={savePhoneNumber} disabled={phoneBusy} style={{ ...primaryBtn(phoneBusy), flex: 1 }}>{phoneBusy ? t('account.personal.saving') : t('account.personal.save')}</button>
                <button onClick={cancelPhone} disabled={phoneBusy} style={ghostBtn}>{t('account.personal.cancel')}</button>
              </div>
            </>
          ) : (
            <>
              <div style={row}>
                <span style={label}>{t('account.personal.phone')}</span>
                <span style={{ ...val, display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {user.phoneNumber || '—'}
                  {user.phoneNumber && (user.phoneVerified ? (
                    <span style={{ font: `700 10px ${T.font}`, color: T.success, letterSpacing: '0.04em', textTransform: 'uppercase' }}>✓ {t('phone.verified')}</span>
                  ) : (
                    <span style={{ font: `700 10px ${T.font}`, color: T.danger, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t('phone.unverified')}</span>
                  ))}
                </span>
              </div>
              {!user.phoneNumber && (
                <div style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{t('phone.addPrompt')}</div>
              )}
              {user.phoneNumber && !user.phoneVerified && (
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ font: `500 12px ${T.font}`, color: T.textDim }}>{t('phone.reverifyNote')}</div>
                  <PhoneVerifyBox compact />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
