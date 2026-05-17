import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';

// Landing point after Google OAuth. The backend has already set the HttpOnly
// esy_token cookie (Domain=esy.ge) before redirecting here; we only reach this
// route on success (failures go straight to /signin?error=oauth). Hard-reload
// into the app so AuthProvider re-mounts and restores the session from the
// cookie via /api/auth/user.
export default function AuthCallback() {
  const { T, tenant } = useGlow();
  const { t } = useTranslation('storefront');

  useEffect(() => {
    // Return to the store the user signed in from. signInWithGoogle stashed
    // the path on this same origin; the dev store simulation lives in
    // ?tenant=, which the OAuth origin round-trip can't carry on its own.
    let dest = '/account';
    try {
      const saved = sessionStorage.getItem('esy_post_login');
      sessionStorage.removeItem('esy_post_login');
      const tenantParam = saved && new URL(saved, window.location.origin).searchParams.get('tenant');
      if (tenantParam) dest = `/account?tenant=${encodeURIComponent(tenantParam)}`;
    } catch { /* keep default /account */ }
    window.location.replace(dest);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, color: T.text,
      font: `400 14px ${T.font}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
    }}>
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 320, height: 320, borderRadius: '50%',
        background: `radial-gradient(circle, ${T.accent}40, transparent 60%)`,
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'relative', width: 64, height: 64, borderRadius: 20,
        background: T.grad, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        font: `800 28px ${T.font}`, letterSpacing: '-0.04em',
        boxShadow: `0 16px 36px ${T.accent}55`,
      }}>e</div>
      <div style={{ position: 'relative', font: `700 18px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>
        {t('authCallback.signingIn')}
      </div>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10, color: T.textDim, font: `500 12px ${T.font}` }}>
        <span style={{
          width: 16, height: 16, borderRadius: '50%',
          border: `2px solid ${T.accent}`, borderTopColor: 'transparent',
          animation: 'glow-spin 0.8s linear infinite',
        }} />
        <span>{t('authCallback.bringingBack', { name: tenant.name })}</span>
      </div>
      <style>{'@keyframes glow-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
