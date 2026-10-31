// <store>/?category=<name> — one category's collection (the design's A3).
//
// The filters are the ones the data holds: price, in stock, and the variant
// options the category's products are made in (their merchant-named axes,
// D11). The board also draws glaze swatches, sizes and "made to order"; glaze
// and size arrive here as option pills when a store's variants carry them,
// and nothing in the model says "made to order", so that one is left out.
//
// Every filter lives in the URL, so back and forward step through them and a
// shared link opens the same collection. A change is written to the URL once
// it is settled — a field when it loses focus, a slider thumb when it is let
// go — so the history holds choices rather than every pixel of a drag.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { productApi, handleApiError } from '../utils/api';
import { useCart } from '../contexts/CartContext';
import { useDevice } from '../contexts/DeviceContext';
import { useGlow } from '../styles/glow';
import { useDesign } from '../core/design/useDesign';
import { money } from '../core/money';
import { track } from '../core/tokens';
import GlowProductCard from '../components/glow/GlowProductCard';
import GlowLoadMore from '../components/glow/GlowLoadMore';
import { HeadButton, MenuStrip } from '../components/store/StoreMenus';
import { useStoreBarShown } from '../components/store/storeChrome';
import { useStoreCategories } from '../hooks/useStoreCategories';
import {
  CheckRow, FilterChip, FilterSheet, Glyph, LinkButton, OptionPills, PATHS, PriceFilter,
  SectionTitle, SortMenu, pillStyle,
} from '../components/store/CollectionFilters';

const PAGE_SIZE = 24;

const SORTS = {
  new: { sortBy: 'id', sortDir: 'desc', key: 'new' },
  'price-asc': { sortBy: 'price', sortDir: 'asc', key: 'priceAsc' },
  'price-desc': { sortBy: 'price', sortDir: 'desc', key: 'priceDesc' },
};

// The query keys this page owns. Anything else in the URL is left as it is.
const OWN = ['category', 'min', 'max', 'stock', 'o', 'sort'];

const priceParam = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** The filters as the URL states them. */
function readFilters(params) {
  const opts = {};
  params.getAll('o').forEach((raw) => {
    const at = raw.indexOf(':');
    if (at <= 0) return;
    const axis = raw.slice(0, at).trim();
    const value = raw.slice(at + 1).trim();
    if (!axis || !value) return;
    if (!opts[axis]) opts[axis] = [];
    if (!opts[axis].some((v) => v.toLowerCase() === value.toLowerCase())) opts[axis].push(value);
  });
  const sort = params.get('sort');
  return {
    category: (params.get('category') || '').trim(),
    min: priceParam(params.get('min')),
    max: priceParam(params.get('max')),
    stock: params.get('stock') === '1',
    opts,
    sort: SORTS[sort] ? sort : 'new',
  };
}

/** `prev` with this page's keys replaced by `f`, in one fixed order. */
function writeFilters(prev, f) {
  const next = new URLSearchParams(prev);
  OWN.forEach((k) => next.delete(k));
  if (f.category) next.set('category', f.category);
  if (f.min != null) next.set('min', String(f.min));
  if (f.max != null) next.set('max', String(f.max));
  if (f.stock) next.set('stock', '1');
  Object.entries(f.opts).forEach(([axis, values]) => values.forEach((v) => next.append('o', `${axis}:${v}`)));
  if (f.sort && f.sort !== 'new') next.set('sort', f.sort);
  return next;
}

export default function Collection() {
  const { T, tenant } = useGlow();
  const { isMobile, isTablet, isDesktop } = useDevice();
  // Where StoreBar is the header (desktop) it carries the store; elsewhere this
  // page draws the design's back-and-share bar.
  const ownHeader = !useStoreBarShown();
  const design = useDesign();
  const { t, i18n } = useTranslation('storefront');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { addToCart } = useCart();

  const f = useMemo(() => readFilters(params), [params]);
  const { categories } = useStoreCategories();
  // The URL may spell it in another case; the store's own spelling is the title.
  const name = categories.find((c) => c.name.toLowerCase() === f.category.toLowerCase())?.name || f.category;

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [facets, setFacets] = useState([]);
  const [bounds, setBounds] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const sheetButton = useRef(null);
  const sentinel = useRef(null);
  const abortRef = useRef(null);
  const busyRef = useRef(false);
  const copiedTimer = useRef(null);
  // Where this collection was entered from, in the tab's history: the back
  // button returns there however many filter changes have been pushed since.
  const [entryIdx] = useState(() => window.history.state?.idx ?? null);

  const query = JSON.stringify({
    category: f.category, minPrice: f.min, maxPrice: f.max, inStock: f.stock, options: f.opts,
    sortBy: SORTS[f.sort].sortBy, sortDir: SORTS[f.sort].sortDir,
  });

  const fetchPage = useCallback(async (pageNum, q) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    busyRef.current = true;
    setLoading(true);
    setError('');
    try {
      const res = await productApi.collection({ ...q, page: pageNum, size: PAGE_SIZE, signal: ac.signal });
      if (ac.signal.aborted) return;
      setProducts((prev) => (pageNum === 0 ? res.products : [...prev, ...res.products]));
      setTotal(res.totalElements);
      setHasMore(res.hasMore);
      setPage(pageNum);
    } catch (e) {
      if (ac.signal.aborted || e?.name === 'AbortError') return;
      setError(handleApiError(e, t('collection.failed')));
      setHasMore(false);
    } finally {
      if (abortRef.current === ac) {
        busyRef.current = false;
        setLoading(false);
      }
    }
  }, [t]);

  // A new set of filters starts again from the first page.
  useEffect(() => {
    setProducts([]);
    setHasMore(false);
    fetchPage(0, JSON.parse(query));
  }, [query, fetchPage]);

  useEffect(() => () => {
    abortRef.current?.abort();
    clearTimeout(copiedTimer.current);
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !busyRef.current) fetchPage(page + 1, JSON.parse(query));
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, page, query, fetchPage]);

  // What the category offers to filter by: its variant options, and the span
  // of its prices for the slider (its cheapest and its dearest product).
  useEffect(() => {
    setFacets([]);
    setBounds(null);
    if (!f.category) return undefined;
    const ac = new AbortController();
    productApi.optionFacets(f.category, { signal: ac.signal })
      .then((rows) => {
        if (!ac.signal.aborted) setFacets(Array.isArray(rows) ? rows.filter((r) => r?.name && r.values?.length) : []);
      })
      .catch(() => {});
    const edge = (sortDir) => productApi
      .collection({ category: f.category, size: 1, sortBy: 'price', sortDir, signal: ac.signal })
      .then((r) => r.products[0]?.price);
    Promise.all([edge('asc'), edge('desc')])
      .then(([lo, hi]) => {
        if (!ac.signal.aborted && lo != null && hi != null) setBounds({ lo: Number(lo), hi: Number(hi) });
      })
      .catch(() => {});
    return () => ac.abort();
  }, [f.category]);

  const apply = useCallback((patch) => {
    setParams((prev) => writeFilters(prev, { ...readFilters(prev), ...patch }));
  }, [setParams]);
  // Stable, because the sheet moves focus in whenever its close handler changes.
  const closeSheet = useCallback(() => setSheet(false), []);

  const setPrice = (min, max) => {
    if (min === f.min && max === f.max) return;
    apply({ min, max });
  };
  const toggleOption = (axis, value) => {
    const opts = { ...f.opts };
    const have = opts[axis] || [];
    const on = have.some((v) => v.toLowerCase() === value.toLowerCase());
    const next = on ? have.filter((v) => v.toLowerCase() !== value.toLowerCase()) : [...have, value];
    if (next.length) opts[axis] = next;
    else delete opts[axis];
    apply({ opts });
  };
  const clearAll = () => apply({ min: null, max: null, stock: false, opts: {} });

  const chips = [];
  if (f.min != null || f.max != null) {
    const label = f.min != null && f.max != null
      ? t('collection.chipRange', { min: money(f.min), max: money(f.max) })
      : f.min != null ? t('collection.chipFrom', { min: money(f.min) }) : t('collection.chipUpTo', { max: money(f.max) });
    chips.push({ key: 'price', label, aria: t('collection.removePrice'), remove: () => apply({ min: null, max: null }) });
  }
  if (f.stock) {
    chips.push({ key: 'stock', label: t('collection.inStock'), aria: t('collection.removeStock'), remove: () => apply({ stock: false }) });
  }
  Object.entries(f.opts).forEach(([axis, values]) => values.forEach((v) => {
    const label = `${axis} ${v}`;
    chips.push({ key: `o:${axis}:${v}`, label, aria: t('collection.removeOption', { label }), remove: () => toggleOption(axis, v) });
  }));
  const filtered = chips.length > 0;

  const goBack = () => {
    const now = window.history.state?.idx;
    if (entryIdx != null && now != null && entryIdx > 0) navigate(-(now - entryIdx + 1));
    else navigate('/');
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch { /* the shopper closed the share sheet */ }
  };

  const handleAdd = (p) => (p.hasVariants
    // A product sold in sizes is chosen on its page; added from here it would
    // reach checkout without a combination and be refused there (D11).
    ? navigate(`/product/${p.id}`)
    : addToCart({ id: p.id, title: p.title, price: p.price, image: p.image, thumbnail: p.thumbnail }));
  const openProduct = (p) => navigate(`/product/${p.id}`);

  const gutter = isMobile ? 16 : 40;
  // A count is only said once there is one: "0 items" during the first load
  // reads as an empty collection.
  const counted = !loading || products.length > 0;
  const layout = design.productLayout;
  const COLS = { grid2: [2, 3, 4], grid3: [3, 4, 6], feed: [1, 2, 3], list: [1, 2, 2] }[layout] || [2, 3, 4];
  // The desktop grid shares the row with the filter column, so it is one narrower.
  const cols = isDesktop ? Math.max(1, COLS[2] - 1) : COLS[isTablet ? 1 : 0];
  const gridGap = layout === 'grid3' ? 3 : layout === 'feed' ? 18 : layout === 'list' ? 10 : isMobile ? 12 : 16;
  const countText = t('collection.count', { count: total });
  const sortOptions = Object.entries(SORTS).map(([id, s]) => ({ id, label: t(`collection.sort.${s.key}`) }));

  const sort = (
    <SortMenu
      T={T} value={f.sort} options={sortOptions} align={isDesktop ? 'right' : 'left'}
      pillLabel={(label) => t('collection.sortLabel', { option: label })}
      menuLabel={t('collection.sortMenu')} onChange={(id) => apply({ sort: id })}
    />
  );

  const chipRow = (withClear) => (
    <div role="group" aria-label={t('collection.activeFilters')} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 }}>
      {chips.map((c) => <FilterChip key={c.key} T={T} label={c.label} aria={c.aria} onRemove={c.remove} />)}
      {withClear && <LinkButton T={T} onClick={clearAll} style={{ marginLeft: 4 }}>{t('collection.clear')}</LinkButton>}
    </div>
  );

  // The filter column on a desktop, the sheet's body elsewhere.
  const panel = (inSheet) => (
    <>
      {bounds && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionTitle T={T}>{t('collection.price')}</SectionTitle>
          <PriceFilter
            T={T} bounds={bounds} min={f.min} max={f.max} onCommit={setPrice}
            labels={{
              min: t('collection.priceMin'), max: t('collection.priceMax'),
              minSlider: t('collection.priceMin'), maxSlider: t('collection.priceMax'),
            }}
          />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <SectionTitle T={T}>{t('collection.availability')}</SectionTitle>
        <CheckRow T={T} on={f.stock} onChange={(on) => apply({ stock: on })} label={t('collection.inStock')} />
      </div>
      {facets.map((facet) => (
        <OptionPills
          key={facet.name} T={T} name={facet.name} values={facet.values} onSurface={inSheet}
          chosen={Object.entries(f.opts).find(([axis]) => axis.toLowerCase() === facet.name.toLowerCase())?.[1] || []}
          onToggle={(v) => {
            // Keep the spelling already in the URL for this axis, if any.
            const axis = Object.keys(f.opts).find((a) => a.toLowerCase() === facet.name.toLowerCase()) || facet.name;
            toggleOption(axis, v);
          }}
        />
      ))}
    </>
  );

  const primaryButton = {
    flex: 1, minWidth: 0, height: 48, padding: '0 22px', border: 0, cursor: 'pointer',
    borderRadius: 'var(--k-r-btn)', background: T.grad, color: T.onAccent,
    font: `600 15px ${T.font}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  };

  const empty = !loading && !error && products.length === 0;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.page, color: T.text, font: `400 14px ${T.font}`, paddingBottom: 120 }}>
      {/* Top tabs and the side menu belong to the store header, which this page
          does not draw, so they come as the strip every other page has. */}
      {ownHeader && (design.menu === 'top' || design.menu === 'drawer') && <MenuStrip kind={design.menu} />}

      {ownHeader ? (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: `${isMobile ? 18 : 24}px ${gutter}px 6px` }}>
          <HeadButton label={t('collection.back')} onClick={goBack}>
            <Glyph><path d={PATHS.back} /></Glyph>
          </HeadButton>
          <h1 style={{
            flex: 1, minWidth: 0, margin: 0, textAlign: 'center', color: T.text,
            font: '600 16px/1.3 var(--k-font-d)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{name}</h1>
          <HeadButton label={t('collection.share')} onClick={share}>
            <Glyph>
              <circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" />
              <path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" />
            </Glyph>
          </HeadButton>
          <span role="status" style={{
            position: 'absolute', right: gutter, top: '100%', zIndex: 5, padding: copied ? '6px 12px' : 0,
            borderRadius: 'var(--k-r-pill)', background: copied ? T.text : 'transparent', color: T.bg,
            font: `600 12px ${T.font}`, whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>{copied ? t('collection.copied') : ''}</span>
        </div>
      ) : (
        <div style={{ padding: `24px ${gutter}px 0` }}>
          <nav aria-label={t('collection.breadcrumb')} style={{ font: `400 12.5px ${T.font}`, color: T.textDim }}>
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>{t('collection.shop')}</Link>
            <span aria-hidden="true">{' / '}</span>
            <span aria-current="page">{name}</span>
          </nav>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h1 style={{
              margin: 0, minWidth: 0, color: T.text, font: 'var(--k-w-t) 30px/1.15 var(--k-font-d)',
              letterSpacing: track(i18n.language, '-0.02em'),
            }}>
              {name}
              {counted && <span style={{ color: T.textDim, fontWeight: 400 }}>{` · ${total}`}</span>}
            </h1>
            {sort}
          </div>
        </div>
      )}

      {/* Phone and tablet: the filter and sort pills, then what is active. */}
      {!isDesktop && (
        <div style={{ padding: `8px ${gutter}px 0`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, rowGap: 8 }}>
            <button
              ref={sheetButton} type="button" aria-haspopup="dialog" aria-expanded={sheet}
              onClick={() => setSheet(true)} style={pillStyle(T, filtered)}
            >
              <Glyph size={16}><path d={PATHS.filter} /></Glyph>
              {filtered ? t('collection.filterCount', { count: chips.length }) : t('collection.filter')}
            </button>
            {sort}
            {isTablet && counted && (
              <span style={{ marginLeft: 'auto', font: `400 12.5px ${T.font}`, color: T.textDim, whiteSpace: 'nowrap' }}>{countText}</span>
            )}
          </div>
          {filtered && chipRow(isTablet)}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
              <span style={{ font: `400 12.5px ${T.font}`, color: T.textDim }}>{counted ? countText : ''}</span>
              {filtered && <LinkButton T={T} onClick={clearAll}>{t('collection.clear')}</LinkButton>}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', padding: `${isDesktop ? 18 : 8}px ${gutter}px 8px` }}>
        {isDesktop && (
          <aside aria-label={t('collection.filtersTitle')} style={{ width: 260, flex: 'none', display: 'flex', flexDirection: 'column', gap: 22 }}>
            {panel(false)}
          </aside>
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {isDesktop && filtered && chipRow(true)}

          {error && <div style={{ color: T.danger, font: `500 13px ${T.font}` }}>{error}</div>}

          {empty ? (
            // The search screen's empty state (E3): what happened, and the way out.
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0 0' }}>
              <div style={{ maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, padding: 24 }}>
                <span style={{ width: 96, height: 96, borderRadius: '50%', background: T.surface2, color: T.accentFg, display: 'grid', placeItems: 'center' }}>
                  {filtered
                    ? <Glyph size={40}><path d={PATHS.filter} /></Glyph>
                    : <Glyph size={40}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Glyph>}
                </span>
                <h2 style={{ margin: 0, color: T.text, font: `var(--k-w-t) ${isDesktop ? 30 : 26}px/1.15 var(--k-font-d)`, letterSpacing: track(i18n.language, '-0.02em') }}>
                  {t('collection.emptyTitle')}
                </h2>
                <p style={{ margin: 0, color: T.textDim, font: `400 14px/1.5 ${T.font}` }}>
                  {filtered ? t('collection.emptyFiltered') : t('collection.emptyCategory', { name })}
                </p>
                <button
                  type="button" onClick={filtered ? clearAll : () => navigate('/')}
                  style={{ ...primaryButton, flex: 'none', height: 54, padding: '0 26px', font: `600 16px ${T.font}` }}
                >
                  {filtered ? t('collection.clearFilters') : t('collection.allProducts')}
                </button>
                {filtered && (
                  <Link to="/" style={{ minHeight: 40, display: 'inline-flex', alignItems: 'center', color: T.accentFg, font: `600 13px ${T.font}`, textDecoration: 'none' }}>
                    {t('collection.allProducts')}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: gridGap }}>
              {loading && products.length === 0
                ? Array.from({ length: cols * 2 }).map((_, i) => (
                  <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: T.surface, border: `1px solid ${T.border}` }}>
                    <div style={{ aspectRatio: '1 / 1', background: T.surface2 }} />
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ height: 12, width: '70%', borderRadius: 6, background: T.surface2 }} />
                      <div style={{ height: 10, width: '45%', borderRadius: 6, background: T.surface2 }} />
                    </div>
                  </div>
                ))
                : products.map((p) => (
                  <GlowProductCard
                    key={p.id} T={T} p={p} hue={tenant.hue} compact={isMobile}
                    layout={layout} look={design.style} onOpen={openProduct} onAdd={handleAdd}
                  />
                ))}
            </div>
          )}

          <div ref={sentinel}>
            {hasMore && products.length > 0 && (
              <GlowLoadMore T={T} count={Math.max(total - products.length, 0)} />
            )}
          </div>
        </div>
      </div>

      {!isDesktop && (
        <FilterSheet
          T={T} open={sheet} onClose={closeSheet} backRef={sheetButton}
          title={t('collection.filtersTitle')} closeLabel={t('collection.close')}
          footer={(
            <>
              {filtered && <LinkButton T={T} onClick={clearAll}>{t('collection.clear')}</LinkButton>}
              <button type="button" onClick={closeSheet} style={primaryButton}>
                {t('collection.show', { count: total })}
              </button>
            </>
          )}
        >
          {panel(true)}
        </FilterSheet>
      )}
    </div>
  );
}
