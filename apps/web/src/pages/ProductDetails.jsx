import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { productApi, handleApiError } from '../utils/api';
import { renderMarkdown } from '../utils/markdown';
import { useCart } from '../contexts/CartContext';
import { useOwnerTools } from '../contexts/OwnerToolsContext';
import { useGlow } from '../styles/glow';
import { Icon, Placeholder, PoweredBy } from '../components/glow/GlowPrimitives';
import { money } from '../components/glow/GlowChrome';
import GlowProductCard from '../components/glow/GlowProductCard';

function iconBtn(T) {
  return {
    width: 38, height: 38, borderRadius: 12, border: 'none',
    background: T.dark ? 'rgba(10,10,18,0.55)' : 'rgba(255,255,255,0.78)',
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  };
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('product');
  const { addToCart } = useCart();
  const { canManage, editProduct, deleteProduct, version } = useOwnerTools();
  const { T, isDesktop, tenant } = useGlow();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgOk, setImgOk] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await productApi.get(id);
        if (!alive) return;
        setProduct(data);
        setImgIdx(0);
        setImgOk(Boolean(data.images?.[0] || data.thumbnail));
        const list = await productApi.list({ page: 0, size: 6 });
        if (alive) setRelated(list.products.filter((p) => String(p.id) !== String(id)));
      } catch (err) {
        if (alive) setError(handleApiError(err, t('productNotFound')));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // `version` bumps after an owner edit/delete → re-pull (a deleted product
    // 404s into the existing not-found screen).
  }, [id, t, version]);

  const gallery = (product?.images && product.images.length)
    ? product.images
    : (product?.thumbnail ? [product.thumbnail] : []);
  const heroImg = gallery[imgIdx] || gallery[0] || product?.thumbnail;

  const addAndOpenCart = () => {
    if (!product) return;
    addToCart({ id: product.id, title: product.title, price: product.price, image: heroImg, thumbnail: product.thumbnail });
    navigate('/cart');
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: product.title, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch { /* user cancelled */ }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${T.accent}`, borderTopColor: 'transparent', animation: 'glow-spin 1s linear infinite' }} />
        <style>{'@keyframes glow-spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ font: `700 18px ${T.font}` }}>{error || t('productNotFound')}</div>
        <button onClick={() => navigate('/')} style={{ height: 44, padding: '0 20px', borderRadius: 999, border: 'none', background: T.grad, color: '#fff', font: `600 13px ${T.font}`, cursor: 'pointer' }}>{t('backToShop')}</button>
      </div>
    );
  }

  const inStock = (product.quantity ?? product.stock ?? 0) > 0;
  const imageBlock = (
    <div>
    <div style={{ position: 'relative', height: isDesktop ? 520 : 460, borderRadius: isDesktop ? 22 : 0, overflow: 'hidden' }}>
      {imgOk ? (
        <img src={heroImg} alt={product.title} onError={() => setImgOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Placeholder label={product.title} hue={tenant.hue} dark={T.dark} />
      )}
      <div style={{ position: 'absolute', top: isDesktop ? 16 : 50, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => navigate(-1)} style={iconBtn(T)} aria-label="back"><Icon.arrowR style={{ transform: 'rotate(180deg)' }} /></button>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManage && (
            <>
              <button onClick={() => editProduct(product)} style={iconBtn(T)} aria-label={t('editAria', { defaultValue: 'Edit product' })}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </button>
              <button onClick={() => deleteProduct(product)} style={{ ...iconBtn(T), color: T.danger }} aria-label={t('deleteAria', { defaultValue: 'Delete product' })}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
              </button>
            </>
          )}
          <button onClick={share} style={iconBtn(T)} aria-label="share"><Icon.share /></button>
        </div>
      </div>
    </div>
    {gallery.length > 1 && (
      <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', padding: isDesktop ? 0 : '0 16px' }}>
        {gallery.map((src, i) => (
          <button
            key={`${src}-${i}`}
            onClick={() => { setImgIdx(i); setImgOk(true); }}
            aria-label={t('viewImage', { defaultValue: 'View image' })}
            style={{
              flex: '0 0 auto', width: 64, height: 64, padding: 0, borderRadius: 10,
              overflow: 'hidden', cursor: 'pointer', background: T.surface,
              border: i === imgIdx ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
            }}
          >
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </button>
        ))}
      </div>
    )}
    </div>
  );

  const info = (
    <div style={{ padding: isDesktop ? 0 : '18px 20px 0' }}>
      <div style={{ font: `500 11px ${T.font}`, color: T.accentFg, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon.pin /> {tenant.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 8 }}>
        <div style={{ font: `700 ${isDesktop ? 30 : 22}px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.025em', flex: 1 }}>{product.title}</div>
        <div style={{ font: `800 ${isDesktop ? 30 : 22}px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{money(product.price)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, font: `500 12px ${T.font}`, color: T.textDim, marginBottom: 18 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.text }}><Icon.star style={{ color: T.warn }} /> {t('badgeNew')}</span>
        <span>·</span>
        <span style={{ color: inStock ? T.success : T.danger, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: inStock ? T.success : T.danger }} />
          {inStock ? t('inStockBadge') : t('outOfStock')}
        </span>
      </div>
      {renderMarkdown(product.description) ? (
        <>
          <style>{`.glow-md{margin-bottom:22px}.glow-md p{margin:0 0 10px}.glow-md p:last-child{margin-bottom:0}.glow-md h3,.glow-md h4,.glow-md h5{color:${T.text};margin:14px 0 6px;line-height:1.25}.glow-md h3{font-size:17px}.glow-md h4{font-size:15px}.glow-md h5{font-size:13.5px}.glow-md ul,.glow-md ol{margin:0 0 10px;padding-left:20px}.glow-md li{margin:3px 0}.glow-md a{color:${T.accentFg};text-decoration:underline}.glow-md code{background:${T.surface};border:1px solid ${T.border};border-radius:5px;padding:1px 5px;font-size:12.5px}`}</style>
          <div
            className="glow-md"
            style={{ font: `400 13.5px/1.55 ${T.font}`, color: T.textDim }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(product.description) }}
          />
        </>
      ) : (
        <div style={{ font: `400 13.5px/1.55 ${T.font}`, color: T.textDim, marginBottom: 22 }}>
          {t('defaultDescription')}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 24 }}>
        {[
          { id: 'price', k: t('rowPrice'), v: money(product.price) },
          { id: 'availability', k: t('rowAvailability'), v: inStock ? t('availabilityInStock', { count: product.quantity ?? product.stock }) : t('outOfStock') },
          { id: 'ships', k: t('shipsFrom'), v: tenant.location },
        ].map(({ id: rowId, k, v }, i, arr) => (
          <div key={rowId} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${T.border}` }}>
            <span style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{k}</span>
            <span style={{ font: `600 12.5px ${T.font}`, color: T.text }}>{v}</span>
          </div>
        ))}
      </div>
      {isDesktop && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={addAndOpenCart} disabled={!inStock} style={{ flex: 1, height: 54, borderRadius: 16, border: 'none', background: inStock ? T.grad : T.surface2, color: inStock ? '#fff' : T.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, font: `700 14.5px ${T.font}`, cursor: inStock ? 'pointer' : 'not-allowed', boxShadow: inStock ? `0 10px 28px ${T.accent}55` : 'none' }}>
            <Icon.bag /> {inStock ? t('addToBag', { price: money(product.price) }) : t('outOfStock')}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}`, paddingBottom: isDesktop ? 120 : 200 }}>
      <div style={{ maxWidth: isDesktop ? 1100 : '100%', margin: '0 auto', padding: isDesktop ? '28px 40px 0' : 0 }}>
        <div style={{ display: isDesktop ? 'grid' : 'block', gridTemplateColumns: isDesktop ? '1.15fr 1fr' : undefined, gap: 40 }}>
          {imageBlock}
          {info}
        </div>

        {/* related */}
        {related.length > 0 && (
          <div style={{ padding: isDesktop ? '36px 0 0' : '8px 20px 0' }}>
            <div style={{ font: `700 16px ${T.font}`, color: T.text, letterSpacing: '-0.02em', marginBottom: 12 }}>{t('youMayAlsoLike')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isDesktop ? 4 : 2}, 1fr)`, gap: 12 }}>
              {related.slice(0, isDesktop ? 4 : 2).map((rp) => (
                <GlowProductCard key={rp.id} T={T} p={rp} hue={tenant.hue} compact onOpen={(p) => navigate(`/product/${p.id}`)} onAdd={(p) => addToCart({ id: p.id, title: p.title, price: p.price, image: p.image, thumbnail: p.thumbnail })} />
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: isDesktop ? '28px 0 0' : '24px 20px 0' }}><PoweredBy T={T} /></div>
      </div>

      {/* mobile sticky CTA — sits above the global dock */}
      {!isDesktop && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 92, padding: '14px 16px', background: T.bg, borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, zIndex: 1100 }}>
          <button onClick={addAndOpenCart} disabled={!inStock} style={{ flex: 1, height: 54, borderRadius: 16, border: 'none', background: inStock ? T.grad : T.surface2, color: inStock ? '#fff' : T.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, font: `700 14.5px ${T.font}`, cursor: inStock ? 'pointer' : 'not-allowed', boxShadow: inStock ? `0 10px 28px ${T.accent}55` : 'none' }}>
            <Icon.bag /> {inStock ? t('addToBag', { price: money(product.price) }) : t('outOfStock')}
          </button>
        </div>
      )}
    </div>
  );
}
