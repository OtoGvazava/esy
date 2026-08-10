// Store switcher — the manager app's front door. Lists every store the
// signed-in account may manage (OWNER + MANAGER tiers from /api/account) and
// navigates with a full page load so the auth snapshot is rebuilt for the
// selected store (see ManagerShell header comment).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { accountApi, handleApiError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTK } from '../core/useTK';

function StoreCard({ T, store, role, t }) {
  const live = store.status === 'live';
  return (
    <a href={`/products?tenant=${encodeURIComponent(store.subdomain)}`} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
      textDecoration: 'none', color: T.text,
    }}>
      {store.logoUrl ? (
        <img src={store.logoUrl} alt="" width={40} height={40}
             style={{ borderRadius: 12, objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: T.accentBg,
          color: T.accentFg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          font: `800 16px ${T.font}`,
        }}>{(store.displayName || store.name || '?').slice(0, 1).toUpperCase()}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `700 15px ${T.font}`, letterSpacing: '-0.01em' }}>
          {store.displayName || store.name}
        </div>
        <div style={{ font: `500 12px ${T.mono}`, color: T.textMute }}>{store.subdomain}</div>
      </div>
      <span style={{
        font: `600 11px ${T.font}`, padding: '3px 10px', borderRadius: 999,
        color: role === 'OWNER' ? T.accentFg : T.textDim,
        background: role === 'OWNER' ? T.accentBg : 'transparent',
        border: `1px solid ${role === 'OWNER' ? T.accent : T.border}`,
      }}>{role === 'OWNER' ? t('roleOwner') : t('roleManager')}</span>
      <span style={{
        font: `600 11px ${T.font}`, color: live ? T.success : T.warn,
      }}>{live ? t('statusLive') : t('statusDraft')}</span>
    </a>
  );
}

export default function ManagerHome() {
  const { t } = useTranslation('manager');
  const { isAuthenticated, loading: authLoading, signInWithGoogle } = useAuth();
  const { T } = useTK();
  const [stores, setStores] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    accountApi.get()
      .then((a) => setStores([
        ...(a.ownedStores || []).map((s) => ({ ...s, myRole: 'OWNER' })),
        ...(a.managedStores || []).map((s) => ({ ...s, myRole: 'MANAGER' })),
      ]))
      .catch((e) => setError(handleApiError(e)));
  }, [authLoading, isAuthenticated]);

  const wrap = { maxWidth: 560, margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 12 };

  if (!authLoading && !isAuthenticated) {
    return (
      <div style={{ ...wrap, alignItems: 'center', textAlign: 'center', gap: 18 }}>
        <div style={{ font: `700 18px ${T.font}`, color: T.text }}>{t('signInRequired')}</div>
        <button onClick={signInWithGoogle} style={{
          padding: '12px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: T.grad, color: '#fff', font: `700 14px ${T.font}`,
        }}>{t('signIn')}</button>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <h1 style={{ font: `800 22px ${T.font}`, color: T.text, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
        {t('pickStore')}
      </h1>
      {error && <div style={{ font: `500 13px ${T.font}`, color: T.danger }}>{error}</div>}
      {stores && stores.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ font: `700 16px ${T.font}`, color: T.text }}>{t('noStores')}</div>
          <div style={{ font: `400 13px ${T.font}`, color: T.textDim }}>{t('noStoresBody')}</div>
        </div>
      )}
      {stores && stores.map((s) => (
        <StoreCard key={`${s.subdomain}-${s.myRole}`} T={T} store={s} role={s.myRole} t={t} />
      ))}
    </div>
  );
}
