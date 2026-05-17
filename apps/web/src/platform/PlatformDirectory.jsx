import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlatform, useStores, PTopBar, PFooter, StoreMark, StoreArtStrip, StatusPill } from './PlatformShared';
import { tr, CATEGORIES, storeInitials, storeUrl } from './platformData';

function StoreCard({ T, store, onOpen, layout = 'tall' }) {
  return (
    <div onClick={onOpen} style={{
      background: T.surface, borderRadius: 18, border: `1px solid ${T.border}`,
      padding: 14, display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: T.dark ? 'none' : '0 4px 18px rgba(20,20,60,0.04)', cursor: 'pointer',
    }}>
      <StoreArtStrip store={store} height={layout === 'short' ? 72 : 96} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <StoreMark store={store} size={36} radius={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ font: `700 14.5px ${T.font}`, color: T.text, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.name}</span>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: store.primaryColor, flexShrink: 0 }} />
          </div>
          <div style={{ font: `500 10.5px ${T.mono}`, color: T.textMute, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.subdomain}.esy.ge</div>
        </div>
      </div>
      <div style={{ font: `400 12.5px/1.45 ${T.font}`, color: T.textDim, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', minHeight: 36 }}>
        {store.description || 'An independent shop on esy.'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4 }}>
        <div style={{ font: `600 10.5px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{store.category || 'shop'}</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: `700 11.5px ${T.font}`, color: store.primaryColor }}>
          {tr('en', 'visit')}
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
        </span>
      </div>
    </div>
  );
}

function CardSkeleton({ T, layout = 'tall' }) {
  return (
    <div style={{ background: T.surface, borderRadius: 18, border: `1px solid ${T.border}`, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: layout === 'short' ? 72 : 96, borderRadius: 12, background: T.surface2, animation: 'pfpulse 1.6s ease-in-out infinite' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.surface2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '60%', height: 12, borderRadius: 6, background: T.surface2 }} />
          <div style={{ width: '40%', height: 8, borderRadius: 6, background: T.surface2, marginTop: 6 }} />
        </div>
      </div>
      <div style={{ width: '92%', height: 10, borderRadius: 6, background: T.surface2 }} />
      <div style={{ width: '70%', height: 10, borderRadius: 6, background: T.surface2 }} />
      <style>{'@keyframes pfpulse{0%,100%{opacity:1}50%{opacity:.45}}'}</style>
    </div>
  );
}

function QuickView({ T, store, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: T.dark ? 'rgba(10,10,18,0.75)' : 'rgba(15,15,35,0.45)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', width: 'min(560px, 100%)', background: T.surface, borderRadius: 22, border: `1px solid ${T.border}`, boxShadow: T.dark ? '0 32px 80px rgba(0,0,0,0.6)' : '0 32px 80px rgba(20,20,60,0.20)', overflow: 'hidden' }}>
        <div style={{ height: 160, position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${store.primaryColor} 0%, ${store.secondaryColor || store.primaryColor} 100%)` }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 18px, transparent 18px 36px)' }} />
          <button onClick={onClose} style={{ position: 'absolute', right: 18, top: 16, width: 30, height: 30, borderRadius: 10, background: 'rgba(0,0,0,0.25)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <span style={{ position: 'absolute', left: 24, bottom: 18, width: 56, height: 56, borderRadius: 14, background: '#fff', color: store.primaryColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `800 22px ${T.font}`, letterSpacing: '-0.04em', boxShadow: '0 8px 22px rgba(0,0,0,0.18)' }}>{storeInitials(store)}</span>
        </div>
        <div style={{ padding: '20px 24px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ font: `700 24px ${T.font}`, color: T.text, letterSpacing: '-0.03em', margin: 0 }}>{store.name}</h2>
            <span style={{ font: `500 11.5px ${T.mono}`, color: T.textDim }}>{store.subdomain}.esy.ge</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center', font: `500 11.5px ${T.font}`, color: T.textMute }}>
            {store.category && <span style={{ textTransform: 'capitalize' }}>{store.category}</span>}
            <StatusPill T={T} kind="live">live</StatusPill>
          </div>
          <div style={{ marginTop: 16, font: `400 14px/1.55 ${T.font}`, color: T.textDim }}>{store.description || 'An independent shop on esy.'}</div>
          <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
            <button onClick={() => { window.location.href = storeUrl(store); }} style={{
              flex: 1, height: 50, borderRadius: 14, border: 'none',
              background: `linear-gradient(135deg, ${store.primaryColor} 0%, ${store.secondaryColor || store.primaryColor} 100%)`,
              color: '#fff', font: `700 14px ${T.font}`, cursor: 'pointer', boxShadow: `0 10px 28px ${store.primaryColor}55`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Visit {store.subdomain}.esy.ge
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14m-5-6 6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlatformDirectory() {
  const { T, isDesktop, lang } = usePlatform();
  const navigate = useNavigate();
  const { subdomain } = useParams();
  const { stores, loading } = useStores();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('new');

  const list = stores || [];
  const filtered = useMemo(() => {
    let r = list;
    if (cat !== 'all') r = r.filter((s) => s.category === cat);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      r = r.filter((s) => `${s.name} ${s.description || ''} ${s.subdomain}`.toLowerCase().includes(t));
    }
    r = [...r];
    if (sort === 'az') r.sort((a, b) => a.name.localeCompare(b.name));
    else r.reverse();
    return r;
  }, [list, cat, q, sort]);

  const open = subdomain ? list.find((s) => s.subdomain === subdomain) : null;
  const isEmpty = !loading && filtered.length === 0;
  const cols = isDesktop ? 4 : 2;
  const pad = isDesktop ? '0 56px' : '0 22px';

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}` }}>
      <PTopBar current="browse" />

      <div style={{ position: 'relative', padding: isDesktop ? '52px 56px 28px' : '20px 22px 8px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, left: '40%', right: '20%', height: 320, background: `radial-gradient(60% 80% at 50% 30%, ${T.accent}28, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 11px', borderRadius: 999, background: T.accentBg, color: T.accentFg, font: `600 10.5px ${T.font}`, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3f8a4a' }} />
              {tr(lang, 'storeCount', { n: list.length })}
            </div>
            <h1 style={{ font: `700 ${isDesktop ? 52 : 30}px/1 ${T.font}`, color: T.text, letterSpacing: '-0.04em', margin: 0 }}>{tr(lang, 'everyStore')}.</h1>
          </div>
          {isDesktop && (
            <button onClick={() => navigate('/sell')} style={{ height: 44, padding: '0 18px', borderRadius: 14, border: 'none', background: T.grad, color: '#fff', font: `700 13px ${T.font}`, cursor: 'pointer', boxShadow: `0 10px 28px ${T.accent}55`, whiteSpace: 'nowrap' }}>+ {tr(lang, 'openStore')}</button>
          )}
        </div>

        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: isDesktop ? '1.4fr auto' : '1fr', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 14px 0 18px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}` }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ color: T.textDim }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${tr(lang, 'search')}… try "ceramic" or "olive oil"`} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: T.text, font: `400 14px ${T.font}` }} />
          </div>
          <button onClick={() => setSort(sort === 'new' ? 'az' : 'new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 52, padding: '0 16px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, font: `600 13px ${T.font}`, color: T.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M6 12h12M10 18h4" /></svg>
            Sort: <span style={{ color: T.textDim }}>{sort === 'new' ? tr(lang, 'sortNew') : tr(lang, 'sortAZ')}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: isDesktop ? 'wrap' : 'nowrap', overflowX: isDesktop ? 'visible' : 'auto' }}>
          {CATEGORIES.map((c) => {
            const active = c.id === cat;
            const count = c.id === 'all' ? list.length : list.filter((s) => s.category === c.id).length;
            return (
              <button key={c.id} onClick={() => setCat(c.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 999,
                border: active ? 'none' : `1px solid ${T.border}`, background: active ? T.accent : 'transparent',
                color: active ? '#fff' : T.text, font: `600 12.5px ${T.font}`, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {c.label}
                <span style={{ font: `700 10.5px ${T.mono}`, color: active ? 'rgba(255,255,255,0.7)' : T.textMute }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: isDesktop ? '8px 56px 32px' : '8px 22px 24px' }}>
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: isDesktop ? 18 : 12 }}>
            {Array.from({ length: cols * 2 }).map((_, i) => <CardSkeleton key={i} T={T} layout={isDesktop ? 'tall' : 'short'} />)}
          </div>
        )}

        {!loading && !isEmpty && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: isDesktop ? 18 : 12 }}>
            {filtered.map((s) => (
              <StoreCard key={s.subdomain} T={T} store={s} layout={isDesktop ? 'tall' : 'short'} onOpen={() => navigate(`/stores/${s.subdomain}`)} />
            ))}
          </div>
        )}

        {isEmpty && (
          <div style={{ margin: '40px auto 24px', maxWidth: 640, padding: isDesktop ? '48px 36px 44px' : '32px 22px 28px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: T.surface2, color: T.textDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </div>
            <div style={{ font: `700 ${isDesktop ? 24 : 18}px ${T.font}`, color: T.text, letterSpacing: '-0.03em', marginBottom: 10 }}>No stores match{q ? ` "${q}"` : ' that filter'}</div>
            <div style={{ font: `400 14px/1.55 ${T.font}`, color: T.textDim, maxWidth: 380, margin: '0 auto 24px' }}>Try a broader term, drop the category, or open a store that fills the gap.</div>
            <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => { setQ(''); setCat('all'); }} style={{ height: 42, padding: '0 18px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, font: `600 13px ${T.font}`, cursor: 'pointer' }}>Clear search</button>
              <button onClick={() => navigate('/sell')} style={{ height: 42, padding: '0 18px', borderRadius: 12, border: 'none', background: T.grad, color: '#fff', font: `700 13px ${T.font}`, cursor: 'pointer', boxShadow: `0 10px 28px ${T.accent}55` }}>+ Open a store</button>
            </div>
          </div>
        )}
      </div>

      <PFooter compact />
      {open && <QuickView T={T} store={open} onClose={() => navigate('/stores')} />}
    </div>
  );
}
