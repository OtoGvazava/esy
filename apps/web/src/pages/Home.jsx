import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { productApi, handleApiError } from '../utils/api';
import { useCart } from '../contexts/CartContext';
import { useThemeMode } from '../contexts/ThemeModeContext';
import ManageButton from '../components/ManageButton';
import { useGlow } from '../styles/glow';
import { Icon, PoweredBy, GlowToken } from '../components/glow/GlowPrimitives';
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

export default function Home() {
  const { T, isDesktop, tenant } = useGlow();
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

  const gutter = isDesktop ? 40 : 18;
  const heroName = isDesktop ? '48px/1' : '26px/1.05';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}`, paddingBottom: 120 }}>
      {/* hero glow */}
      <div style={{
        position: 'absolute', top: -120, left: -80, right: -80, height: 340,
        background: `radial-gradient(60% 80% at 30% 40%, ${T.accent}50, transparent 70%), radial-gradient(50% 70% at 80% 30%, ${T.accent}33, transparent 70%)`,
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      {/* topbar */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `28px ${gutter}px 0` }}>
        <GlowLogo T={T} tenant={tenant} size={isDesktop ? 22 : 20} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <ManageButton />
          <ThemePill T={T} dark={mode === 'dark'} onClick={toggleTheme} />
          <LangPill T={T} lang={language} onClick={() => navigate('/settings/language')} />
        </div>
      </div>

      {/* hero + search */}
      <div style={{
        position: 'relative', padding: `${isDesktop ? 32 : 18}px ${gutter}px 14px`,
        display: isDesktop ? 'grid' : 'block',
        gridTemplateColumns: isDesktop ? '1.05fr 1fr' : undefined, gap: 36, alignItems: 'end',
      }}>
        <div>
          <div style={{ font: `500 ${isDesktop ? 11 : 10.5}px ${T.font}`, color: T.accentFg, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon.pin /> {tenant.location} · {t('established', { year: tenant.since })}
          </div>
          <div style={{ font: `700 ${heroName} ${T.font}`, color: T.text, letterSpacing: '-0.035em', marginBottom: 8 }}>{tenant.name}</div>
          <div style={{ font: `400 ${isDesktop ? 14 : 12.5}px/1.5 ${T.font}`, color: T.textDim, maxWidth: 540 }}>{tenant.bio}</div>
          {/* Contacts live on the About page (D10), not the hero — this is the
              way in. The hero is for what the shop sells; how to reach it is a
              page of its own. */}
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
            {t('aboutStore')} <Icon.arrowR />
          </button>
        </div>
        <div ref={searchRef} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: isDesktop ? 0 : 20 }}>
          <GlowSearchBar T={T} value={query} onChange={setQuery} compact={!isDesktop} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlowToken T={T} outline removable={false}><Icon.plus /> {t('addFilter')}</GlowToken>
            <span style={{ flex: 1 }} />
            <GlowToken T={T} outline removable={false}><Icon.filter width="13" height="13" /> {t('sortNewest')}</GlowToken>
          </div>
        </div>
      </div>

      {/* result meta */}
      <div style={{ position: 'relative', padding: `14px ${gutter}px 6px` }}>
        <div style={{ font: `600 11px ${T.font}`, color: T.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {t('productCount', { count: total })} · {t('shown', { count: products.length })}
        </div>
      </div>

      {error && (
        <div style={{ position: 'relative', padding: `0 ${gutter}px 8px`, color: T.danger, font: `500 13px ${T.font}` }}>{error}</div>
      )}

      {/* product grid */}
      <div style={{
        position: 'relative', display: 'grid',
        gridTemplateColumns: `repeat(${isDesktop ? 4 : 2}, 1fr)`,
        gap: isDesktop ? 16 : 12, padding: `4px ${gutter}px 8px`,
      }}>
        {products.map((p) => (
          <GlowProductCard
            key={p.id} T={T} p={p} hue={tenant.hue} compact={!isDesktop}
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

      <div style={{ position: 'relative', padding: `6px ${gutter}px 8px` }}>
        <PoweredBy T={T} />
      </div>
    </div>
  );
}
