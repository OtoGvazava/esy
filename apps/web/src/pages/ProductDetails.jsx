import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { productApi, handleApiError } from '../utils/api';
import { renderMarkdown } from '../utils/markdown';
import { useCart } from '../contexts/CartContext';
import { useDevice } from '../contexts/DeviceContext';
import { useGlow } from '../styles/glow';
import { Chip } from '../core/primitives';
import { StoreContacts } from '../components/store/ContactChannels';
import { Icon, Placeholder, PoweredBy } from '../components/glow/GlowPrimitives';
import { money } from '../components/glow/GlowChrome';
import GlowProductCard from '../components/glow/GlowProductCard';
import VariantPicker from '../components/store/VariantPicker';

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
  const { T, tenant } = useGlow();
  // Three widths, as on Home: the two-column layout is right for a tablet too,
  // and reading MUI's `md` gave a tablet the phone's single stacked column.
  const { isMobile, isTablet, isDesktop } = useDevice();
  const cols = isDesktop ? 4 : isTablet ? 3 : 2;

  const [product, setProduct] = useState(null);
  // Variants (D11): the document and the row the shopper has chosen.
  const [variants, setVariants] = useState(null);
  const [pickedRow, setPickedRow] = useState(null);
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
        // Null for a product that does not use variants.
        const vdoc = await productApi.getVariants(id).catch(() => null);
        if (alive) { setVariants(vdoc); setPickedRow(null); }
        const list = await productApi.list({ page: 0, size: 6 });
        if (alive) setRelated(list.products.filter((p) => String(p.id) !== String(id)));
      } catch (err) {
        if (alive) setError(handleApiError(err, t('productNotFound')));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, t]);

  const gallery = (product?.images && product.images.length)
    ? product.images
    : (product?.thumbnail ? [product.thumbnail] : []);
  const heroImg = gallery[imgIdx] || gallery[0] || product?.thumbnail;

  // With variants the chosen row decides both what is added and what it costs
  // — the server prices it again from the same row, so this is what the
  // shopper reads, never what they are charged.
  const hasVariants = !!variants?.axes?.length;
  const shownPrice = pickedRow?.price != null ? pickedRow.price : product?.price;
  const pickedStock = hasVariants ? Number(pickedRow?.stock ?? 0) : (product?.quantity ?? product?.stock ?? 0);

  const addAndOpenCart = () => {
    if (!product) return;
    // A variant product cannot be added without a combination: the server
    // refuses it, and the cart would otherwise hold a line nobody can fulfil.
    if (hasVariants && !pickedRow) return;
    addToCart({
      id: product.id,
      title: product.title,
      price: shownPrice,
      image: heroImg,
      thumbnail: product.thumbnail,
      variantId: pickedRow?.id,
      variantLabel: pickedRow?.label,
    });
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

  // With variants, in-stock means the CHOSEN combination has stock — a
  // product with 12 across other sizes is not in stock in the one picked.
  const inStock = pickedStock > 0;
  const imageBlock = (
    <div>
    <div style={{ position: 'relative', height: isMobile ? 460 : 520, borderRadius: isMobile ? 0 : 20, overflow: 'hidden' }}>
      {imgOk ? (
        <img src={heroImg} alt={product.title} onError={() => setImgOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Placeholder label={product.title} hue={tenant.hue} dark={T.dark} />
      )}
      <div style={{ position: 'absolute', top: isMobile ? 50 : 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => navigate(-1)} style={iconBtn(T)} aria-label="back"><Icon.arrowR style={{ transform: 'rotate(180deg)' }} /></button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={share} style={iconBtn(T)} aria-label="share"><Icon.share /></button>
        </div>
      </div>
    </div>
    {gallery.length > 1 && (
      <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', padding: isMobile ? '0 16px' : 0 }}>
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
    <div style={{ padding: isMobile ? '18px 20px 0' : 0 }}>
      <div style={{ font: `500 11px ${T.font}`, color: T.accentFg, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon.pin /> {tenant.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 8 }}>
        <div style={{ font: `700 ${isMobile ? 23 : 30}px/1.15 ${T.font}`, color: T.text, letterSpacing: '-0.025em', flex: 1 }}>{product.title}</div>
        <div style={{ font: `800 ${isMobile ? 23 : 30}px ${T.font}`, color: T.text, letterSpacing: '-0.02em' }}>{money(shownPrice)}</div>
      </div>
      {/* The "new" star was printed on every product regardless of age — there
          is no creation date in the payload, so it was decoration claiming to
          be data. Same rule the product cards already follow: a badge shown to
          a shopper has to be backed by a real signal. Stock is real, so it
          stays. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        {inStock ? (
          <Chip T={T} tone="success">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.success }} />
            {t('inStockBadge')}{hasVariants ? '' : ` · ${product.quantity ?? product.stock ?? 0}`}
          </Chip>
        ) : (
          <Chip T={T} tone="danger">{t('outOfStock')}</Chip>
        )}
      </div>

      {/* The picker sits above the description: it is a decision the shopper
          must make before the buy button means anything. */}
      {hasVariants && (
        <div style={{ marginBottom: 20 }}>
          <VariantPicker
            T={T}
            variants={variants}
            basePrice={product.price}
            onChange={setPickedRow}
          />
        </div>
      )}
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
      {/* Sold out is a dead end unless the shop is reachable from it. A shopper
          who wanted this item is the most likely person to ask when it returns,
          so the design replaces the buy control with the shop's own channels
          (D10) rather than leaving a disabled button. */}
      {!inStock && (
        <div style={{ borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, padding: 16, marginBottom: 16 }}>
          <div style={{ font: `700 14px ${T.font}`, color: T.text }}>{t('soldOutTitle')}</div>
          <div style={{ marginTop: 6, font: `400 12.5px/1.55 ${T.font}`, color: T.textDim }}>{t('soldOutBody')}</div>
          <div style={{ marginTop: 12 }}><StoreContacts T={T} compact /></div>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              marginTop: 12, height: 40, padding: '0 16px', borderRadius: 12,
              border: 'none', background: T.surface2, color: T.text,
              font: `600 12.5px ${T.font}`, cursor: 'pointer',
            }}
          >
            {t('browseStore')}
          </button>
        </div>
      )}

      {/* The inline buy control belongs to every width with room for it. Only a
          phone gets the sticky bar, because only a phone has the dock it sits
          above — a tablet showed neither before this. */}
      {!isMobile && inStock && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={addAndOpenCart} style={{ flex: 1, height: 54, borderRadius: 16, border: 'none', background: T.grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, font: `700 14.5px ${T.font}`, cursor: 'pointer', boxShadow: `0 10px 28px ${T.accent}55` }}>
            <Icon.bag /> {t('addToBag', { price: money(shownPrice) })}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: T.bg, color: T.text, font: `400 14px ${T.font}`, paddingBottom: isMobile ? 200 : 120 }}>
      <div style={{ maxWidth: isMobile ? '100%' : 1100, margin: '0 auto', padding: isMobile ? 0 : '28px 40px 0' }}>
        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: isMobile ? undefined : isDesktop ? '1.05fr 1fr' : '1fr 1fr', gap: isDesktop ? 44 : 26 }}>
          {imageBlock}
          {info}
        </div>

        {/* related */}
        {related.length > 0 && (
          <div style={{ padding: isMobile ? '8px 20px 0' : '36px 0 0' }}>
            <div style={{ font: `700 16px ${T.font}`, color: T.text, letterSpacing: '-0.02em', marginBottom: 12 }}>{t('youMayAlsoLike')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
              {related.slice(0, cols).map((rp) => (
                <GlowProductCard key={rp.id} T={T} p={rp} hue={tenant.hue} compact onOpen={(p) => navigate(`/product/${p.id}`)} onAdd={(p) => addToCart({ id: p.id, title: p.title, price: p.price, image: p.image, thumbnail: p.thumbnail })} />
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: isMobile ? '24px 20px 0' : '28px 0 0' }}><PoweredBy T={T} /></div>
      </div>

      {/* mobile sticky CTA — sits above the global dock */}
      {isMobile && inStock && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 92, padding: '14px 16px', background: T.bg, borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10, zIndex: 1100 }}>
          <button onClick={addAndOpenCart} style={{ flex: 1, height: 54, borderRadius: 16, border: 'none', background: T.grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, font: `700 14.5px ${T.font}`, cursor: 'pointer', boxShadow: `0 10px 28px ${T.accent}55` }}>
            <Icon.bag /> {t('addToBag', { price: money(shownPrice) })}
          </button>
        </div>
      )}
    </div>
  );
}
