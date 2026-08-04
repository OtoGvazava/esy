## Building with the esy design system

These are the real React components from the **esy** multi-tenant storefront platform,
bundled at `window.EsyGlow.*`. There are **two styling layers** — use the right one per
component.

### 1. Token-driven components — pass a `T` prop

Most `Glow*` components and the platform primitives (`GlowScreen, GlowTopNav,
GlowStickyCTA, GlowLoadMore, GlowProductCard, GlowSearchBar, GlowToken, ThemePill,
LangPill, Placeholder, PoweredBy, EsyMark, StatusPill`) are styled **inline from a tokens
object you pass as the `T` prop**. There are **no CSS classes and no utility system** —
the `T` object *is* the design language. Get it from `glowTokens(dark, accent?)`:

```jsx
import { GlowProductCard, GlowSearchBar, glowTokens } from 'esy';   // window.EsyGlow
const T = glowTokens(false);   // false = light, true = dark; accent defaults to the tenant brand #6366f1

<GlowSearchBar T={T} value="" placeholder="Search…" />
<GlowProductCard T={T} p={{ id:'1', title:'Ceramic Mug', price:42, tag:'new' }} onAdd={fn} />
```

**Token names** (all on `T`): surfaces `T.bg T.surface T.surface2`; lines `T.border
T.borderStr`; text `T.text T.textDim T.textMute`; brand `T.accent T.accentBg T.accentFg
T.grad` (`grad` = the CTA gradient); status `T.success T.danger T.warn`; type `T.font
T.mono`; mode flag `T.dark`. Never invent token names — that is the whole set
(`glowTokens` in `src/styles/glow.js`).

Prices are GEL — the `money()` helper renders `₾`. Product `tag` ∈ `new | sale | low | best`.

### 2. Components that style themselves — just pass props

`Button` (`variant: 'primary' | 'glass' | 'outlined'`, `size`, `loading`, `disabled`,
`fullWidth`, `sx`) and `Card` (`hover`, `sx`) wrap MUI — style them via props / `sx`.
The storefront chrome (`Header`, `Navbar`, `MobileFooter`, `SearchIsland`,
`SearchSuggestions`, `GoogleStyleSearch`, `ProductCard`, `CartDrawer`, `AuthModal`,
`ProfileMenu`, `FloatingCart`, `FloatingContacts`, `Logo`) and the account/owner forms
(`PersonalInfo`, `ProfileGate`, `PhoneVerifyBox`, `DateOfBirthPicker`, `MarkdownField`,
`GlowModal`, `ProductEditorDialog`, `DeleteProductDialog`, `OwnerBar`, `ViewModeToggle`)
read their own theme/context — pass behavioural props and children, not tokens.

### What's in the library

- **Glow core** — page chrome (`GlowScreen`, `GlowTopNav`, `GlowStickyCTA`, `GlowDock`),
  storefront pieces (`GlowProductCard`, `GlowSearchBar`, `GlowLoadMore`), primitives
  (`GlowToken`, `Placeholder`, `PoweredBy`, `ThemePill`, `LangPill`).
- **Storefront chrome** — `Header`, `Navbar`, `MobileFooter`, `SearchIsland`,
  `SearchSuggestions`, `GoogleStyleSearch`, `ProductCard`, `CartDrawer`, `AuthModal`,
  `ProfileMenu`, `FloatingCart`, `FloatingContacts`, `Logo`.
- **Account & forms** — `PersonalInfo`, `ProfileGate`, `PhoneVerifyBox`,
  `DateOfBirthPicker`.
- **Owner / admin** — `OwnerBar`, `ViewModeToggle`, `GlowModal`, `MarkdownField`,
  `ProductEditorDialog`, `DeleteProductDialog`.
- **Platform** — `EsyMark`, `StoreMark`, `StatusPill`, `PTopBar`, `PFooter`,
  `StoreArtStrip`.

### Provider / setup

Components read **i18n** (`react-i18next`), the **MUI theme**, a **Router**, and app
contexts (cart / saved / auth / tenant / device) from context. Wrap the tree in a provider
that supplies them — the app uses `AppProviders` + a Router. Notes:
- **`GlowDock`, `Navbar`, `ProfileMenu`** need the Router and cart/auth contexts — they
  render live route and cart state.
- **`OwnerBar` / `ViewModeToggle`** only render for a user who can manage the current
  store (`OwnerTools.canManage` ← `auth.canManageStore`). `OwnerToolsProvider` also renders
  the `ViewModeToggle` as global chrome — don't also mount it yourself inside that provider.
- **`ProfileGate`** renders only for a signed-in user whose `profileComplete` is false.
- **Responsive gating is real**: `MobileFooter` renders only ≤768px; `FloatingCart` /
  `FloatingContacts` only >768px. They are alternatives, not companions.

### Layout gotcha

`GlowDock`, `GlowStickyCTA`, `Header`, `Navbar`, `MobileFooter`, `FloatingCart`,
`FloatingContacts`, `ViewModeToggle` and `GlowModal` (plus the dialogs built on it) are
`position: fixed`. Inside a bounded region give them a containing block
(`position: relative; transform: translateZ(0)`), or they escape to the viewport.

### Where the truth lives

Read each component's `<Name>.prompt.md` for its props, and `styles.css` (runtime,
CSS-in-JS) for the visual system. Fonts: **Inter** with a system fallback. The UI is
bilingual **EN/KA** — all user-facing text goes through `react-i18next` `t()`.
