// Page not found (the design's L5). The likely visitor followed an old link —
// to a page that moved, or to a store that is no longer on esy — so the page
// says both in one line and offers what they were most likely after: the
// store, found by name. The field searches the live directory as you type and
// lists what matches; Enter opens the first. Then home, or every store.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlatform, useStores, PTopBar, PFooter, StoreMark } from './PlatformShared';
import { storeUrl } from './platformData';
import { Btn, Glyph, List, ingrpInput, ingrpStyle, liStyle, type, usePDevice } from './PlatformKit';

const norm = (s) => String(s || '').toLowerCase();

export default function PlatformNotFound() {
  const { T } = usePlatform();
  const { ph, desk, gut } = usePDevice();
  const { t } = useTranslation('platform');
  const { stores } = useStores();
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const ty = type(T, desk);

  const query = norm(q.trim());
  const hits = useMemo(() => {
    if (!query) return [];
    return (stores || [])
      .filter((s) => !s.suspended)
      .filter((s) => [s.displayName, s.name, s.subdomain, s.tagline].some((v) => norm(v).includes(query)))
      .slice(0, 5);
  }, [stores, query]);

  const open = (s) => { window.location.href = storeUrl(s); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}` }}>
      <PTopBar />
      <main style={{ display: 'flex', justifyContent: 'center', padding: `72px ${gut}px 56px`, flex: '1 0 auto' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          gap: 16, padding: 24, maxWidth: 480, width: '100%', boxSizing: 'border-box',
        }}>
          <b style={{
            ...ty.big, fontSize: 88, lineHeight: 1, color: T.accentFg, fontVariantNumeric: 'tabular-nums',
          }}>
            {t('lost.code')}
          </b>
          <h1 style={ty.h1}>{t('lost.title')}</h1>
          <p style={{ ...ty.body, color: T.textDim, textWrap: 'balance' }}>{t('lost.body')}</p>

          <form
            role="search"
            onSubmit={(e) => { e.preventDefault(); if (hits[0]) open(hits[0]); }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <label style={ingrpStyle(T, focus)}>
              <Glyph name="search" style={{ marginLeft: 14 }} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                placeholder={t('lost.placeholder')}
                aria-label={t('lost.searchLabel')}
                autoComplete="off"
                style={ingrpInput(T)}
              />
            </label>
            {query && (
              hits.length ? (
                <List T={T} style={{ textAlign: 'left' }}>
                  {hits.map((s, i) => (
                    <a key={s.subdomain} href={storeUrl(s)} style={liStyle(T, i === hits.length - 1)}>
                      <StoreMark store={s} size={34} radius={10} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ display: 'block', fontSize: 12.5 }}>{s.displayName || s.name}</b>
                        <span style={{ display: 'block', fontSize: 12, color: T.textDim }}>{t('lost.host', { sub: s.subdomain })}</span>
                      </span>
                      <Glyph name="chevR" size={16} style={{ color: T.textDim }} />
                    </a>
                  ))}
                </List>
              ) : (
                <p role="status" style={{ ...ty.body, fontSize: 12.5, color: T.textDim }}>
                  {stores ? t('lost.none', { q: q.trim() }) : t('lost.searching')}
                </p>
              )
            )}
          </form>

          <div style={{
            display: 'grid', gap: 10, width: '100%',
            gridTemplateColumns: ph ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
          }}>
            <Btn T={T} kind="p" to="/" block>{t('lost.home')}</Btn>
            <Btn T={T} to="/stores" block>{t('lost.stores')}</Btn>
          </div>
        </div>
      </main>
      <PFooter />
    </div>
  );
}
