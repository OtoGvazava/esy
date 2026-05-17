import { useEffect } from 'react';
import { useGlow } from '../styles/glow';

// Landing point after Google OAuth. The backend has already set the HttpOnly
// esy_token cookie (Domain=esy.ge) before redirecting here; we only reach this
// route on success (failures go straight to /signin?error=oauth). Hard-reload
// into the app so AuthProvider re-mounts and restores the session from the
// cookie via /api/auth/user.
export default function AuthCallback() {
  const { T } = useGlow();

  useEffect(() => {
    window.location.replace('/account');
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${T.accent}`, borderTopColor: 'transparent', animation: 'glow-spin 1s linear infinite' }} />
      Signing you in…
      <style>{'@keyframes glow-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
