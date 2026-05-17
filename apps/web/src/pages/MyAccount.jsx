/* global process */
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGlow } from '../styles/glow';
import { Icon } from '../components/glow/GlowPrimitives';
import { GlowScreen, GlowTopNav } from '../components/glow/GlowChrome';
import { loginAsAdmin, loginAsUser } from '../utils/adminUtils';

const PROVIDER_LABEL = { google: 'Google', apple: 'Apple' };

const MyAccount = () => {
  const { T, tenant } = useGlow();
  const { t } = useTranslation(['auth', 'account']);
  const { user, updateProfile, login } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
    personalNumber: user?.personalNumber || '',
    dateOfBirth: user?.dateOfBirth || '',
  });

  const toastTimer = useRef(null);
  const flash = (message, severity = 'success') => {
    setToast({ message, severity });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  };

  const startEdit = (id) => setEditing(id);

  const cancelEdit = (id) => {
    setForm((f) => ({ ...f, [id]: user?.[id] || '' }));
    setEditing(null);
  };

  const saveField = async (id) => {
    setLoading(true);
    try {
      const result = await updateProfile({ [id]: form[id] });
      if (result.success) {
        flash(t('account:fieldUpdated'), 'success');
        setEditing(null);
      } else {
        flash(result.error || t('account:updateError'), 'error');
      }
    } catch {
      flash(t('account:updateError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const openPasswordManager = () => {
    if (user?.provider === 'google') {
      window.open('https://myaccount.google.com/security', '_blank');
    } else if (user?.provider === 'apple') {
      window.open('https://appleid.apple.com/account/manage', '_blank');
    } else {
      flash(t('account:passwordChangeRedirect'), 'info');
    }
  };

  const eyebrow = {
    font: `600 10.5px ${T.font}`,
    color: T.textMute,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  };

  if (!user) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title={t('account:myAccount')} onBack={() => navigate(-1)} />
        <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: T.surface, border: `1px solid ${T.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.accentFg }}>
            <Icon.user width="34" height="34" />
          </div>
          <div style={{ font: `700 20px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{t('account:myAccount')}</div>
          <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim, maxWidth: 260 }}>{t('account:loginRequired')}</div>
        </div>
      </GlowScreen>
    );
  }

  const fields = [
    { id: 'firstName', label: t('auth:firstName'), icon: <Icon.user /> },
    { id: 'lastName', label: t('auth:lastName'), icon: <Icon.user /> },
    { id: 'phoneNumber', label: t('auth:phoneNumber'), icon: <Icon.pin /> },
    { id: 'personalNumber', label: t('auth:personalNumber'), icon: <Icon.check /> },
    { id: 'dateOfBirth', label: t('auth:dateOfBirth'), icon: <Icon.bag />, type: 'date' },
  ];

  const initials = `${(user.firstName || user.name || ' ')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase();
  const providerLabel = PROVIDER_LABEL[user.provider] || tenant.name;

  const renderField = ({ id, label, icon, type = 'text' }) => {
    const active = editing === id;
    return (
      <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={eyebrow}>{label}</span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 14px',
          borderRadius: 14, background: T.surface,
          border: `1.5px solid ${active ? T.accent : T.border}`,
          boxShadow: active ? `0 0 0 3px ${T.accent}22` : 'none',
        }}>
          <span style={{ color: T.textMute, display: 'inline-flex' }}>{icon}</span>
          <input
            type={type}
            value={form[id] || ''}
            disabled={!active}
            onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
            style={{
              flex: 1, minWidth: 0, height: '100%', background: 'transparent',
              border: 'none', outline: 'none', color: T.text,
              font: `500 14px ${T.font}`, letterSpacing: '-0.01em',
            }}
          />
          {active ? (
            <span style={{ display: 'inline-flex', gap: 6 }}>
              <button onClick={() => saveField(id)} disabled={loading} aria-label={t('account:saveChanges')} style={{
                width: 30, height: 30, borderRadius: 10, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer', background: T.accent, color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.6 : 1,
              }}><Icon.check /></button>
              <button onClick={() => cancelEdit(id)} aria-label={t('account:cancel')} style={{
                width: 30, height: 30, borderRadius: 10, border: `1px solid ${T.border}`, cursor: 'pointer',
                background: 'transparent', color: T.textDim,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `600 14px ${T.font}`,
              }}>×</button>
            </span>
          ) : (
            <button onClick={() => startEdit(id)} style={{
              width: 'auto', height: 30, padding: '0 12px', borderRadius: 10, border: `1px solid ${T.border}`,
              cursor: 'pointer', background: 'transparent', color: T.accentFg,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `600 11px ${T.font}`,
            }}>{t('account:edit')}</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <GlowScreen T={T}>
      <GlowTopNav T={T} title={t('account:myAccount')} onBack={() => navigate(-1)} />
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        {/* Profile card */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{
            padding: '18px 16px', borderRadius: 18,
            background: `linear-gradient(135deg, ${tenant.accent}1c, transparent 70%), ${T.surface}`,
            border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            {user.avatar ? (
              <img src={user.avatar} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: T.grad,
                color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                font: `800 22px ${T.font}`, letterSpacing: '-0.02em',
              }}>{initials}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `700 17px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>
                {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
              </div>
              <div style={{ font: `400 12px ${T.font}`, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, background: '#3f8a4a18', color: '#3f8a4a', font: `600 10.5px ${T.font}`, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  <Icon.check width="10" height="10" /> {t('account:verifiedShort')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dev role toggle — development only */}
        {process.env.NODE_ENV === 'development' && (
          <>
            <div style={{ padding: '4px 22px 8px', ...eyebrow }}>{t('account:devTools')}</div>
            <div style={{ padding: '0 16px 14px' }}>
              <div style={{ padding: '14px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { role: 'admin', label: t('account:switchToAdmin'), fn: loginAsAdmin, msg: t('account:roleSwitchedAdmin') },
                    { role: 'user', label: t('account:switchToUser'), fn: loginAsUser, msg: t('account:roleSwitchedUser') },
                  ].map((b) => {
                    const on = user.role === b.role;
                    return (
                      <button key={b.role} onClick={() => { login(b.fn()); flash(b.msg, 'success'); }} style={{
                        padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                        background: on ? T.accent : 'transparent', color: on ? '#fff' : T.text,
                        border: `1px solid ${on ? T.accent : T.border}`, font: `600 12px ${T.font}`,
                      }}>{b.label}</button>
                    );
                  })}
                </div>
                <span style={{ font: `400 11.5px ${T.font}`, color: T.textMute }}>
                  {t('account:currentRole', { role: user.role || 'user' })}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Personal information */}
        <div style={{ padding: '4px 22px 8px', ...eyebrow, letterSpacing: '0.12em' }}>{t('account:personalInformation')}</div>
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map((f) => renderField(f))}
          {/* Email — read-only auth identity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={eyebrow}>{t('auth:email')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 14px', borderRadius: 14, background: T.surface, border: `1.5px solid ${T.border}` }}>
              <span style={{ color: T.textMute, display: 'inline-flex' }}><Icon.mail /></span>
              <span style={{ flex: 1, minWidth: 0, color: T.textDim, font: `500 14px ${T.font}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
            </div>
          </div>
        </div>

        {/* Security */}
        <div style={{ padding: '4px 22px 8px', ...eyebrow, letterSpacing: '0.12em' }}>{t('account:security')}</div>
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ padding: '14px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: '#3f8a4a18', color: '#3f8a4a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon.check /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `600 13.5px ${T.font}`, color: T.text }}>{t('account:password')}</div>
              <div style={{ font: `400 11.5px ${T.font}`, color: T.textMute }}>{t('account:passwordManagedBy', { provider: providerLabel })}</div>
            </div>
            <button onClick={openPasswordManager} style={{ background: 'transparent', border: 'none', cursor: 'pointer', font: `600 12px ${T.font}`, color: T.accentFg, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {t('account:open')} <Icon.arrowR width="14" height="14" />
            </button>
          </div>
        </div>

        {/* Account actions */}
        <div style={{ padding: '4px 22px 8px', ...eyebrow, letterSpacing: '0.12em' }}>{t('account:accountActions')}</div>
        <div style={{ padding: '0 16px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => navigate('/orders')} style={{ width: '100%', padding: '14px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon.bag /></span>
            <span style={{ flex: 1, font: `600 13.5px ${T.font}`, color: T.text }}>{t('account:viewOrders')}</span>
            <Icon.arrowR width="14" height="14" style={{ color: T.textMute }} />
          </button>
          <button
            onClick={() => {
              if (window.confirm(t('account:deleteAccountConfirm'))) {
                flash(t('account:deleteAccountSuccess'), 'info');
              }
            }}
            style={{ width: '100%', padding: '14px', borderRadius: 14, background: `${T.danger}0f`, border: `1px solid ${T.danger}33`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
          >
            <span style={{ width: 38, height: 38, borderRadius: 12, background: `${T.danger}1f`, color: T.danger, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `700 18px ${T.font}` }}>×</span>
            <span style={{ flex: 1, font: `600 13.5px ${T.font}`, color: T.danger }}>{t('account:deleteAccount')}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 28, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 1200 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
            background: T.surface, border: `1px solid ${T.border}`, boxShadow: `0 12px 30px ${T.dark ? '#0008' : '#0b0b1420'}`,
            font: `600 13px ${T.font}`, color: T.text, maxWidth: 'calc(100% - 32px)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: toast.severity === 'error' ? T.danger : toast.severity === 'info' ? T.accentFg : T.success }} />
            {toast.message}
          </div>
        </div>
      )}
    </GlowScreen>
  );
};

export default MyAccount;
