// Shared Glow form styles for owner dialogs — mirrors CreateStore so the
// add/edit forms match the storefront. Plain module (no components) so it can
// be imported freely without tripping react-refresh.

export const glowField = (T) => ({
  width: '100%',
  height: 52,
  padding: '0 16px',
  borderRadius: 14,
  background: T.surface,
  border: `1.5px solid ${T.border}`,
  color: T.text,
  font: `500 14px ${T.font}`,
  outline: 'none',
  boxSizing: 'border-box',
});

export const glowLabel = (T) => ({
  font: `500 10.5px ${T.font}`,
  color: T.textMute,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 6,
});

export const glowPrimaryBtn = (T, busy) => ({
  height: 50,
  padding: '0 22px',
  borderRadius: 14,
  border: 'none',
  background: T.grad,
  color: '#fff',
  font: `700 14px ${T.font}`,
  cursor: busy ? 'default' : 'pointer',
  opacity: busy ? 0.7 : 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
});

export const glowGhostBtn = (T, busy) => ({
  height: 50,
  padding: '0 18px',
  borderRadius: 14,
  border: `1px solid ${T.border}`,
  background: 'transparent',
  color: T.text,
  font: `600 14px ${T.font}`,
  cursor: busy ? 'default' : 'pointer',
});

export const glowError = (T) => ({
  padding: '12px 14px',
  borderRadius: 12,
  background: `${T.danger}14`,
  border: `1px solid ${T.danger}40`,
  color: T.danger,
  font: `500 12.5px ${T.font}`,
});
