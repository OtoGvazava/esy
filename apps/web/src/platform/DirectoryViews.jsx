// The store directory's four views (the design's L1, L1b, L1c and L1d) and the
// switch between them. The shopper picks one; DisplayPrefsContext keeps it.
//
//   photos   the store's newest product photos lead the card
//   compact  no picture on top: name, a line about the store, small photos
//   list     one row per store
//   cover    the cover photo the owner uploaded, the logo over its edge
//
// A store's own colour is drawn on its mark only (and not at all once it has a
// logo), so a page of stores reads as their products rather than as a wall of
// coloured bands. Every view says what it draws when a store has fewer photos,
// or no cover: a card never leaves a hole.
/* eslint-disable react-refresh/only-export-components */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { StoreMark } from './PlatformShared';
import { storeInitials } from './platformData';
import { STORE_VIEWS } from '../core/display/prefs';
import { useIndicator } from '../core/useIndicator';
import { markIfComplete, markLoaded } from '../core/imgFade';

const ONE_LINE = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

// The switch's glyphs, as the boards draw them.
const VIEW_PATHS = {
  photos: <><rect x="3.5" y="4.5" width="10" height="15" rx="2" /><rect x="15.5" y="4.5" width="5" height="6.5" rx="1.5" /><rect x="15.5" y="13" width="5" height="6.5" rx="1.5" /></>,
  compact: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  list: <><rect x="4" y="5" width="5" height="5" rx="1.2" /><rect x="4" y="14" width="5" height="5" rx="1.2" /><path d="M12 7.5h8M12 16.5h8" /></>,
  cover: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M3.5 11h17M7 15.5h6" /></>,
};

function Stroke({ size = 18, children }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      {children}
    </svg>
  );
}

/** Columns for a view on a device: the cards with a picture are wider than the compact ones. */
export function viewColumns(view, dev) {
  if (view === 'list') return 1;
  if (dev.ph) return 1;
  if (dev.tab) return 2;
  return view === 'compact' ? 4 : 3;
}

/**
 * The view switch, beside the sort control and at its height: a radio group,
 * so Tab stops on the chosen view and the arrows move it.
 */
export function StoresViewSwitch({ T, t, view, onPick }) {
  const well = useRef(null);
  const refs = useRef([]);
  const ind = useIndicator(well, view);
  const onKey = (e, i) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const j = (i + step + STORE_VIEWS.length) % STORE_VIEWS.length;
    onPick(STORE_VIEWS[j]);
    refs.current[j]?.focus();
  };
  return (
    <div
      ref={well} role="radiogroup" aria-label={t('directory.view.label')}
      style={{
        position: 'relative', display: 'flex', gap: 2, padding: 4, height: 52, boxSizing: 'border-box', flex: 'none',
        borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`,
      }}
    >
      <span aria-hidden="true" className="esy-ind" data-still={ind.still || undefined} style={{ ...ind.style, borderRadius: 10, background: T.surface2 }} />
      {STORE_VIEWS.map((v, i) => {
        const on = v === view;
        const name = t(`directory.view.${v}`);
        return (
          <button
            key={v} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on}
            aria-label={name} title={name} tabIndex={on ? 0 : -1} data-ind={v}
            onClick={() => onPick(v)} onKeyDown={(e) => onKey(e, i)}
            style={{
              position: 'relative', zIndex: 1, flex: 'none', width: 44, height: '100%', padding: 0, border: 0,
              borderRadius: 10, background: 'transparent', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: on ? T.text : T.textDim,
            }}
          >
            <Stroke>{VIEW_PATHS[v]}</Stroke>
          </button>
        );
      })}
    </div>
  );
}

// ─── What every view draws ──────────────────────────────────────────────────

/** A store's product photos that load, newest first, at most three. */
function useShown(list) {
  const [failed, setFailed] = useState(() => new Set());
  const shown = (Array.isArray(list) ? list : []).filter((src) => src && !failed.has(src)).slice(0, 3);
  const fail = (src) => setFailed((f) => new Set(f).add(src));
  return [shown, fail];
}

// Every photo fades in once it has decoded (core/imgFade.js).
function Shot({ src, onFail, style }) {
  return (
    <img
      src={src} alt="" loading="lazy" decoding="async" onError={() => onFail(src)}
      className="esy-img" ref={markIfComplete} onLoad={markLoaded}
      style={{ display: 'block', width: '100%', height: '100%', minWidth: 0, minHeight: 0, objectFit: 'cover', ...style }}
    />
  );
}

const cardStyle = (T) => ({
  background: T.surface, borderRadius: 18, border: `1px solid ${T.border}`,
  boxShadow: T.dark ? 'none' : '0 4px 18px rgba(20,20,60,0.04)',
  display: 'flex', flexDirection: 'column', minWidth: 0, textDecoration: 'none', color: 'inherit',
});

const blurbOf = (store, t) => store.tagline || store.description || t('directory.anIndependentShop');
const categoryOf = (store, t) => (store.category ? t(`directory.cat.${store.category}`) : t('directory.shop'));
const hostOf = (store) => `${store.subdomain}.esy.ge`;
const pathOf = (store) => `/stores/${store.subdomain}`;

/** The store's name and, once an admin has verified it, the tick. */
function Name({ T, t, store, size = 14.5 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span style={{ font: `700 ${size}px ${T.font}`, color: T.text, letterSpacing: '-0.02em', ...ONE_LINE }}>{store.name}</span>
      {store.verifiedAt && (
        <svg viewBox="0 0 24 24" width="15" height="15" role="img" aria-label={t('directory.verified')} style={{ flex: 'none' }}>
          <circle cx="12" cy="12" r="10" fill={T.accent} />
          <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke={T.onAccent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function Host({ T, children }) {
  return <div style={{ font: `500 11px ${T.mono}`, color: T.textMute, marginTop: 1, ...ONE_LINE }}>{children}</div>;
}

function Blurb({ T, t, store, lines = 2 }) {
  if (lines === 1) return <div style={{ font: `400 13px/1.45 ${T.font}`, color: T.textDim, ...ONE_LINE }}>{blurbOf(store, t)}</div>;
  return (
    <div style={{
      font: `400 13px/1.45 ${T.font}`, color: T.textDim, minHeight: 38,
      display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
    }}>{blurbOf(store, t)}</div>
  );
}

function Visit({ T, t, bare = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 'none', font: `700 12px ${T.font}`, color: T.accentFg }}>
      {!bare && t('directory.visit')}
      <Stroke size={13}><path d="M5 12h14m-5-6 6 6-6 6" /></Stroke>
    </span>
  );
}

/** The card's last line: what the store sells, and the way in. */
function Foot({ T, t, store }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
      <span style={{ minWidth: 0, font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.06em', ...ONE_LINE }}>{categoryOf(store, t)}</span>
      <Visit T={T} t={t} />
    </div>
  );
}

/** Small square photos in a row (compact cards, list rows); nothing for a store with none. */
function Thumbs({ T, store, size }) {
  const [shown, fail] = useShown(store.productPhotos);
  if (!shown.length) return null;
  return (
    <div aria-hidden="true" style={{ display: 'flex', gap: 6, flex: 'none' }}>
      {shown.map((src, i) => (
        <Shot key={`${i}:${src}`} src={src} onFail={fail} style={{ width: size, height: size, borderRadius: 10, background: T.surface2, flex: 'none' }} />
      ))}
    </div>
  );
}

// ─── Photos ─────────────────────────────────────────────────────────────────

// Three photos: one large and two small. Fewer: side by side. None: the
// store's initials on a quiet tile, never its colour.
function Mosaic({ T, store, height }) {
  const [shown, fail] = useShown(store.productPhotos);
  const box = { height, borderRadius: 11, overflow: 'hidden', background: T.surface2, flex: 'none' };
  if (shown.length >= 3) {
    return (
      <div aria-hidden="true" style={{ ...box, display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 3 }}>
        <Shot src={shown[0]} onFail={fail} style={{ gridRow: 'span 2' }} />
        <Shot src={shown[1]} onFail={fail} />
        <Shot src={shown[2]} onFail={fail} />
      </div>
    );
  }
  if (shown.length) {
    return (
      <div aria-hidden="true" style={{ ...box, display: 'grid', gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))`, gap: 3 }}>
        {shown.map((src, i) => <Shot key={`${i}:${src}`} src={src} onFail={fail} />)}
      </div>
    );
  }
  return (
    <div aria-hidden="true" style={{ ...box, display: 'grid', placeItems: 'center', font: `700 30px ${T.font}`, letterSpacing: '-0.04em', color: T.textMute }}>
      {storeInitials(store)}
    </div>
  );
}

function PhotosCard({ T, t, store }) {
  return (
    <Link to={pathOf(store)} style={{ ...cardStyle(T), padding: 10 }}>
      <Mosaic T={T} store={store} height={150} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, padding: '12px 6px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StoreMark store={store} size={36} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Name T={T} t={t} store={store} />
            <Host T={T}>{hostOf(store)}</Host>
          </div>
        </div>
        <Blurb T={T} t={t} store={store} />
        <Foot T={T} t={t} store={store} />
      </div>
    </Link>
  );
}

// ─── Compact ────────────────────────────────────────────────────────────────

function CompactCard({ T, t, store }) {
  return (
    <Link to={pathOf(store)} style={{ ...cardStyle(T), padding: 16, gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StoreMark store={store} size={40} radius={11} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Name T={T} t={t} store={store} size={15} />
          <div style={{ font: `400 12px ${T.font}`, color: T.textMute, marginTop: 2, ...ONE_LINE }}>{`${categoryOf(store, t)} · ${hostOf(store)}`}</div>
        </div>
      </div>
      <Blurb T={T} t={t} store={store} />
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
        <Thumbs T={T} store={store} size={48} />
        <span style={{ marginLeft: 'auto', paddingBottom: 2 }}><Visit T={T} t={t} /></span>
      </div>
    </Link>
  );
}

// ─── List ───────────────────────────────────────────────────────────────────

// A phone keeps the mark, the name and the way in; wider screens add the line
// about the store and its photos, and a desktop the category too.
function ListRow({ T, t, store, dev, first }) {
  return (
    <Link to={pathOf(store)} style={{
      display: 'flex', alignItems: 'center', gap: dev.ph ? 12 : 18, minHeight: 72, boxSizing: 'border-box',
      padding: dev.ph ? '12px 14px' : '12px 18px', borderTop: first ? 'none' : `1px solid ${T.border}`,
      textDecoration: 'none', color: 'inherit',
    }}>
      <StoreMark store={store} size={44} radius={12} />
      <div style={{ flex: dev.desk ? '0 0 240px' : '1 1 0', minWidth: 0 }}>
        <Name T={T} t={t} store={store} size={15} />
        <Host T={T}>{hostOf(store)}</Host>
      </div>
      {!dev.ph && <div style={{ flex: '1.4 1 0', minWidth: 0 }}><Blurb T={T} t={t} store={store} lines={1} /></div>}
      {dev.desk && (
        <div style={{ flex: '0 0 124px', minWidth: 0 }}>
          <span style={{
            display: 'inline-block', maxWidth: '100%', boxSizing: 'border-box', padding: '4px 10px', borderRadius: 999,
            border: `1px solid ${T.border}`, font: `600 11.5px ${T.font}`, color: T.textDim, ...ONE_LINE,
          }}>{categoryOf(store, t)}</span>
        </div>
      )}
      {!dev.ph && <div style={{ flex: '0 0 138px' }}><Thumbs T={T} store={store} size={42} /></div>}
      <Visit T={T} t={t} bare={dev.ph} />
    </Link>
  );
}

// ─── Cover ──────────────────────────────────────────────────────────────────

// The owner's cover photo. Without one: the store's product photos side by
// side, and without those a plain band.
function Band({ T, store }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [shown, fail] = useShown(store.productPhotos);
  const box = { height: 104, background: T.surface2, flex: 'none' };
  if (store.coverUrl && !coverFailed) {
    return <div aria-hidden="true" style={box}><Shot src={store.coverUrl} onFail={() => setCoverFailed(true)} /></div>;
  }
  if (shown.length) {
    return (
      <div aria-hidden="true" style={{ ...box, display: 'grid', gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))`, gap: 2 }}>
        {shown.map((src, i) => <Shot key={`${i}:${src}`} src={src} onFail={fail} />)}
      </div>
    );
  }
  return <div aria-hidden="true" style={box} />;
}

function CoverCard({ T, t, store }) {
  return (
    <Link to={pathOf(store)} style={{ ...cardStyle(T), overflow: 'hidden' }}>
      <Band T={T} store={store} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, padding: '0 16px 16px' }}>
        <span style={{ alignSelf: 'flex-start', marginTop: -24, position: 'relative', display: 'inline-flex', borderRadius: 14, boxShadow: `0 0 0 3px ${T.surface}` }}>
          <StoreMark store={store} size={48} radius={14} />
        </span>
        <div style={{ minWidth: 0 }}>
          <Name T={T} t={t} store={store} size={15.5} />
          <Host T={T}>{hostOf(store)}</Host>
        </div>
        <Blurb T={T} t={t} store={store} />
        <Foot T={T} t={t} store={store} />
      </div>
    </Link>
  );
}

// ─── The page's list ────────────────────────────────────────────────────────

const CARDS = { photos: PhotosCard, compact: CompactCard, cover: CoverCard };

const gridStyle = (cols, dev) => ({
  display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: dev.desk ? 18 : 14,
});

const listStyle = (T) => ({
  background: T.surface, borderRadius: 18, border: `1px solid ${T.border}`, overflow: 'hidden',
  boxShadow: T.dark ? 'none' : '0 4px 18px rgba(20,20,60,0.04)',
});

/** The stores, drawn in the view chosen. `dev` is usePDevice()'s { ph, tab, desk }. */
export function StoreList({ T, t, view, stores, dev }) {
  if (view === 'list') {
    return (
      <div style={listStyle(T)}>
        {stores.map((s, i) => <ListRow key={s.subdomain} T={T} t={t} store={s} dev={dev} first={i === 0} />)}
      </div>
    );
  }
  const Card = CARDS[view] || PhotosCard;
  return (
    <div style={gridStyle(viewColumns(view, dev), dev)}>
      {stores.map((s) => <Card key={s.subdomain} T={T} t={t} store={s} />)}
    </div>
  );
}

// ─── While the stores load ──────────────────────────────────────────────────

function Bar({ T, w, h = 10 }) {
  return <div style={{ width: w, height: h, borderRadius: 6, background: T.surface2 }} />;
}

function HeadBars({ T, size }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: size, height: size, borderRadius: 11, background: T.surface2, flex: 'none' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Bar T={T} w="60%" h={12} />
        <Bar T={T} w="40%" h={8} />
      </div>
    </div>
  );
}

/** The chosen view's shape, so the page does not jump when the stores arrive. */
export function StoreListSkeleton({ T, view, dev }) {
  const pulse = { animation: 'pfpulse 1.6s ease-in-out infinite' };
  const keyframes = <style>{'@keyframes pfpulse{0%,100%{opacity:1}50%{opacity:.45}}'}</style>;
  if (view === 'list') {
    return (
      <div style={{ ...listStyle(T), ...pulse }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ minHeight: 72, boxSizing: 'border-box', padding: dev.ph ? '14px' : '14px 18px', borderTop: i ? `1px solid ${T.border}` : 'none' }}>
            <HeadBars T={T} size={44} />
          </div>
        ))}
        {keyframes}
      </div>
    );
  }
  const cols = viewColumns(view, dev);
  return (
    <div style={{ ...gridStyle(cols, dev), ...pulse }}>
      {Array.from({ length: dev.ph ? 3 : cols * 2 }).map((_, i) => (
        <div key={i} style={{ ...cardStyle(T), overflow: 'hidden', padding: view === 'cover' ? 0 : view === 'photos' ? 10 : 16 }}>
          {view === 'photos' && <div style={{ height: 150, borderRadius: 11, background: T.surface2 }} />}
          {view === 'cover' && <div style={{ height: 104, background: T.surface2 }} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: view === 'cover' ? 16 : view === 'photos' ? '12px 6px 6px' : 0 }}>
            <HeadBars T={T} size={view === 'compact' ? 40 : 36} />
            <Bar T={T} w="92%" />
            <Bar T={T} w="70%" />
            {view === 'compact' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map((k) => <div key={k} style={{ width: 48, height: 48, borderRadius: 10, background: T.surface2 }} />)}
              </div>
            )}
          </div>
        </div>
      ))}
      {keyframes}
    </div>
  );
}
