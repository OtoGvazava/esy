// The store's home page for a design (store plan, Phase 4): the storefront's
// own pieces — StoreHead, the product cards, the menus — drawn in a 390 px
// phone frame scaled with `transform`, so a design can be seen as buyers will
// see it before anything is published.
//
// Nothing in it can be used. It never fetches, navigates or writes to the
// cart: the pieces render under contexts of its own — the design as the
// store's, a guest who has not signed in, an empty bag nothing can fill, a
// phone, and a router of its own that starts on the home page — and the frame
// takes no pointer, keyboard or screen-reader focus. To assistive technology
// the preview is one image with a name.
//
// The design draws on the frame's own element (core/design/scope.js), so the
// preview shows its design whatever theme the page around it uses. The
// frame's transform makes it the containing block of every `position: fixed`
// piece (the tab bar, the capsule, the action button), so they sit at the foot
// of the phone rather than of the page.
//
// The page body (hero, stories, product count, grid, about strip) follows
// pages/Home.jsx as a phone draws it; when one changes, the other should too.
// Only the store's contact buttons are left out, because they would fetch.
import { Component, useEffect, useMemo } from 'react';
import { MemoryRouter, UNSAFE_LocationContext as LocationContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeProvider, useTheme } from '@mui/material';
import { TenantContext } from '../../contexts/TenantContext';
import { AuthContext } from '../../contexts/AuthContext';
import { CartContext } from '../../contexts/CartContext';
import { DeviceContext, DEVICE_MODES, BREAKPOINTS } from '../../contexts/DeviceContext';
import { ThemeModeProvider, useThemeMode } from '../../contexts/ThemeModeContext';
import { useGlow } from '../../styles/glow';
import { useDesign } from '../../core/design/useDesign';
import { normalizeDesign } from '../../core/design/normalize';
import { designFonts, scopeAttrs } from '../../core/design/scope';
import { MOB, alpha, safeAccent } from '../../core/tokens';
import { Chip } from '../../core/primitives';
import { Icons } from '../../core/icons';
import StoreHead from '../store/StoreHead';
import StoreBanner from '../store/StoreBanner';
import { StoreTabs } from '../store/StoreMenus';
import { addedRecently, bannerShown } from '../../core/design/show';
import GlowDock from '../glow/GlowDock';
import GlowProductCard from '../glow/GlowProductCard';
import { PoweredBy } from '../glow/GlowPrimitives';

const none = () => {};
const nothing = async () => null;

// A shopper who has not signed in: no owner's Manage button, no avatar in the menu.
const GUEST = {
  user: null, loading: false, isAuthenticated: false, isAdmin: false, isUser: true,
  isStoreOwner: false, canManageStore: false,
  login: nothing, logout: none, signInWithGoogle: none, updateProfile: nothing, refreshUser: nothing,
  saveProfile: nothing, sendPhoneCode: nothing, verifyPhone: nothing, changePassword: nothing,
};

// An empty bag that nothing can add to.
const BAG = {
  items: [], addToCart: none, removeFromCart: none, updateQuantity: none, clearCart: none,
  getTotalItems: () => 0, getTotalPrice: () => 0,
};

// A phone, whatever the screen the preview sits on.
const PHONE = {
  deviceMode: DEVICE_MODES.MOBILE, isMobile: true, isTablet: false, isDesktop: false,
  isDeviceMode: (m) => m === DEVICE_MODES.MOBILE, isMobileOrTablet: () => true, isDesktopOrTablet: () => false,
  config: {}, DEVICE_MODES, BREAKPOINTS,
};

// The design kit's phone: a dark bezel round a 46 px corner.
const BEZEL = '0 0 0 7px #19191d, 0 0 0 8px #3b3b42, 0 36px 70px -30px rgba(0, 0, 0, 0.45)';

// The sample catalogue (the design's own A1Home products), for a store with no
// products yet. Its photos are neutral grounds with the kit's object shapes,
// drawn as SVG so they need no request.
const SHAPES = {
  mug: '<path d="M18 30h48v40c0 10-8 16-18 16H36c-10 0-18-6-18-16z"/><path d="M66 40h6c8 0 12 5 12 12s-4 12-12 12h-6" fill="none" stroke="#fff" stroke-width="7"/>',
  vase: '<path d="M40 12h20v8c0 6 14 12 14 34 0 22-10 34-24 34S26 76 26 54c0-22 14-28 14-34z"/>',
  bowl: '<path d="M10 42h80c0 23-17 40-40 40S10 65 10 42z"/><rect x="37" y="82" width="26" height="6" rx="2"/>',
  plate: '<path fill-rule="evenodd" d="M50 34c24 0 42 9 42 20s-18 20-42 20S8 65 8 54s18-20 42-20zm0 8c-16 0-28 5-28 12s12 12 28 12 28-5 28-12-12-12-28-12z"/>',
  cloth: '<rect x="18" y="22" width="64" height="15"/><rect x="18" y="40" width="64" height="15"/><rect x="18" y="58" width="64" height="20"/>',
};
const photo = (ground, shape) => `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
  + '<defs><linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient></defs>'
  + `<rect width="100" height="100" fill="${ground}"/><rect width="100" height="100" fill="url(#l)"/>`
  + `<g fill="#fff" transform="translate(25 25) scale(.5)">${SHAPES[shape]}</g></svg>`,
)}`;
// A quantity of 3 marks the low-stock one, as the product list does (≤ 5 left).
const SAMPLES = [
  { key: 'mug', price: 38, photo: photo('#cbbfb0', 'mug') },
  { key: 'vase', price: 95, photo: photo('#b9c5b6', 'vase') },
  { key: 'bowl', price: 42, photo: photo('#bfc9d3', 'bowl') },
  { key: 'napkins', price: 54, photo: photo('#d6c3b4', 'cloth') },
  { key: 'espresso', price: 24, photo: photo('#c7c2d4', 'mug') },
  { key: 'tallVase', price: 120, photo: photo('#d3c6ad', 'vase'), left: 3 },
  { key: 'plate', price: 36, photo: photo('#bccbc7', 'plate') },
  { key: 'towel', price: 28, photo: photo('#d2c3cc', 'cloth') },
];

// Families already asked for. A stylesheet is added once and kept, so going
// back and forth between fonts neither refetches nor flashes.
const loadedFonts = new Set();
function useFonts(families) {
  const key = families.join('|');
  useEffect(() => {
    if (!key) return;
    key.split('|').forEach((family) => {
      if (loadedFonts.has(family)) return;
      loadedFonts.add(family);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
      document.head.appendChild(link);
    });
  }, [key]);
}

/** The page's MUI theme in the preview's own light or dark, which useGlow reads. */
function ModeTheme({ mode, children }) {
  const outer = useTheme();
  const theme = useMemo(
    () => (outer.palette.mode === mode ? outer : { ...outer, palette: { ...outer.palette, mode } }),
    [outer, mode],
  );
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

/** A piece that throws leaves the frame empty rather than taking the page around it down. */
class Contained extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev) {
    // A new design is a new chance to draw.
    if (this.state.failed && prev.design !== this.props.design) this.setState({ failed: false });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Vertical spacing, scaled by the store's spacing option (design-style.css).
const sp = (px) => `calc(${px}px * var(--k-dn, 1))`;
// The phone's columns and gaps per product layout, as Home draws them.
const COLS = { grid2: 2, grid3: 3, feed: 1, list: 1 };
const GAP = { grid2: 12, grid3: 3, feed: 18, list: 10 };
const GUTTER = 16;

function PreviewHome({ products, total, sample }) {
  const { T, tenant } = useGlow();
  const design = useDesign();
  const { t } = useTranslation('home');
  const { t: td } = useTranslation('design');
  const layout = design.productLayout;
  const cols = COLS[layout];
  const cover = design.header === 'cover';
  const items = products || [];
  // The story sets Home builds, each kept only while the products fill it.
  const stories = [
    { id: 'new', label: t('storyNew'), test: (p) => addedRecently(p.createdAt) },
    { id: 'under50', label: t('storyUnder50'), test: (p) => Number(p.price) <= 50 },
    { id: 'low', label: t('storyLow'), test: (p) => p.tag === 'low' },
  ].map((s) => ({ ...s, first: items.find(s.test) })).filter((s) => s.first);
  const meta = [tenant.location, tenant.since ? t('established', { year: tenant.since }) : null].filter(Boolean).join(' · ');

  return (
    <div style={{ position: 'relative', minHeight: MOB.h, background: T.page, color: T.text, font: `400 14px ${T.font}`, paddingBottom: 120 }}>
      <div style={{
        position: 'absolute', top: -120, left: -80, right: -80, height: 340,
        background: `radial-gradient(60% 80% at 30% 40%, ${alpha(T.accent, 0.31)}, transparent 70%), radial-gradient(50% 70% at 80% 30%, ${alpha(T.accent, 0.2)}, transparent 70%)`,
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      <StoreHead />
      {design.menu === 'top' && (
        <div style={{ position: 'relative', marginTop: 10 }}>
          <StoreTabs />
        </div>
      )}

      <StoreBanner products={items} />
      {tenant.bio && !cover && !bannerShown(design) && (
        <div style={{ position: 'relative', padding: `${sp(14)} ${GUTTER}px ${sp(4)}` }}>
          <div style={{
            position: 'relative', overflow: 'hidden', borderRadius: 'var(--k-r-card)',
            background: 'var(--k-hero)', color: 'var(--k-hero-fg)', padding: '22px 20px', minHeight: 150,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 14,
          }}>
            {meta && <div style={{ font: `600 12px ${T.font}`, opacity: 0.88 }}>{meta}</div>}
            <div style={{
              font: `700 26px/1.08 ${T.font}`, letterSpacing: '-0.02em', maxWidth: 620,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{tenant.bio}</div>
            <span style={{
              alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', height: 44, padding: '0 20px',
              borderRadius: 'var(--k-r-btn)', background: '#fff', color: '#0b0b0f', font: `700 14px ${T.font}`,
            }}>{t('heroCta')}</span>
          </div>
        </div>
      )}

      {design.show.stories && stories.length > 0 && (
        <div style={{ position: 'relative', display: 'flex', gap: 14, overflow: 'hidden', padding: `${sp(14)} ${GUTTER}px ${sp(4)}` }}>
          {stories.map((s) => (
            <span key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 74, flex: 'none' }}>
              <span style={{ width: 66, height: 66, borderRadius: '50%', padding: 3, background: 'var(--k-ring)' }}>
                <span style={{
                  display: 'block', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                  border: `2px solid ${T.page}`, background: T.surface2,
                }}>
                  {s.first.image && <img src={s.first.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </span>
              </span>
              <span style={{ font: `500 12px ${T.font}`, color: T.textDim, whiteSpace: 'nowrap' }}>{s.label}</span>
            </span>
          ))}
        </div>
      )}

      <div style={{
        position: 'relative', padding: `${sp(14)} ${GUTTER}px ${sp(6)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      }}>
        {/* Example products say so where the store would count its own. */}
        <div style={{ font: `500 13px ${T.font}`, color: T.textDim }}>
          {sample ? td('preview.examples') : t('productCount', { count: total ?? items.length })}
        </div>
        <Chip T={T}>{t('sortNewest')} <Icons.chevD size={12} /></Chip>
      </div>

      <div style={{
        position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: sp(GAP[layout]), padding: `${sp(4)} ${GUTTER}px ${sp(8)}`,
      }}>
        {products === null
          ? Array.from({ length: cols * 2 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: T.surface, border: `1px solid ${T.border}` }}>
              <div style={{ aspectRatio: '1 / 1', background: T.surface2 }} />
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 12, width: '70%', borderRadius: 6, background: T.surface2 }} />
                <div style={{ height: 10, width: '45%', borderRadius: 6, background: T.surface2 }} />
              </div>
            </div>
          ))
          : items.map((p) => (
            <GlowProductCard key={p.id} T={T} p={p} hue={tenant.hue} compact layout={layout} look={design.style} />
          ))}
      </div>

      <div style={{ position: 'relative', padding: `${sp(14)} ${GUTTER}px ${sp(30)}` }}>
        <div style={{ borderRadius: 18, background: T.surface, border: `1px solid ${T.border}`, padding: 16 }}>
          <div style={{ font: `700 15px ${T.font}`, color: T.text, marginBottom: 8 }}>{t('aboutStore')}</div>
          {tenant.about && tenant.about !== tenant.bio && (
            <div style={{ font: `400 13.5px/1.7 ${T.font}`, color: T.textDim, marginBottom: 12 }}>{tenant.about}</div>
          )}
          {tenant.location && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip T={T}><Icons.pin size={12} /> {tenant.location}</Chip>
            </div>
          )}
        </div>
      </div>

      <div style={{
        position: 'relative', margin: `0 ${GUTTER}px`, paddingTop: 18, borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <span style={{ font: `400 11.5px ${T.font}`, color: T.textMute }}>{`© ${tenant.name} · ${tenant.domain}`}</span>
        <PoweredBy T={T} />
      </div>
    </div>
  );
}

/**
 * The store's home page drawn with `design`.
 *
 * @param {object} props
 * @param {object} props.design    a design object (normalised here)
 * @param {object} [props.tenant]  the store as /api/tenant/current returns it;
 *                                 without one, the sample store
 * @param {Array|null} [props.products] the store's products as productApi.list
 *                                 maps them; null while they load; none or an
 *                                 empty list draws the sample catalogue, marked
 *                                 as examples
 * @param {number} [props.total]   how many products the store has, for the count
 * @param {string} [props.brand]   the colour to draw with; else the design's, else the store's
 * @param {'light'|'dark'} [props.mode]
 * @param {number} [props.width]   on-screen width; the frame is 390 × 844, scaled to it
 * @param {boolean} [props.bezel]  the phone's dark edge, drawn outside the box
 */
export default function StorePreview({ design, tenant, products, total, brand, mode = 'light', width = MOB.w, bezel = true }) {
  const { t } = useTranslation('design');
  const { language } = useThemeMode();
  // Keyed on its JSON, so an equal design is the same design to every memo below.
  const designKey = JSON.stringify(design ?? null);
  const d = useMemo(() => normalizeDesign(JSON.parse(designKey)), [designKey]);
  const colour = safeAccent(brand || d.colours?.primary || tenant?.primaryColor);
  const scale = width / MOB.w;
  const own = Array.isArray(products) && products.length > 0;
  const sample = products !== null && !own;
  useFonts(designFonts(d));

  const samples = useMemo(() => SAMPLES.map((s, i) => ({
    id: -(i + 1), title: t(`preview.sample.${s.key}`), price: s.price, image: s.photo, thumbnail: s.photo,
    quantity: s.left || 24, stock: s.left || 24, hasVariants: false, blurb: '', tag: s.left ? 'low' : null,
  })), [t]);

  const store = useMemo(() => ({
    ...(tenant || { name: t('preview.sampleStore'), subdomain: 'studio-form', tagline: t('preview.sampleTagline') }),
    design: d,
    primaryColor: colour,
  }), [tenant, d, colour, t]);
  const tenantValue = useMemo(() => ({ tenant: store, loading: false, refresh: nothing }), [store]);
  const modeValue = useMemo(
    () => ({ mode, toggle: none, setMode: none, language, setLanguage: none }),
    [mode, language],
  );

  return (
    <div
      role="img"
      aria-label={t('preview.label', { name: store.displayName || store.name || '' })}
      style={{ position: 'relative', width, height: MOB.h * scale, flex: 'none' }}
    >
      <div
        {...scopeAttrs(d, mode)}
        inert
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: 0, width: MOB.w, height: MOB.h, overflow: 'hidden',
          transform: `scale(${scale})`, transformOrigin: '0 0', pointerEvents: 'none', userSelect: 'none',
          borderRadius: 46, boxShadow: bezel ? BEZEL : 'none', textAlign: 'left',
          '--k-brand': colour, background: 'var(--k-bg)', color: 'var(--k-text)', fontFamily: 'var(--k-font)',
        }}
      >
        <Contained design={d}>
          <LocationContext.Provider value={null}>
            <MemoryRouter initialEntries={['/']}>
              <ModeTheme mode={mode}>
                <DeviceContext.Provider value={PHONE}>
                  <TenantContext.Provider value={tenantValue}>
                    <AuthContext.Provider value={GUEST}>
                      <CartContext.Provider value={BAG}>
                        <ThemeModeProvider value={modeValue}>
                          <PreviewHome products={own ? products : products === null ? null : samples} total={own ? total : undefined} sample={sample} />
                          <GlowDock />
                        </ThemeModeProvider>
                      </CartContext.Provider>
                    </AuthContext.Provider>
                  </TenantContext.Provider>
                </DeviceContext.Provider>
              </ModeTheme>
            </MemoryRouter>
          </LocationContext.Provider>
        </Contained>
      </div>
    </div>
  );
}
