import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { productApi, handleApiError } from '../utils/api';
import { useCart } from '../contexts/CartContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import { useDevice } from '../contexts/DeviceContext';
import ManageButton from '../components/ManageButton';
import { useGlow } from '../styles/glow';
import { Chip } from '../core/primitives';
import { StoreContacts } from '../components/store/ContactChannels';
// Glyphs come from the ported design set (core/icons), not the Glow set: the
// Glow set has no chevron-down, and this is the set the design itself draws.
import { Icons } from '../core/icons';
import { PoweredBy } from '../components/glow/GlowPrimitives';
import GlowSearchBar from '../components/glow/GlowSearchBar';
import GlowProductCard from '../components/glow/GlowProductCard';
import GlowLoadMore from '../components/glow/GlowLoadMore';
import { ThemePill, LangPill } from '../components/glow/GlowPills';

const PAGE_SIZE = 12;


function GlowLogo({ T, tenant, size = 20 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.text }}>
      {tenant.logoUrl ? (
        <img
          src={tenant.logoUrl} alt={tenant.name}
          style={{ width: size * 1.1, height: size * 1.1, borderRadius: 10, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{
          width: size * 1.1, height: size * 1.1, borderRadius: 10, background: T.grad,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', font: `800 ${size * 0.55}px ${T.font}`, letterSpacing: '-0.02em',
        }}>{tenant.initials.charAt(0)}</span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ font: `700 ${size * 0.82}px ${T.font}`, letterSpacing: '-0.02em' }}>{tenant.name}</span>
        <span style={{ font: `500 ${size * 0.46}px ${T.font}`, color: T.textMute, marginTop: 3 }}>{tenant.domain}</span>
      </div>
    </div>
  );
}

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// The design draws the grid at three widths, not two. Reading `isDesktop` from
// useGlow() meant MUI's `md` (900px) decided the layout, so a tablet got the
// phone's two-column grid and the phone's type sizes. DeviceContext carries the
// design's own breakpoints (mobile ≤768 · tablet 769–1024 · desktop ≥1025), so
// the three-way split comes from there.
export default function Home() {
  const { T, tenant } = useGlow();
  const { isMobile, isTablet, isDesktop } = useDevice();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { mode, toggle: toggleTheme, language } = useThemeMode();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('home');

  const [query, setQuery] = useState(searchParams.get('search') || '');
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const loadMoreRef = useRef(null);
  const searchRef = useRef(null);
  const abortControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const isLoadingRef = useRef(false);

  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const loadMoreProducts = useCallback(async (pageNum, q, isInitial = false) => {
    if (isLoadingRef.current) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const requestId = ++requestIdRef.current;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError('');

    try {
      const res = await productApi.list({
        page: pageNum, size: PAGE_SIZE, q, signal: abortController.signal,
      });
      if (requestId === requestIdRef.current) {
        setProducts((prev) => (isInitial ? res.products : [...prev, ...res.products]));
        setHasMore(res.hasMore);
        setTotal(res.totalElements ?? res.products.length);
        setCurrentPage(pageNum);
      }
    } catch (e) {
      if (requestId === requestIdRef.current && e.name !== 'AbortError') {
        setError(handleApiError(e, t('failedToLoad')));
        setHasMore(false);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [t]);

  // Reload from page 0 whenever the (debounced) search changes.
  useEffect(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setProducts([]);
    setCurrentPage(0);
    setHasMore(true);
    setError('');
    isLoadingRef.current = false;
    loadMoreProducts(0, debouncedQuery, true);
  }, [debouncedQuery, loadMoreProducts]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoadingRef.current && hasMore) {
        loadMoreProducts(currentPage + 1, debouncedQuery, false);
      }
    }, { rootMargin: '300px', threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [currentPage, debouncedQuery, hasMore, loadMoreProducts]);

  const handleAdd = (p) => addToCart({ id: p.id, title: p.title, price: p.price, image: p.image, thumbnail: p.thumbnail });
  const openProduct = (p) => navigate(`/product/${p.id}`);

  const gutter = isMobile ? 16 : 40;
  const cols = isDesktop ? 4 : isTablet ? 3 : 2;
  const heroName = isDesktop ? '42px/1.08' : isTablet ? '34px/1.08' : '26px/1.08';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}`, paddingBottom: 120 }}>
      {/* hero glow */}
      <div style={{
        position: 'absolute', top: -120, left: -80, right: -80, height: 340,
        background: `radial-gradient(60% 80% at 30% 40%, ${T.accent}50, transparent 70%), radial-gradient(50% 70% at 80% 30%, ${T.accent}33, transparent 70%)`,
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      {/* Phone header. Above mobile the StoreBar in App.jsx carries identity,
          search, cart and account, so repeating the logo here would be a
          second header stacked under the first. */}
      {isMobile && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `28px ${gutter}px 0` }}>
          <GlowLogo T={T} tenant={tenant} size={20} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ManageButton />
            <ThemePill T={T} dark={mode === 'dark'} onClick={toggleTheme} />
            <LangPill T={T} lang={language} onClick={() => navigate('/settings/language')} />
          </div>
        </div>
      )}

      {/* hero */}
      <div style={{
        position: 'relative', padding: `${isMobile ? 18 : 32}px ${gutter}px 14px`,
      }}>
        <div>
          <div style={{ marginBottom: 12 }}>
            <Chip T={T} tone="accent">
              <Icons.pin size={12} /> {tenant.location} · {t('established', { year: tenant.since })}
            </Chip>
          </div>
          <div style={{ font: `700 ${heroName} ${T.font}`, color: T.text, letterSpacing: '-0.035em', marginBottom: 8 }}>{tenant.name}</div>
          <div style={{ font: `400 ${isMobile ? 13 : 14.5}px/1.6 ${T.font}`, color: T.textDim, maxWidth: 560 }}>{tenant.bio}</div>
        </div>

        {/* Search belongs in the hero on a phone only. Above mobile the StoreBar
            carries it, and rendering both put two search fields on one desktop
            screen. */}
        {isMobile && (
          <div ref={searchRef} style={{ marginTop: 20 }}>
            <GlowSearchBar T={T} value={query} onChange={setQuery} compact />
          </div>
        )}
      </div>

      {/* result meta — the sort control sits here, on the row it describes */}
      <div style={{
        position: 'relative', padding: `14px ${gutter}px 6px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ font: `600 11px ${T.font}`, color: T.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {t('productCount', { count: total })} · {t('shown', { count: products.length })}
        </div>
        <Chip T={T}>{t('sortNewest')} <Icons.chevD size={12} /></Chip>
      </div>

      {error && (
        <div style={{ position: 'relative', padding: `0 ${gutter}px 8px`, color: T.danger, font: `500 13px ${T.font}` }}>{error}</div>
      )}

      {/* product grid */}
      <div style={{
        position: 'relative', display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: isMobile ? 12 : 16, padding: `4px ${gutter}px 8px`,
      }}>
        {/* A first load drew nothing at all until the request came back. The
            design fills the grid with card-shaped skeletons so the page keeps
            its shape and the wait reads as loading rather than as an empty
            shop. */}
        {isLoading && products.length === 0
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
              onOpen={openProduct} onAdd={handleAdd}
            />
          ))}
      </div>

      {products.length === 0 && !isLoading && !error && (
        <div style={{ padding: `40px ${gutter}px`, textAlign: 'center', color: T.textDim, font: `500 14px ${T.font}` }}>
          {query ? t('noProductsQuery', { query }) : t('noProducts')}
        </div>
      )}

      <div ref={loadMoreRef} style={{ position: 'relative', padding: `0 ${gutter}px 14px` }}>
        {(isLoading || hasMore) && products.length > 0 && (
          <GlowLoadMore T={T} count={Math.max(total - products.length, 0)} />
        )}
        {!hasMore && products.length > 0 && <GlowLoadMore T={T} done count={0} />}
      </div>

      {/* About strip — D10's third placement for public contact channels (the
          store page). The About route was the only one built; the top bar is
          still outstanding. No rating chip: the design draws ★ 4.8 but there is
          no review system, and a rating is a claim made to a shopper about a
          real shop. */}
      <div style={{ position: 'relative', padding: `0 ${gutter}px ${isMobile ? 30 : 40}px` }}>
        <div style={{ borderRadius: 18, background: T.surface, border: `1px solid ${T.border}`, padding: isMobile ? 16 : 22 }}>
          <div style={{ font: `700 15px ${T.font}`, color: T.text, marginBottom: 8 }}>{t('aboutStore')}</div>
          {/* The design puts the SHORT description in the hero and the LONG one
              here. The store has a single description field, so rendering it in
              both places printed the same sentence twice. It stays in the hero;
              this block carries what the hero does not — where the shop is, how
              to reach it, and the way to the full About page. Restore the
              paragraph when the short/long split exists. */}
          {tenant.location && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip T={T}><Icons.pin size={12} /> {tenant.location}</Chip>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <StoreContacts T={T} compact={isMobile} />
          </div>
          <button
            type="button"
            onClick={() => navigate('/about')}
            style={{
              marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${T.border}`, background: 'transparent',
              color: T.textDim, font: `600 12.5px ${T.font}`,
            }}
          >
            {t('aboutStore')} <Icons.arrowR size={14} />
          </button>
        </div>
      </div>

      <div style={{
        position: 'relative', margin: `0 ${gutter}px`, paddingTop: 18,
        borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
      }}>
        <span style={{ font: `400 11.5px ${T.font}`, color: T.textMute }}>
          © {tenant.name} · {tenant.domain}
        </span>
        <PoweredBy T={T} />
      </div>
    </div>
  );
}
