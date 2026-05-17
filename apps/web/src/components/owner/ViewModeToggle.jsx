import { useTranslation } from 'react-i18next';
import { useGlow } from '../../styles/glow';
import { useOwnerTools } from '../../contexts/OwnerToolsContext';

const Eye = (p = {}) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = (p = {}) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 3l18 18" /><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4.2" />
    <path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.2-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

// Floating client-view switch: "Enable client view" previews the store as a
// shopper sees it, "Disable client view" returns to managing. The only owner
// affordance that stays on screen while client view is on (OwnerBar and
// per-product controls hide there), so the owner can always turn it back off.
// Sits just above the GlowDock; owner-only — the provider only mounts it when
// the user may manage this store.
export default function ViewModeToggle() {
  const { isOwner, viewMode, toggleViewMode } = useOwnerTools();
  const { T } = useGlow();
  const { t } = useTranslation('owner');

  if (!isOwner) return null;

  const client = viewMode === 'client';

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 92, zIndex: 1190,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
    }}>
      <button
        onClick={toggleViewMode}
        style={{
          pointerEvents: 'auto',
          height: 38, padding: '0 18px', borderRadius: 999,
          border: client ? 'none' : `1px solid ${T.border}`,
          background: client
            ? T.grad
            : (T.dark ? 'rgba(18,18,28,0.82)' : 'rgba(255,255,255,0.82)'),
          color: client ? '#fff' : T.text,
          font: `700 12.5px ${T.font}`,
          backdropFilter: 'saturate(180%) blur(22px)',
          WebkitBackdropFilter: 'saturate(180%) blur(22px)',
          boxShadow: T.dark ? '0 10px 30px rgba(0,0,0,0.45)' : '0 10px 30px rgba(20,20,60,0.14)',
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
        }}
      >
        {client ? <EyeOff /> : <Eye />}
        {client ? t('disableClientView') : t('enableClientView')}
      </button>
    </div>
  );
}
