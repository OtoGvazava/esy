// Infinite-scroll continuation hint — ported from direction-a.jsx GlowLoadMore.
export default function GlowLoadMore({ T, count, done = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '24px 0 6px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        font: `500 11.5px ${T.font}`, color: T.textDim, letterSpacing: '0.04em',
      }}>
        {!done && (
          <span style={{
            width: 12, height: 12, borderRadius: '50%',
            border: `2px solid ${T.accent}`, borderTopColor: 'transparent',
            animation: 'glow-spin 1s linear infinite',
          }} />
        )}
        {done ? 'You’ve reached the end' : `loading ${count > 0 ? count : ''} more…`}
      </div>
      <style>{`@keyframes glow-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
