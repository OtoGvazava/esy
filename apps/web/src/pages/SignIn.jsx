import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useGlow } from '../styles/glow';
import { Icon } from '../components/glow/GlowPrimitives';
import { GlowScreen } from '../components/glow/GlowChrome';
import { platformUrl } from '../utils/hosts';

const GmailGlyph = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);

export default function SignIn() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const { t } = useTranslation('storefront');
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');

  return (
    <GlowScreen T={T} padBottom={40}>
      <div style={{ position: 'absolute', top: -160, left: -80, right: -80, height: 360, background: `radial-gradient(60% 80% at 50% 30%, ${T.accent}48, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 460, margin: '0 auto', position: 'relative' }}>
        <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => navigate('/')} aria-label="close" style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon.close /></button>
        </div>

        <div style={{ padding: '24px 24px', textAlign: 'center' }}>
          <div style={{ width: 62, height: 62, borderRadius: 18, background: T.grad, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', font: `800 30px ${T.font}`, letterSpacing: '-0.04em', boxShadow: `0 16px 36px ${T.accent}55` }}>e</div>
          <div style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.03em', marginBottom: 8 }}>
            {t('signin.title')} <span style={{ color: T.textDim, fontWeight: 600 }}>· {tenant.name}</span>
          </div>
          <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim, maxWidth: 300, margin: '0 auto' }}>
            {t('signin.subtitle')}
          </div>
        </div>

        {/* The design's SignInError state. AuthCallback already sends a failed
            round-trip here as ?error=…, but nothing rendered it: the shopper
            landed back on an ordinary sign-in screen with no hint that the last
            attempt had failed, and the most likely reading is that the button
            does nothing. The raw code is shown in mono because it is the one
            thing worth quoting when someone reports it. */}
        {oauthError && (
          <div style={{ padding: '0 20px 4px' }}>
            <div style={{
              padding: '13px 15px', borderRadius: 14,
              background: T.dangerBg, border: `1px solid ${T.danger}55`,
            }}>
              <div style={{ font: `700 13px ${T.font}`, color: T.dangerFg }}>{t('signin.errorTitle')}</div>
              <div style={{ marginTop: 5, font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>
                {t('signin.errorBody')}
              </div>
              <div style={{ marginTop: 7, font: `500 10.5px ${T.mono}`, color: T.textMute }}>
                error: {oauthError}
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '8px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={signInWithGoogle} style={{
            width: '100%', height: 56, borderRadius: 14, border: `1px solid ${T.borderStr}`,
            background: T.surface, color: T.text, display: 'flex', alignItems: 'center', gap: 12,
            padding: '0 18px', font: `600 14.5px ${T.font}`, letterSpacing: '-0.01em', cursor: 'pointer',
          }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: T.dark ? 'rgba(255,255,255,0.06)' : '#ffffff', color: T.dark ? '#cfd0d8' : '#5a5a66', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{GmailGlyph}</span>
            <span style={{ flex: 1, textAlign: 'left' }}>{t('signin.continueGmail')}</span>
            <Icon.arrowR style={{ opacity: 0.35 }} />
          </button>
        </div>

        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, font: `500 12px ${T.font}`, color: T.textDim }}>
          <span>{t('signin.sellPrompt')}</span>
          {/* Opening a shop is a PLATFORM action and starts on esy.ge. The
              storefront used to answer /create-store with a second, simpler
              form of its own, so which flow a merchant got depended on the
              host they happened to be standing on. One flow now, on the host
              that owns it. */}
          <a href={platformUrl('/sell')} style={{ color: T.accentFg, fontWeight: 700, textDecoration: 'none' }}>{t('signin.openStore')}</a>
        </div>

        <div style={{ padding: '20px 24px 28px' }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </span>
            <div style={{ flex: 1, font: `500 11.5px/1.45 ${T.font}`, color: T.textDim }}>
              {t('signin.encrypted')}
            </div>
          </div>
          <div style={{ marginTop: 10, font: `400 10.5px ${T.font}`, color: T.textMute, textAlign: 'center' }}>
            {t('signin.terms')}
          </div>
        </div>
      </div>
    </GlowScreen>
  );
}
