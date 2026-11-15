import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlow } from '../styles/glow';
import { Icon } from '../components/glow/GlowPrimitives';
import GlowSearchBar from '../components/glow/GlowSearchBar';
import { GlowScreen } from '../components/glow/GlowChrome';

const RECENT_KEY = 'recent-searches';

const readRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};

function Row({ T, icon, primary, meta, onClick }) {
  return (
    // Buttons, not clickable divs, so rows, chips and Cancel work from a
    // keyboard and a screen reader.
    <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 0', border: 'none', borderTop: `1px solid ${T.border}`, background: 'transparent', textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, color: T.textDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <div style={{ flex: 1, font: `500 14px ${T.font}`, color: T.text }}>{primary}</div>
      <span style={{ font: `500 11.5px ${T.font}`, color: T.textMute }}>{meta}</span>
      <Icon.arrowR style={{ opacity: 0.4 }} />
    </button>
  );
}

export default function SearchOverlay() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const [q, setQ] = useState('');
  const recent = readRecent();

  // Each shortcut opens the list it names (a collection filter or the newest
  // first), not a text search for its own label. Sale, free shipping, gifts and
  // best sellers are not in the data, so they are not offered.
  const QUICK = [
    { id: 'p50', label: t('search.qUnder50'), icon: '₾', to: '/?max=50' },
    { id: 'new', label: t('search.qNew'), icon: '✦', to: '/' },
    { id: 'stock', label: t('search.qInStock'), icon: '●', to: '/?stock=1' },
  ];
  const TRENDING = [
    { id: 'newWeek', label: t('search.tNewWeek'), to: '/' },
    { id: 'under30', label: t('search.tUnder30'), to: '/?max=30' },
  ];

  // A shortcut is not something the shopper typed, so it is not a recent search.
  const go = (to) => navigate(to);

  const run = (term) => {
    const t = (term || '').trim();
    if (t) {
      try {
        const next = [t, ...readRecent().filter((x) => x !== t)].slice(0, 6);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
    }
    navigate(t ? `/?search=${encodeURIComponent(t)}` : '/');
  };

  return (
    <GlowScreen T={T} padBottom={40}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ padding: '20px 16px 8px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <GlowSearchBar T={T} value={q} onChange={setQ} onSubmit={run} compact autoFocus placeholder={t('search.placeholder')} />
          </div>
          <button type="button" onClick={() => navigate(-1)} style={{ padding: 0, border: 'none', background: 'transparent', font: `600 14px ${T.font}`, color: T.accentFg, cursor: 'pointer' }}>{t('search.cancel')}</button>
        </div>

        <div style={{ padding: '14px 18px 0' }}>
          <div style={{ font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.12em', marginBottom: 10 }}>{t('search.quickFilters')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK.map((s) => (
              <button type="button" key={s.id} onClick={() => go(s.to)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, background: T.surface, border: `1px solid ${T.border}`, font: `500 12.5px ${T.font}`, color: T.text, cursor: 'pointer' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `700 11px ${T.font}` }}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {recent.length > 0 && (
          <div style={{ padding: '20px 18px 0' }}>
            <div style={{ font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.12em', marginBottom: 10 }}>{t('search.recent')}</div>
            {recent.map((r) => <Row key={r} T={T} icon={<Icon.search />} primary={r} meta={t('search.recentMeta')} onClick={() => run(r)} />)}
          </div>
        )}

        <div style={{ padding: '20px 18px 0' }}>
          <div style={{ font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.12em', marginBottom: 10 }}>{t('search.trending', { name: tenant.name })}</div>
          {TRENDING.map((r) => <Row key={r.id} T={T} icon={<Icon.spark />} primary={r.label} meta={t('search.popularMeta')} onClick={() => go(r.to)} />)}
        </div>
      </div>
    </GlowScreen>
  );
}
