// The two empty states the design draws on one board (E3): the empty bag, and
// a search that found nothing. Both offer the way back to everything and a
// few of the store's products under it.
//
// "You might like" is the store's newest products. The design heads the
// search's row "popular now", but nothing records what sells, so the row says
// what it is instead. The words a search suggests ("try another word") are
// the last word of those products' names — the noun in a Georgian name like
// «ქვის ჭიქა» — so each one finds something.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { productApi } from '../../utils/api';
import { useCart } from '../../contexts/CartContext';
import { useGlow } from '../../styles/glow';
import { useBottomClearance, useDesign } from '../../core/design/useDesign';
import GlowProductCard from '../glow/GlowProductCard';
import { G, Sk, useDev } from './kit';

const COUNT = { ph: 2, tab: 3, desk: 4 };
const GAP = { ph: 12, tab: 16, desk: 24 };

/** The store's newest few products (four: the most a desktop row shows). */
function useNewest() {
  const [products, setProducts] = useState(null);
  useEffect(() => {
    const ac = new AbortController();
    productApi.list({ page: 0, size: 4, sortBy: 'id', sortDir: 'desc', signal: ac.signal })
      .then((r) => { if (!ac.signal.aborted) setProducts(r.products); })
      .catch(() => { if (!ac.signal.aborted) setProducts([]); });
    return () => ac.abort();
  }, []);
  return products;
}

/** "You might like" and a row of product cards: two on a phone, three on a tablet, four on a desktop. */
export function Suggestions({ products }) {
  const { T, tenant } = useGlow();
  const dev = useDev();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { t } = useTranslation('storefront');
  const design = useDesign();
  const shown = (products || []).slice(0, COUNT[dev]);
  if (shown.length === 0) return null;
  return (
    <div className="gut stk" style={{ gap: 12, marginTop: 36 }}>
      <span className="lbl">{t('empty.youMayLike')}</span>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${COUNT[dev]}, minmax(0, 1fr))`,
        gap: `calc(${GAP[dev]}px * var(--k-dn, 1))`,
      }}>
        {shown.map((p) => (
          <GlowProductCard
            key={p.id} T={T} p={p} hue={tenant.hue} compact={dev === 'ph'}
            layout="grid2" look={design.style}
            onOpen={() => navigate(`/product/${p.id}`)}
            onAdd={() => addToCart({ id: p.id, title: p.title, price: p.price, image: p.image, thumbnail: p.thumbnail })}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyBlock({ icon, title, body, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '56px var(--gut) 0' }}>
      <div className="empty" style={{ maxWidth: 460, gap: 14 }}>
        <span className="empty-ic"><G name={icon} /></span>
        <h2 className="h1">{title}</h2>
        <p className="dim">{body}</p>
        {children}
      </div>
    </div>
  );
}

/** The bag with nothing in it (E3 "bag"). The large title is the tab's own on a phone and a tablet. */
export function EmptyBag() {
  const dev = useDev();
  const navigate = useNavigate();
  const { t } = useTranslation('cart');
  const { t: ts } = useTranslation('storefront');
  const products = useNewest();
  // the cards stay clear of the store's bottom menu
  const bottom = useBottomClearance();
  return (
    <Sk style={{ paddingBottom: (dev === 'desk' ? 0 : bottom) + 40 }}>
      {dev !== 'desk' && (
        <div className="st-top" style={{ paddingBottom: 10, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 28px)' }}>
          <h1 className="h1 grow">{t('emptyHeading')}</h1>
        </div>
      )}
      <EmptyBlock icon="bag" title={t('emptyTitle')} body={t('emptyBody')}>
        <button type="button" className="btn btn-p btn-lg" onClick={() => navigate('/')}>{ts('empty.allProducts')}</button>
      </EmptyBlock>
      <Suggestions products={products} />
    </Sk>
  );
}

/**
 * A search that found nothing (E3 "noresults"), drawn where the results
 * would have been. `onSearch(word)` runs another search; `onAll` clears it.
 */
export function NoResults({ query, onSearch, onAll }) {
  const { t } = useTranslation('storefront');
  const products = useNewest();
  const q = String(query || '').trim().toLowerCase();
  const words = [...new Set((products || [])
    .map((p) => String(p.title || '').trim().split(/\s+/).pop().replace(/[^\p{L}\p{N}-]/gu, ''))
    .filter((w) => w.length >= 3 && w.toLowerCase() !== q))].slice(0, 2);
  return (
    <Sk style={{ paddingBottom: 24 }}>
      <EmptyBlock
        icon="search"
        title={t('empty.noResultsTitle')}
        body={[t('empty.noResults', { query: String(query || '').trim() }), words.length ? t('empty.tryWords') : ''].filter(Boolean).join(' ')}
      >
        {words.length > 0 && (
          <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
            {words.map((w) => (
              <button key={w} type="button" className="pill" onClick={() => onSearch(w)}>
                <G name="search" cls="" />{w}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-p btn-lg" onClick={onAll}>{t('empty.allProducts')}</button>
      </EmptyBlock>
      <Suggestions products={products} />
    </Sk>
  );
}
