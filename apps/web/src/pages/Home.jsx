import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { handleApiError } from '../utils/api';
import { productsInfinite } from '../core/query/queries';
import { SORTS, homeListArgs, sortIdOf } from './shopQuery';
import { Sk, Skeleton, SkProductGrid } from '../components/skeleton/Skeleton';
import { useCart } from '../contexts/CartContext';
import { useDevice } from '../contexts/DeviceContext';
import { useGlow } from '../styles/glow';
import { Chip } from '../core/primitives';
import { StoreContacts } from '../components/store/ContactChannels';
// Glyphs come from the ported design set (core/icons), not the Glow set: the
// Glow set has no chevron-down, and this is the set the design itself draws.
import { Icons } from '../core/icons';
import { PoweredBy } from '../components/glow/GlowPrimitives';
import GlowProductCard from '../components/glow/GlowProductCard';
import { useDesign } from '../core/design/useDesign';
import GlowLoadMore from '../components/glow/GlowLoadMore';
import StoreHead from '../components/store/StoreHead';
import StoreBanner from '../components/store/StoreBanner';
import { addedRecently, bannerShown } from '../core/design/show';
import { StoreTabs } from '../components/store/StoreMenus';
import { useStoreBarShown } from '../components/store/storeChrome';
import { alpha } from '../core/tokens';
import CategoryPills from '../components/store/CategoryPills';
import { SortMenu } from '../components/store/CollectionFilters';
import ViewSwitch, { ViewSwitchSkeleton } from '../components/store/ViewSwitch';
import { useStoreCategories } from '../hooks/useStoreCategories';
import Collection from './Collection';
import { NoResults } from '../components/shop/EmptyStates';

// The home page's sort is the same three as a collection's (A3), kept in the
// URL as ?sort= so back and forward and a shared link keep it (shopQuery.js).
// Vertical spacing between sections and the grid's gaps follow the store's
// spacing option (density): --k-dn is 1 for "normal" (styles/design-style.css).
const sp = (px) => `calc(${px}px * var(--k-dn, 1))`;

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
function ShopHome() {
  const { T, tenant } = useGlow();
  const { isMobile, isTablet, isDesktop } = useDevice();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  // Where StoreBar is the header (tablet and desktop today) it already carries
  // identity, search, cart and account, so this page draws its own header only
  // where StoreBar is absent; a second header stacked under the first is what
  // this avoids.
  const ownHeader = !useStoreBarShown();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation('home');
  const { t: ts } = useTranslation('storefront');
  const sortId = sortIdOf(searchParams);
  const { categories } = useStoreCategories();

  const [query, setQuery] = useState(searchParams.get('search') || '');
  const loadMoreRef = useRef(null);
  const gridRef = useRef(null);
  const [story, setStory] = useState(null);

  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  // The grid, page by page, from the query cache: coming back to the shop
  // redraws every page already scrolled through, at once. A new search or
  // sort keeps the old grid, dimmed, until its first page arrives, rather
  // than emptying the page and filling it again.
  const list = useInfiniteQuery({
    ...productsInfinite(homeListArgs(searchParams, debouncedQuery)),
    placeholderData: keepPreviousData,
  });
  const products = useMemo(() => list.data?.pages.flatMap((p) => p.products) ?? [], [list.data]);
  const lastPage = list.data?.pages[list.data.pages.length - 1];
  const total = lastPage ? (lastPage.totalElements ?? products.length) : 0;
  const firstLoad = list.isPending;
  const refreshing = list.isPlaceholderData;
  const isLoading = list.isPending || list.isFetchingNextPage || (refreshing && list.isFetching);
  const error = list.error ? handleApiError(list.error, t('failedToLoad')) : '';
  const hasMore = !!list.hasNextPage && !list.error;
  const { fetchNextPage, isFetching } = list;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || isFetching) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) fetchNextPage();
    }, { rootMargin: '300px', threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isFetching, fetchNextPage]);

  // The story sets, each kept only while the loaded products fill it.
  const stories = [
    { id: 'new', label: t('storyNew'), test: (p) => addedRecently(p.createdAt) },
    { id: 'under50', label: t('storyUnder50'), test: (p) => Number(p.price) <= 50 },
    { id: 'low', label: t('storyLow'), test: (p) => p.tag === 'low' },
  ].map((s) => ({ ...s, items: products.filter(s.test) })).filter((s) => s.items.length > 0);
  const picked = !query && stories.find((s) => s.id === story);
  const shown = picked ? picked.items : products;

  // The sort control: on the category row's end when the store has categories
  // (an icon on a phone, as A1 draws it), otherwise on the count row (an icon
  // there too on a phone, so the count, view and sort pin as one line).
  const pillsShown = !query && categories.length > 0;
  const sortOptions = Object.entries(SORTS).map(([id, s]) => ({ id, label: ts(`collection.sort.${s.key}`) }));
  const sortMenu = (iconOnly) => (
    <SortMenu
      T={T} value={sortId} options={sortOptions} align="right" iconOnly={iconOnly}
      pillLabel={(label) => ts('collection.sortLabel', { option: label })}
      menuLabel={ts('collection.sortMenu')}
      onChange={(id) => {
        const next = new URLSearchParams(searchParams);
        if (id === 'new') next.delete('sort'); else next.set('sort', id);
        setSearchParams(next, { replace: true, preventScrollReset: true });
      }}
    />
  );

  const handleAdd = (p) => addToCart({ id: p.id, title: p.title, price: p.price, image: p.image, thumbnail: p.thumbnail });
  const openProduct = (p) => navigate(`/product/${p.id}`);

  const gutter = isMobile ? 16 : 40;
  // The store's product layout (its design object): columns per device, as the design draws them.
  const design = useDesign();
  const cover = design.header === 'cover';
  const layout = design.productLayout;
  const COLS = { grid2: [2, 3, 4], grid3: [3, 4, 6], feed: [1, 2, 3], list: [1, 2, 2] }[layout];
  const cols = COLS[isDesktop ? 2 : isTablet ? 1 : 0];
  const gridGap = layout === 'grid3' ? 3 : layout === 'feed' ? 18 : layout === 'list' ? 10 : isMobile ? 12 : 16;
  const heroName = isDesktop ? '42px/1.08' : isTablet ? '34px/1.08' : '26px/1.08';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.page, color: T.text, font: `400 14px ${T.font}`, paddingBottom: 120 }}>
      {/* hero glow */}
      <div style={{
        position: 'absolute', top: -120, left: -80, right: -80, height: 340,
        background: `radial-gradient(60% 80% at 30% 40%, ${alpha(T.accent, 0.31)}, transparent 70%), radial-gradient(50% 70% at 80% 30%, ${alpha(T.accent, 0.2)}, transparent 70%)`,
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      {/* The store's header in the style its design picks, with top tabs
          under it for a store whose menu is the top tabs. */}
      {ownHeader && <StoreHead />}
      {ownHeader && design.menu === 'top' && (
        <div style={{ position: 'relative', marginTop: 10 }}>
          <StoreTabs />
        </div>
      )}

      {/* The hero is the store's banner in its own colour (the design's A1).
          The store's name is already in the header above, so the banner
          carries what the store says about itself rather than its name again.
          The cover header carries those words in its own band, so under it
          there is no second banner. */}
      {!query && <StoreBanner />}
      {tenant.bio && !query && !cover && !bannerShown(design) && (
        <div style={{ position: 'relative', padding: `${sp(isMobile ? 14 : 28)} ${gutter}px ${sp(4)}` }}>

          <div style={{
            position: 'relative', overflow: 'hidden', borderRadius: 'var(--k-r-card)',
            background: 'var(--k-hero)', color: 'var(--k-hero-fg)',
            padding: isMobile ? '22px 20px' : '36px 40px', minHeight: isMobile ? 150 : 220,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 14,
          }}>
            {(tenant.location || tenant.since) && (
              <div style={{ font: `600 12px ${T.font}`, opacity: 0.88 }}>
                {[tenant.location, tenant.since ? t('established', { year: tenant.since }) : null].filter(Boolean).join(' · ')}
              </div>
            )}
            <div style={{
              font: `700 ${heroName} ${T.font}`, letterSpacing: '-0.02em', maxWidth: 620,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{tenant.bio}</div>
            <button
              type="button"
              onClick={() => gridRef.current?.scrollIntoView({
                // Reduce motion (Display settings) jumps instead of gliding.
                behavior: document.documentElement.dataset.motion === 'reduce' ? 'auto' : 'smooth', block: 'start',
              })}
              style={{
                alignSelf: 'flex-start', height: 44, padding: '0 20px', borderRadius: 'var(--k-r-btn)',
                border: 0, background: '#fff', color: '#0b0b0f', font: `700 14px ${T.font}`, cursor: 'pointer',
              }}
            >{t('heroCta')}</button>
          </div>
        </div>
      )}

      {/* The list's first load: one skeleton for everything the list decides
          — the stories (drawn from the products), the category row and the
          grid — swapped whole for the real thing, so nothing already on
          screen moves when the products arrive. */}
      {firstLoad ? (
        <Skeleton label={t('common:loading.products')}>
          {design.show.stories && !query && (
            <div style={{ display: 'flex', gap: 14, overflow: 'hidden', padding: `${sp(14)} ${gutter}px ${sp(4)}` }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 74, flex: 'none' }}>
                  <Sk w={66} h={66} r="50%" />
                  <Sk w={46} h={12} r={6} style={{ margin: '1px 0 2px' }} />
                </span>
              ))}
            </div>
          )}
          {pillsShown ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `14px ${gutter}px 0` }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8, overflow: 'hidden' }}>
                {[64, 88, 74, 70, 80].map((w, i) => <Sk key={i} w={w} h={40} r="var(--k-r-pill)" />)}
              </div>
              <ViewSwitchSkeleton />
              <Sk w={isMobile ? 40 : 150} h={40} r="var(--k-r-pill)" />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: `${sp(14)} ${gutter}px ${sp(6)}` }}>
              <Sk w={90} h={13} r={6} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ViewSwitchSkeleton />
                <Sk w={isMobile ? 40 : 150} h={40} r="var(--k-r-pill)" />
              </div>
            </div>
          )}
          <div style={{ padding: `${sp(4)} ${gutter}px ${sp(8)}` }}>
            <SkProductGrid
              cols={cols} count={cols * 2} gap={sp(gridGap)} layout={layout} look={design.style}
              compact={isMobile} price={design.show.price}
            />
          </div>
        </Skeleton>
      ) : (
      <>
      {/* Stories are curated sets, never the categories again, and only the
          sets the products really support: new (added in the last 14 days),
          under 50 ₾ and running out. There is no sale price, so a "sale"
          story would be invented. */}
      {design.show.stories && stories.length > 0 && !query && (
        <div style={{ position: 'relative', display: 'flex', gap: 14, overflowX: 'auto', padding: `${sp(14)} ${gutter}px ${sp(4)}` }}>
          {stories.map((s) => {
            const on = story === s.id;
            const cover = s.items[0];
            return (
              <button
                key={s.id} type="button" aria-pressed={on} onClick={() => setStory(on ? null : s.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 74,
                  flex: 'none', background: 'none', border: 0, padding: 0, cursor: 'pointer',
                }}
              >
                <span style={{ width: 66, height: 66, borderRadius: '50%', padding: 3, background: on ? T.text : 'var(--k-ring)' }}>
                  <span style={{
                    display: 'block', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                    border: `2px solid ${T.page}`, background: T.surface2,
                  }}>
                    {cover.image && <img src={cover.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </span>
                </span>
                <span style={{ font: `${on ? 600 : 500} 12px ${T.font}`, color: on ? T.text : T.textDim, whiteSpace: 'nowrap' }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* The store's categories (A1), each opening its collection. */}
      {pillsShown && (
        <CategoryPills
          gutter={gutter} categories={categories}
          trailing={<><ViewSwitch />{sortMenu(isMobile)}</>}
        />
      )}

      {/* result meta — the sort control sits here, on the row it describes,
          unless the category row above already carries it. A store with no
          products yet has nothing to count or sort, so the row waits. */}
      {!pillsShown && (query || isLoading || products.length > 0) && <div style={{
        position: 'relative', padding: `${sp(14)} ${gutter}px ${sp(6)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      }}>
        {/* A search arrives from the search screen (the dock's ძებნა), so it
            shows here as a chip the shopper can clear, not as a second field. */}
        {query ? (
          <button
            type="button" aria-label={t('clearSearch')}
            onClick={() => { setQuery(''); navigate('/', { replace: true }); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px',
              borderRadius: 999, border: `1px solid ${T.border}`, background: T.surface,
              color: T.text, font: `600 13px ${T.font}`, cursor: 'pointer',
            }}
          >«{query}» <Icons.x size={12} /></button>
        ) : (
          <div style={{ font: `500 13px ${T.font}`, color: T.textDim }}>
            {t('productCount', { count: story ? shown.length : total })}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ViewSwitch />
          {sortMenu(isMobile)}
        </div>
      </div>}

      {error && (
        <div style={{ position: 'relative', padding: `0 ${gutter}px 8px`, color: T.danger, font: `500 13px ${T.font}` }}>{error}</div>
      )}

      {/* product grid. A first load fills it with cards drawn the way this
          store draws its own (its layout, ratio and card look), so the page
          keeps its shape and nothing moves when the products arrive. */}
      <div ref={gridRef} style={{ scrollMarginTop: 80, position: 'relative', padding: `${sp(4)} ${gutter}px ${sp(8)}` }}>
        {isLoading && products.length === 0 ? (
          <Skeleton label={t('common:loading.products')}>
            <SkProductGrid
              cols={cols} count={cols * 2} gap={sp(gridGap)} layout={layout} look={design.style}
              compact={isMobile} price={design.show.price}
            />
          </Skeleton>
        ) : (
          <div className={refreshing ? 'esy-refreshing' : 'esy-settled'} style={{
            display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: sp(gridGap),
          }}>
            {shown.map((p) => (
              <GlowProductCard
                key={p.id} T={T} p={p} hue={tenant.hue} compact={isMobile}
                layout={layout} look={design.style}
                onOpen={openProduct} onAdd={handleAdd}
              />
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {/* A search that found nothing is the design's E3: another word to
          try, the way back to everything, and a few products. */}
      {products.length === 0 && !isLoading && !error && (query ? (
        <NoResults
          query={query}
          onSearch={(w) => { setQuery(w); setSearchParams({ search: w }, { replace: true, preventScrollReset: true }); }}
          onAll={() => { setQuery(''); navigate('/', { replace: true }); }}
        />
      ) : (
        <div style={{ padding: `40px ${gutter}px`, textAlign: 'center', color: T.textDim, font: `500 14px ${T.font}` }}>
          {t('noProducts')}
        </div>
      ))}

      {/* What follows the grid waits for the list's first page: under the
          skeleton it would only be pushed about, and a list shorter than the
          skeleton would pull it up into view. */}
      {!firstLoad && (
      <>
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
      <div style={{ position: 'relative', padding: `0 ${gutter}px ${sp(isMobile ? 30 : 40)}` }}>
        <div style={{ borderRadius: 18, background: T.surface, border: `1px solid ${T.border}`, padding: isMobile ? 16 : 22 }}>
          <div style={{ font: `700 15px ${T.font}`, color: T.text, marginBottom: 8 }}>{t('aboutStore')}</div>
          {/* The design puts the SHORT description in the hero and the LONG one
              here. Now that stores have both, the paragraph is back — but only
              when a tagline exists, because without one the hero falls back to
              this same text and the strip would repeat it. */}
          {tenant.about && tenant.about !== tenant.bio && (
            <div style={{ font: `400 13.5px/1.7 ${T.font}`, color: T.textDim, marginBottom: 12 }}>
              {tenant.about}
            </div>
          )}
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
      </>
      )}
    </div>
  );
}

// /?category=<name> is that category's collection (A3). It keeps the shop's
// address, so the menu still marks the shop as the current place, and a link
// to a filtered collection opens with the same filters.
export default function Home() {
  const [params] = useSearchParams();
  return params.get('category') ? <Collection /> : <ShopHome />;
}
