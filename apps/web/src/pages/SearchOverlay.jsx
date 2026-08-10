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
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: `1px solid ${T.border}`, cursor: 'pointer' }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, color: T.textDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <div style={{ flex: 1, font: `500 14px ${T.font}`, color: T.text }}>{primary}</div>
      <div style={{ font: `500 11.5px ${T.font}`, color: T.textMute }}>{meta}</div>
      <Icon.arrowR style={{ opacity: 0.4 }} />
    </div>
  );
}

export default function SearchOverlay() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { t } = useTranslation('storefront');
  const [q, setQ] = useState('');
  const recent = readRecent();

  const QUICK = [
    { id: 'p50', label: t('search.qUnder50'), icon: '₾' },
    { id: 'ship', label: t('search.qFreeShip'), icon: '↑' },
    { id: 'new', label: t('search.qNew'), icon: '✦' },
    { id: 'sale', label: t('search.qSale'), icon: '%' },
    { id: 'stock', label: t('search.qInStock'), icon: '●' },
    { id: 'gift', label: t('search.qGift'), icon: '♥' },
  ];
  const TRENDING = [
    { id: 'newWeek', label: t('search.tNewWeek') },
    { id: 'onSale', label: t('search.tOnSale') },
    { id: 'bestSellers', label: t('search.tBestSellers') },
    { id: 'under30', label: t('search.tUnder30') },
  ];

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
          <span onClick={() => navigate(-1)} style={{ font: `600 14px ${T.font}`, color: T.accentFg, cursor: 'pointer' }}>{t('search.cancel')}</span>
        </div>

        <div style={{ padding: '14px 18px 0' }}>
          <div style={{ font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{t('search.quickFilters')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK.map((s) => (
              <span key={s.id} onClick={() => run(s.label)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, background: T.surface, border: `1px solid ${T.border}`, font: `500 12.5px ${T.font}`, color: T.text, cursor: 'pointer' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: T.accentBg, color: T.accentFg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `700 11px ${T.font}` }}>{s.icon}</span>
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {recent.length > 0 && (
          <div style={{ padding: '20px 18px 0' }}>
            <div style={{ font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{t('search.recent')}</div>
            {recent.map((r) => <Row key={r} T={T} icon={<Icon.search />} primary={r} meta={t('search.recentMeta')} onClick={() => run(r)} />)}
          </div>
        )}

        <div style={{ padding: '20px 18px 0' }}>
          <div style={{ font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{t('search.trending', { name: tenant.name })}</div>
          {TRENDING.map((r) => <Row key={r.id} T={T} icon={<Icon.spark />} primary={r.label} meta={t('search.popularMeta')} onClick={() => run(r.label)} />)}
        </div>
      </div>
    </GlowScreen>
  );
}
