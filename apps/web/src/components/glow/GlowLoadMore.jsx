// Infinite-scroll continuation hint — ported from direction-a.jsx GlowLoadMore.
import { useTranslation } from 'react-i18next';

export default function GlowLoadMore({ T, count, done = false }) {
  const { t } = useTranslation('home');
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
        {done ? t('reachedEnd') : (count > 0 ? t('loadingMoreN', { count }) : t('loadingMore'))}
      </div>
      <style>{'@keyframes glow-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
