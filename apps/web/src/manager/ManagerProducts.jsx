// Product management in the back office (the design's P1): a search, stock
// filters, then a table on a wide screen and cards on a phone. A product
// opens in its editor (P2), which is also where it is deleted. The API client
// appends the ?tenant selection, so every call here is scoped to the store.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { handleApiError } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { productQuery } from '../core/query/queries';
import { editVariantsQuery, storeProductsQuery } from '../core/query/managerQueries';
import { markIfComplete, markLoaded } from '../core/imgFade';
import { money } from '../components/glow/GlowChrome';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';
import ProductEditorDialog from '../components/owner/ProductEditorDialog';
import ImportProductsDialog from '../components/owner/ImportProductsDialog';
import { Card } from '../core/primitives';
import { MTop } from './ManagerShell';
import { Glyph, ibtn, input } from './officeKit';
import { SkIn } from './officeSk';

// The stock filters the list can tell apart (P1). The design also counts
// hidden products, but a product has no visibility switch yet.
const LOW = 4;
const stockOf = (p) => Number(p.stock ?? p.quantity ?? 0);
const STOCK = {
  all: () => true,
  in: (p) => stockOf(p) > LOW,
  low: (p) => stockOf(p) > 0 && stockOf(p) <= LOW,
  out: (p) => stockOf(p) === 0,
};
// A table page on a wide screen; a phone shows this many cards at a time.
const PAGE = 20;
const SR_ONLY = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' };

export default function ManagerProducts() {
  const { t } = useTranslation('manager');
  const { t: tOwner } = useTranslation('owner');
  const { canManageStore, loading: authLoading } = useAuth();
  const { T } = useTK();
  const { isMobile, isDesktop } = useDevice();
  const qc = useQueryClient();
  // The list follows every save, delete and import on its own: each write
  // marks the cache stale and the list on display is read again.
  const list = useQuery({ ...storeProductsQuery(), enabled: !authLoading && canManageStore });
  const products = list.data?.products ?? null;
  const [error, setError] = useState(null);
  const shownError = error || (list.isError ? handleApiError(list.error) : null);
  const [editing, setEditing] = useState(null);   // product | 'new' | null
  const [query, setQuery] = useState('');
  const [stock, setStock] = useState('all');
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(PAGE);
  // The import is a page of its own (P3), so it lives in the URL: a phone's
  // back gesture returns to the list instead of leaving the products screen.
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const importing = params.get('import') === '1';
  // Only the search changes, so the window stays where it is, as it always
  // did (ScrollRestoration would otherwise take it to the top).
  const setImporting = (on) => {
    if (on) {
      setParams((p) => { const n = new URLSearchParams(p); n.set('import', '1'); return n; }, { state: { fromList: true }, preventScrollReset: true });
    } else if (location.state?.fromList) {
      navigate(-1);
    } else {
      setParams((p) => { const n = new URLSearchParams(p); n.delete('import'); return n; }, { replace: true, preventScrollReset: true });
    }
  };

  // Always hydrate the full detail before opening the editor: list rows carry
  // only id/title/price/thumbnail, and initializing the dialog from one would
  // save description:'' — silently erasing the real description. The editor
  // opens with its variants already read, so it arrives whole.
  const edit = async (p) => {
    try {
      const [detail] = await Promise.all([
        qc.fetchQuery(productQuery(p.id)),
        qc.prefetchQuery(editVariantsQuery(p.id)),
      ]);
      setEditing(detail);
    } catch (e) {
      setError(handleApiError(e));
    }
  };
  // Both are fetched as the pointer comes to the button, so the click finds them in.
  const ready = (p) => {
    qc.prefetchQuery(productQuery(p.id));
    qc.prefetchQuery(editVariantsQuery(p.id));
  };

  if (!authLoading && !canManageStore) {
    // Wrong store, or no membership: the API would 403 anyway; say it plainly.
    return (
      <div style={{ padding: 48, textAlign: 'center', font: `600 15px ${T.font}`, color: T.textDim }}>
        {t('admin.restricted')}
      </div>
    );
  }

  if (importing) {
    return <ImportProductsDialog onClose={() => setImporting(false)} />;
  }

  // The editor is a page too (P2), drawn in place of the list.
  if (editing !== null) {
    return (
      <ProductEditorDialog
        open
        product={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    );
  }

  // No products yet (P1's empty state): the two ways to start, side by side.
  if (products && products.length === 0) {
    const action = (primary) => ({
      height: 48, padding: '0 22px', borderRadius: 'var(--k-r-btn)', cursor: 'pointer', flex: 'none',
      font: `600 15px ${T.font}`, whiteSpace: 'nowrap', boxSizing: 'border-box',
      border: 0, background: primary ? T.grad : 'transparent', color: primary ? T.onAccent : T.text,
      boxShadow: primary ? 'none' : `inset 0 0 0 1.5px ${T.border}`,
    });
    return (
      <div>
        <MTop T={T} mode={isMobile ? 'mobile' : isDesktop ? 'desktop' : 'tablet'} title={t('products.title')} sub={tOwner('import.empty.sub')} />
        {shownError && <div style={{ marginBottom: 14, font: `500 13px ${T.font}`, color: T.danger }}>{shownError}</div>}
        <div style={{
          background: T.surface, border: 'var(--k-card-bd)', boxShadow: 'var(--k-card-sh)',
          borderRadius: 'var(--k-r-card)', padding: 22,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '32px 16px' }}>
            <span style={{ width: 96, height: 96, borderRadius: '50%', background: T.surface2, color: T.accentFg, display: 'grid', placeItems: 'center' }}>
              <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" fill="none" stroke="currentColor"
                strokeLinecap="round" strokeLinejoin="round" style={{ strokeWidth: 'var(--k-ic-w, 1.8)' }}>
                <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z" /><path d="m4 8.5 8 4.5 8-4.5M12 13v7" />
              </svg>
            </span>
            <h2 style={{ margin: 0, font: `700 20px/1.22 ${T.font}`, color: T.text, letterSpacing: '-0.015em' }}>
              {tOwner('import.empty.title')}
            </h2>
            <p style={{ margin: 0, maxWidth: 420, font: `400 14px/1.5 ${T.font}`, color: T.textDim }}>
              {tOwner('import.empty.body')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              <button type="button" onClick={() => setEditing('new')} style={action(true)}>{tOwner('import.empty.add')}</button>
              <button type="button" onClick={() => setImporting(true)} style={action(false)}>{tOwner('import.empty.import')}</button>
            </div>
          </div>
        </div>
        <ProductEditorDialog
          open={editing !== null}
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      </div>
    );
  }

  const btn = {
    padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
    background: T.grad, color: T.onAccent, font: `700 13px ${T.font}`,
  };
  // Import sits beside Add as the secondary of the pair: adding one product is
  // the common act, uploading a catalogue the occasional one.
  const ghost = {
    padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${T.border}`, background: 'transparent',
    color: T.textDim, font: `600 13px ${T.font}`,
  };

  // P1: a search, the stock filters, then a table on a wide screen and two
  // columns of cards on a phone. A row opens the product's editor, which is
  // also where a product is deleted.
  const needle = query.trim().toLowerCase();
  const matches = (products || []).filter((p) => !needle
    || String(p.title || '').toLowerCase().includes(needle)
    || String(p.category || '').toLowerCase().includes(needle));
  const counts = Object.fromEntries(Object.entries(STOCK).map(([k, test]) => [k, matches.filter(test).length]));
  const shown = matches.filter(STOCK[stock]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const at = Math.min(page, pages - 1);
  const rows = isMobile ? shown.slice(0, more) : shown.slice(at * PAGE, at * PAGE + PAGE);
  const stockText = (p) => {
    const n = stockOf(p);
    return n > 0 && n <= LOW ? t('products.left', { count: n }) : String(n);
  };
  const stockColor = (p) => {
    const n = stockOf(p);
    return n === 0 ? T.dangerFg : n <= LOW ? T.warnFg : T.text;
  };

  const th = { font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.07em', textAlign: 'left', padding: '12px 14px' };
  const td = { padding: '12px 14px', font: `500 13px ${T.font}`, color: T.text, borderTop: `1px solid ${T.border}` };
  const tdNum = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
  const pill = (on) => ({
    padding: '8px 13px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none',
    font: `600 12.5px ${T.font}`, background: on ? T.text : T.surface, color: on ? T.bg : T.textDim,
    border: `1px solid ${on ? T.text : T.border}`,
    transition: 'background-color var(--m-base) ease, color var(--m-base) ease, border-color var(--m-base) ease, transform var(--m-quick) var(--m-ease)',
  });
  const thumb = (p, size) => (
    // The photo fades in on its own tile once it has decoded.
    <span style={{
      display: 'block', flex: 'none', overflow: 'hidden', background: T.surface2,
      ...(size ? { width: size, height: size, borderRadius: 10 } : { aspectRatio: '4 / 3', borderRadius: 'var(--k-r-img, 12px)' }),
    }}>
      {p.thumbnail && (
        <img
          src={p.thumbnail} alt="" className="esy-img" ref={markIfComplete} onLoad={markLoaded}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </span>
  );
  const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  const pagerBtn = (off) => ({
    height: 36, padding: '0 12px', borderRadius: 999, cursor: off ? 'default' : 'pointer',
    border: `1px solid ${T.border}`, background: T.surface, color: off ? T.textMute : T.text,
    font: `600 12.5px ${T.font}`, display: 'inline-flex', alignItems: 'center', gap: 4, opacity: off ? 0.6 : 1,
  });
  const head = (
    <thead>
      <tr>
        <th style={th}>{t('products.colProduct')}</th>
        {isDesktop && <th style={th}>{t('products.colCategory')}</th>}
        <th style={{ ...th, textAlign: 'right' }}>{t('products.colPrice')}</th>
        <th style={{ ...th, textAlign: 'right' }}>{t('products.colStock')}</th>
        <th style={{ ...th, width: 1 }}><span style={SR_ONLY}>{t('products.colAction')}</span></th>
      </tr>
    </thead>
  );

  return (
    <div>
      {/* The title is the shell's header bar; the two actions sit at its end. */}
      <MTop
        T={T} title={t('products.title')}
        right={(
          <>
            {!isMobile && <button onClick={() => setImporting(true)} className="esy-press" style={ghost}>{t('products.importCta')}</button>}
            <button onClick={() => setEditing('new')} className="esy-press" style={btn}>{t('products.add')}</button>
          </>
        )}
      />

      {shownError && <div style={{ marginBottom: 12, font: `500 13px ${T.font}`, color: T.danger }}>{shownError}</div>}

      <label style={{ position: 'relative', display: 'flex', alignItems: 'center', maxWidth: isMobile ? 'none' : 380, marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 14, display: 'inline-flex', color: T.textMute, pointerEvents: 'none' }}>
          <Glyph size={18}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Glyph>
        </span>
        <input
          value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); setMore(PAGE); }}
          placeholder={t('products.search')} aria-label={t('products.search')}
          style={{ ...input(T), width: '100%', paddingLeft: 42 }}
        />
      </label>

      <div role="group" aria-label={t('products.stockFilter')} style={{ display: 'flex', gap: 7, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {Object.keys(STOCK).map((k) => (
          <button
            key={k} type="button" aria-pressed={stock === k} className="esy-press" style={pill(stock === k)}
            onClick={() => { setStock(k); setPage(0); setMore(PAGE); }}
          >{t(`products.stock.${k}`, { count: products ? counts[k] : 0 })}</button>
        ))}
      </div>

      {/* The list's own shape until the catalogue is in. */}
      {list.isPending && (
        <Skeleton label={t('loading.products', { ns: 'common' })}>
          {isMobile ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Sk h={undefined} r={12} style={{ aspectRatio: '4 / 3', height: 'auto' }} />
                  <SkIn w="70%" /><SkIn w="45%" />
                </div>
              ))}
            </div>
          ) : (
            <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {head}
                <tbody>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Sk w={44} h={44} r={10} /><SkIn w={140} /></div></td>
                      {isDesktop && <td style={td}><SkIn w={80} /></td>}
                      <td style={tdNum}><SkIn w={56} /></td>
                      <td style={tdNum}><SkIn w={24} /></td>
                      <td style={{ ...td, width: 1 }}><Sk w={36} h={36} r={10} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </Skeleton>
      )}

      {products && shown.length === 0 && (
        <div style={{ padding: '32px 16px', textAlign: 'center', font: `500 14px ${T.font}`, color: T.textDim }}>
          {t('products.noMatch')}
        </div>
      )}

      {products && shown.length > 0 && (isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {rows.map((p) => (
              <button
                key={p.id} type="button" className="esy-press" aria-label={t('products.editOne', { name: p.title })}
                onClick={() => edit(p)} onPointerEnter={() => ready(p)} onFocus={() => ready(p)}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 0, border: 0, background: 'none', color: T.text, textAlign: 'left', cursor: 'pointer', minWidth: 0 }}
              >
                {thumb(p)}
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 4px', minWidth: 0 }}>
                  <span style={{ font: `600 13px/1.3 ${T.font}`, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</span>
                  <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <b style={{ font: `700 13px ${T.font}`, whiteSpace: 'nowrap' }}>{money(p.price)}</b>
                    <span style={{ font: `500 12px ${T.font}`, color: stockColor(p), ...ellipsis }}>{stockText(p)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
          {shown.length > more && (
            <button type="button" className="esy-press" onClick={() => setMore((m) => m + PAGE)} style={{ ...ghost, width: '100%', height: 48, color: T.text }}>
              {t('products.showMore')}
            </button>
          )}
        </div>
      ) : (
        <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {head}
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        {thumb(p, 44)}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ font: `600 13.5px ${T.font}`, color: T.text, ...ellipsis }}>{p.title}</div>
                          {/* A tablet has no category column, so the line under the name carries it. */}
                          {!isDesktop && p.category && <div style={{ font: `400 12px ${T.font}`, color: T.textDim, ...ellipsis }}>{p.category}</div>}
                        </div>
                      </div>
                    </td>
                    {isDesktop && <td style={{ ...td, color: T.textDim }}>{p.category || '—'}</td>}
                    <td style={{ ...tdNum, fontWeight: 700 }}>{money(p.price)}</td>
                    <td style={{ ...tdNum, color: stockColor(p) }}>{stockText(p)}</td>
                    <td style={{ ...td, width: 1, paddingLeft: 4, textAlign: 'right' }}>
                      <button
                        type="button" className="esy-press" aria-label={t('products.editOne', { name: p.title })}
                        onClick={() => edit(p)} onPointerEnter={() => ready(p)} onFocus={() => ready(p)}
                        style={{ ...ibtn(T), width: 36, height: 36 }}
                      >
                        <Glyph size={18}><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></Glyph>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {shown.length > PAGE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', borderTop: `1px solid ${T.border}` }}>
              <span style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>
                {t('products.range', { from: at * PAGE + 1, to: Math.min(shown.length, at * PAGE + PAGE), total: shown.length })}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" disabled={at === 0} onClick={() => setPage(at - 1)} style={pagerBtn(at === 0)}>{t('products.prev')}</button>
                <button type="button" disabled={at >= pages - 1} onClick={() => setPage(at + 1)} style={pagerBtn(at >= pages - 1)}>{t('products.next')}</button>
              </div>
            </div>
          )}
        </Card>
      ))}

      <ProductEditorDialog
        open={editing !== null}
        product={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    </div>
  );
}
