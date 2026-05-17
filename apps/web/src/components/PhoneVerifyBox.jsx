import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { usePhoneVerify } from '../hooks/usePhoneVerify';

// Send-code → enter-code → confirm. Caller renders this only when the signed-in
// user has a phone number that is not yet verified; on success the auth context
// refreshes (user.phoneVerified flips) and the caller unmounts this.
export default function PhoneVerifyBox({ compact = false }) {
  const { T } = useGlow();
  const { t } = useTranslation('storefront');
  const { sent, devCode, code, setCode, busy, error, request, confirm } = usePhoneVerify();

  const input = {
    padding: '11px 12px', borderRadius: 10, border: `1px solid ${T.border}`,
    background: T.dark ? T.surface2 : '#fff', color: T.text,
    font: `600 15px ${T.font}`, outline: 'none', width: '100%',
    letterSpacing: '0.3em', textAlign: 'center',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!sent ? (
        <button
          onClick={request}
          disabled={busy}
          style={{
            height: compact ? 40 : 44, borderRadius: 12, border: 'none',
            background: busy ? T.surface2 : T.accentBg, color: busy ? T.textMute : T.accentFg,
            font: `700 12.5px ${T.font}`, cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? t('phone.sending') : t('phone.verifyCta')}
        </button>
      ) : (
        <>
          <div style={{ font: `500 12px ${T.font}`, color: T.textDim }}>{t('phone.sentHint')}</div>
          {devCode && (
            <div style={{ font: `600 12px ${T.mono || T.font}`, color: T.textMute }}>
              {t('phone.devCode', { code: devCode })}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="······"
              style={{ ...input, flex: 1 }}
            />
            <button
              onClick={confirm}
              disabled={busy || !code.trim()}
              style={{
                height: 44, padding: '0 16px', borderRadius: 12, border: 'none',
                background: busy || !code.trim() ? T.surface2 : T.grad,
                color: busy || !code.trim() ? T.textMute : '#fff',
                font: `700 13px ${T.font}`, cursor: busy || !code.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? t('phone.checking') : t('phone.confirm')}
            </button>
          </div>
        </>
      )}
      {error && <div style={{ font: `500 12px ${T.font}`, color: T.danger }}>{error}</div>}
    </div>
  );
}
