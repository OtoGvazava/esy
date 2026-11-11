// The store's banner on its home page (the design's A1 hero): a band in the
// theme's hero colour carrying the owner's heading and subtitle and, when the
// banner names one of the store's products, that product's photo and a button
// to it. Everything comes from the design object's `banner`, and it shows only
// while `show.banner` is on and there is a heading (bannerShown). Where it
// shows it takes the hero's place, so Home draws no second band under it.
//
// Banner text is the owner's own words, drawn as text (React escapes it), in
// whichever language the owner wrote it; only the button is translated.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { productQuery } from '../../core/query/queries';
import { useDevice } from '../../contexts/DeviceContext';
import { useDesign } from '../../core/design/useDesign';
import { bannerShown } from '../../core/design/show';
import { markIfComplete, markLoaded } from '../../core/imgFade';

// The kit's hero at its three sizes: padding, least height, heading size.
const SIZE = {
  ph: { pad: '22px', min: 156, title: '26px/1.15' },
  tab: { pad: '30px', min: 230, title: '40px/1.08' },
  desk: { pad: '40px 48px', min: 290, title: '46px/1.08' },
};

// The button on the band. Liquid Glass draws it white, Neon as a lit outline,
// Soft in the hero's own ink.
const CTA = {
  glow: { background: '#fff', color: '#0b0b0f', boxShadow: '0 8px 20px -10px rgba(0,0,0,.4)' },
  neon: { background: 'transparent', color: 'var(--k-neon)', boxShadow: 'inset 0 0 0 1px var(--k-neon)', borderRadius: 0 },
  soft: { background: 'var(--k-hero-fg)', color: 'var(--k-hero-ink)' },
};

// `products`, when given, is where the banner's product is looked up instead
// of being loaded: the design editor's preview passes the products it already
// has, because a preview never fetches.
export default function StoreBanner({ products } = {}) {
  const design = useDesign();
  const { isMobile, isTablet } = useDevice();
  const { t } = useTranslation('design');
  const banner = bannerShown(design) ? design.banner : null;
  const productId = banner?.productId;
  // The product the banner points at, as loaded for that id. A product that
  // was deleted, or belongs to another store, answers 404 and the banner
  // simply goes without a photo and a button.
  // One cached read, which the home page's route loader starts with the page.
  const { data: loaded = null } = useQuery({ ...productQuery(productId), enabled: !!productId && !products });
  const [photoFailed, setPhotoFailed] = useState(null);

  if (!banner) return null;

  const dev = isMobile ? 'ph' : isTablet ? 'tab' : 'desk';
  const size = SIZE[dev];
  const gutter = isMobile ? 16 : 40;
  const product = !productId ? null
    : products ? products.find((p) => String(p.id) === String(productId)) || null
      : loaded;
  const src = product ? product.thumbnail || product.image || product.images?.[0] || null : null;
  const photo = src && photoFailed !== src ? src : null;
  const fg = { position: 'relative', maxWidth: '66%', textWrap: 'pretty' };

  return (
    <div style={{ position: 'relative', padding: `${isMobile ? 14 : 28}px ${gutter}px 4px` }}>
      <section
        style={{
          position: 'relative', overflow: 'hidden', borderRadius: 'var(--k-r-card)',
          background: 'var(--k-hero)', color: 'var(--k-hero-fg)', boxSizing: 'border-box',
          padding: size.pad, minHeight: size.min,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 6,
        }}
      >
        {photo && (
          // The product carries the colour on the right and fades into the
          // band, so the heading on the left stays on the hero's own ground.
          <img
            src={photo} alt="" onError={() => setPhotoFailed(photo)}
            className="esy-img" ref={markIfComplete} onLoad={markLoaded}
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: '44%', height: '100%',
              objectFit: 'cover', display: 'block',
              WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 45%)',
              maskImage: 'linear-gradient(90deg, transparent, #000 45%)',
            }}
          />
        )}
        <h2 style={{
          ...fg, margin: 0, font: `var(--k-w-t) ${size.title} var(--k-font-d)`, letterSpacing: '-0.02em',
          overflowWrap: 'break-word', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{banner.title}</h2>
        {/* The kit leaves the subtitle off the phone's band, which has room
            for the heading and the button only. */}
        {banner.subtitle && !isMobile && (
          <p style={{ ...fg, margin: 0, maxWidth: 'min(440px, 66%)', font: '400 12.5px/1.5 var(--k-font)', opacity: 0.88, overflowWrap: 'break-word' }}>
            {banner.subtitle}
          </p>
        )}
        {product && (
          <Link
            to={`/product/${product.id}`}
            style={{
              position: 'relative', alignSelf: 'flex-start', marginTop: 10, boxSizing: 'border-box',
              height: isMobile ? 44 : 38, padding: '0 18px', borderRadius: 'var(--k-r-btn)',
              display: 'inline-flex', alignItems: 'center', textDecoration: 'none', whiteSpace: 'nowrap',
              font: '600 13.5px var(--k-font)', ...(CTA[design.theme] || CTA.soft),
            }}
          >{t('store.bannerCta')}</Link>
        )}
      </section>
    </div>
  );
}
