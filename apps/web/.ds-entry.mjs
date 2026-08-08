// design-sync bundle entry — re-exports the full esy frontend component library
// (Glow core + storefront chrome + owner tools + platform primitives), plus the
// glowTokens helper previews need and the preview provider.
// esbuild bundles this into _ds_bundle.js as window.EsyGlow.*.

// ── Glow core ───────────────────────────────────────────────────────────────
export { GlowScreen, GlowTopNav, GlowStickyCTA } from './src/components/glow/GlowChrome.jsx';
export { default as GlowDock } from './src/components/glow/GlowDock.jsx';
export { default as GlowLoadMore } from './src/components/glow/GlowLoadMore.jsx';
export { ThemePill, LangPill } from './src/components/glow/GlowPills.jsx';
export { Placeholder, PoweredBy, GlowToken } from './src/components/glow/GlowPrimitives.jsx';
export { default as GlowProductCard } from './src/components/glow/GlowProductCard.jsx';
export { default as GlowSearchBar } from './src/components/glow/GlowSearchBar.jsx';

// ── Common ──────────────────────────────────────────────────────────────────
export { default as Button } from './src/components/common/Button.jsx';
export { default as Card } from './src/components/common/Card.jsx';

// ── Storefront chrome & widgets ─────────────────────────────────────────────
export { default as AuthModal } from './src/components/AuthModal.jsx';
export { default as CartDrawer } from './src/components/CartDrawer.jsx';
export { default as DateOfBirthPicker } from './src/components/DateOfBirthPicker.jsx';
// EsyLogo excluded: imports ../assets/dark.png, which has never existed in the
// repo (and the component is imported nowhere) — it would fail the bundle.
export { default as FloatingCart } from './src/components/FloatingCart.jsx';
export { default as FloatingContacts } from './src/components/FloatingContacts.jsx';
export { default as GoogleStyleSearch } from './src/components/GoogleStyleSearch.jsx';
export { default as Header } from './src/components/Header.jsx';
export { default as Logo } from './src/components/Logo.jsx';
export { default as MobileFooter } from './src/components/MobileFooter.jsx';
export { default as Navbar } from './src/components/Navbar.jsx';
export { default as PersonalInfo } from './src/components/PersonalInfo.jsx';
export { default as PhoneVerifyBox } from './src/components/PhoneVerifyBox.jsx';
export { default as ProductCard } from './src/components/ProductCard.jsx';
export { default as ProfileGate } from './src/components/ProfileGate.jsx';
export { default as ProfileMenu } from './src/components/ProfileMenu.jsx';
export { default as SearchIsland } from './src/components/SearchIsland.jsx';
export { default as SearchSuggestions } from './src/components/SearchSuggestions.jsx';

// ── Owner / admin tools ─────────────────────────────────────────────────────
export { default as DeleteProductDialog } from './src/components/owner/DeleteProductDialog.jsx';
export { default as GlowModal } from './src/components/owner/GlowModal.jsx';
export { default as MarkdownField } from './src/components/owner/MarkdownField.jsx';
export { default as ProductEditorDialog } from './src/components/owner/ProductEditorDialog.jsx';

// ── Platform primitives ─────────────────────────────────────────────────────
export { EsyMark, StoreMark, StatusPill, PTopBar, PFooter, StoreArtStrip } from './src/platform/PlatformShared.jsx';

// ── Helpers / provider consumed by preview cards (not registered components) ─
export { glowTokens, TENANT } from './src/styles/glow.js';
export { GlowPreviewProvider } from './.ds-provider.jsx';
