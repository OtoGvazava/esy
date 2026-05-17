import { useEffect } from 'react';
import { useGlow } from '../../styles/glow';
import { Icon } from '../glow/GlowPrimitives';

// Glow-styled modal shell so owner forms match the storefront (CreateStore /
// StoreOrders), not MUI. Shared by the product editor, store editor and
// delete-confirm. Field/label/button style helpers live in ./glowForm.

export default function GlowModal({ open, title, onClose, busy, children, footer }) {
  const { T } = useGlow();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={busy ? undefined : onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: '40px 16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: T.bg,
          border: `1px solid ${T.border}`, borderRadius: 20,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)', color: T.text,
          font: `400 14px ${T.font}`,
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ font: `700 18px ${T.font}`, letterSpacing: '-0.02em' }}>{title}</div>
          <button
            onClick={onClose} disabled={busy} aria-label="close"
            style={{
              width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.border}`,
              background: 'transparent', color: T.text, cursor: busy ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon.close />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children}
        </div>

        {footer && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            padding: '16px 20px', borderTop: `1px solid ${T.border}`,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
