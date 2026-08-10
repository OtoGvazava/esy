# design-sync notes — esy frontend design system (41 components)

## 2026-08 manager migration — component set shrank 43 → 41 (intentional)
`OwnerBar` and `ViewModeToggle` were **deleted from the app** (management moved
to manager.esy.ge; the storefront no longer has inline owner tools). Their
entries were removed from `.ds-entry.mjs`, `componentSrcMap`, `overrides`, and
`previews/`. `OwnerToolsProvider` no longer exists (the export and the
context file are gone). The next re-sync will diff them as REMOVED and delete
their cards from the project — that is correct, not a regression. References
to "43" below are historical.

## Repo shape (off-script)
`apps/web` is a **Vite application**, not a packaged component library — no `dist/`,
no `.d.ts`, components are `.jsx`. So this sync is off-script:

- **Custom bundle entry**: `apps/web/.ds-entry.mjs` re-exports the synced components
  + `glowTokens`/`TENANT` + the preview provider + `OwnerToolsProvider`. Wired via
  `cfg.entry`. It lives under `apps/web/` **on purpose** — the build walks up from the
  entry to the nearest named `package.json` (`esy`), which sets `PKG_DIR=apps/web` so
  `componentSrcMap`/`srcDir` resolve. Do NOT move it under `.design-sync/`.
- **Preview provider**: `apps/web/.ds-provider.jsx` exports `GlowPreviewProvider`
  (i18n + MemoryRouter + ThemeMode + Device/Tenant/Auth/Orders/Cart/Saved + MUI theme).
  `cfg.provider.component = "GlowPreviewProvider"`.
- pkg `esy`, globalName `EsyGlow`, `shape: package`. No build script — synth from `--entry`.

## Two hard-won provider rules (do not "simplify" these)

1. **The provider re-provides `AuthContext` with a demo signed-in store owner**
   (`DemoSignedIn`). Without it there is no session/backend in the harness, `user`
   stays null, and every auth-gated component renders nothing: `PersonalInfo`,
   `ProfileGate`, and — via `OwnerTools.canManage` ← `auth.canManageStore` —
   `OwnerBar`/`ViewModeToggle`. `profileComplete` is **false on purpose** so
   `ProfileGate` shows its form. This required a 1-line additive export of
   `AuthContext` in `apps/web/src/contexts/AuthContext.jsx` (mirrors what
   `TenantContext` already does). The override **spreads** the real value, so
   app-side additions pass through untouched.
2. **`OwnerToolsProvider` must NOT be in the global provider chain.** It renders
   global owner chrome (`<ViewModeToggle/>` + the editor dialogs) as *siblings of
   children* whenever `canManageStore` is true — with the demo owner signed in that
   stamped a floating "Enable client view" pill onto **every** card and tripped
   `[GRID_OVERFLOW] escape` on 26 of 43 components. It is exported from the entry and
   wrapped **only** inside `previews/OwnerBar.tsx` and `previews/ViewModeToggle.tsx`.
   Removing it from the global chain dropped validate warnings 27 → 6.

## Component conventions
- **Most `glow/*` + platform components take a `T` tokens prop** — previews build it
  with `glowTokens(false)` / `glowTokens(true)`. Token set lives in `src/styles/glow.js`
  and is enumerated in `.design-sync/conventions.md` — **if those token names change,
  update conventions.md** (it is validated against the built bundle).
- **`Button`/`Card`** are MUI-backed (custom `hooks/useTheme.js` merges `styles/theme.js`
  extras) — no `T` prop, they need the MUI `ThemeProvider`.
- Components using `useGlow()` internally (PersonalInfo, PhoneVerifyBox, ProfileGate,
  DateOfBirthPicker, MarkdownField, owner/*) take **no** `T` prop — check the signature.

## Viewport drives device mode — this is the #1 preview trap
`package-capture.mjs` calls `page.setViewportSize()` from the card's `viewport="WxH"`.
`DeviceContext` derives mode from **that real window width** via `useMediaQuery`
(mobile ≤768, tablet 769–1024, desktop ≥1025) and gates components by mode:
- `FloatingCart` / `FloatingContacts`: `showFloating*` is **false on mobile** → need a
  **≥769px** viewport (set to 820x400 / 820x420).
- `MobileFooter`: `showMobileFooter` is **true only on mobile** → needs a **≤768px**
  viewport (set to 420x300). Getting this backwards renders an empty card.
- `PTopBar` / `PFooter`: `usePlatform().isDesktop` needs MUI's `md` (≥900px) or they
  only ever show the compact/mobile variant (set to 1040px wide).

## position:fixed components need a containing block
`GlowDock`, `GlowStickyCTA`, `Header`, `Navbar`, `MobileFooter`, `FloatingCart`,
`FloatingContacts`, `ViewModeToggle`, **and `GlowModal`** (raw `position:fixed; inset:0`
root — so also `DeleteProductDialog` and `ProductEditorDialog`, which render through it)
escape the card and screenshot blank/clipped. Every such preview wraps the component in a
`position:relative; transform:translateZ(0)` sized div. **Any future `GlowModal`-based
dialog needs the same wrapper.**

## Known render warns (triaged — expected on re-sync, not new)
- `[CSS_RUNTIME]` — this DS is CSS-in-JS / inline-style; there is no static stylesheet, so
  the converter writes a self-styling `styles.css`. Non-blocking, expected.
- `[GRID_OVERFLOW] escape` on **`Header` and `Navbar`** only. **Verified by eye** (contact
  sheets + individual cards): the cards present correctly. The suggested `cardMode: single`
  remedy would collapse variant sweeps for no gain, and does not even clear the flag for
  these two, which are already `column`. Do not chase.
- `PhoneVerifyBox` and `StoreArtStrip` used to flag `[GRID_OVERFLOW] wide` and were
  genuinely **cropped at the cell edge** (confirmed on the contact sheets). Fixed in
  2026-08 by adding `{"cardMode": "column"}` to both in `overrides` — they no longer
  flag. `wide` is a real defect with an effective remedy; `escape` on the two fixed-position
  chrome components is the one to leave alone. Don't conflate them.

## Excluded / not synced
- **`EsyLogo` — excluded (`componentSrcMap: null`).** It imports `../assets/dark.png`,
  which has **never existed** in the repo (checked against full git history; `assets/` has
  only `light.png` + `react.svg`), and the component is imported nowhere. Vite never caught
  it because nothing pulls it into the build graph; esbuild bundling every component does.
  Fix or delete the component, then re-add it to the entry + `componentSrcMap`.
- **`pages/*` and the `Platform*` route screens** are deliberately out of scope — they are
  data-fetching routes, not design-system parts. The design agent composes screens from
  the synced components.
- `ErrorBoundary`, `LazyComponents` — not visual components.

## Other findings
- `themeMode` prop on `Header`/`Navbar`/`MobileFooter` does **not** change the rendered
  palette; all three read `theme.palette.mode` from the MUI theme. Real component
  behavior, not a preview defect.
- `StoreMark`'s logo story uses an inline `data:image/svg+xml` URI rather than a remote
  URL, so capture never depends on the network.
- `CartDrawer` shows its **empty-cart** state (the harness's CartProvider starts empty and
  there is no prop to seed items) — a legitimate, labelled card.

## Line endings — CRLF makes a no-op re-sync look like a full rebuild (fixed)
Root `.gitattributes` pins `.design-sync/** text eol=lf`. **Do not remove it.** Without it,
on Windows (`core.autocrlf=true`) all 43 `previews/*.tsx` and `conventions.md` check out as
CRLF. The converter embeds preview snippets verbatim into each `.prompt.md` and prepends
`conventions.md` to the README, so the CRs propagate into the uploaded artifacts. Observed
on the 2026-08-07 Windows re-sync **before** the fix, against a Mac-produced anchor:

- 35 of 43 `.prompt.md` differed — **line endings only**, zero text change
- all 43 `sourceKeys` invalidated → driver reported `43 changed, 0 unchanged`
- `bundleSha12` changed too → `upload.any: true` (a full 43-component re-upload)
- `renderHashes` were **identical 43/43** the whole time — the giveaway that nothing real changed

After normalizing to LF: `0 changed, 43 verified-by-upload`, `upload: nothing`, and every
hash (`renderHashes`, `sourceKeys`, `sourceHashes` 129/129, `bundleSha12`, `auxSha`,
`styleSha`) matched the anchor exactly. The repo blobs were already LF, so
`git add --renormalize` staged **no** content change — the fix is the `.gitattributes` file
alone. **Diagnostic**: if a re-sync ever reports "everything changed" while `renderHashes`
all match, check for CR before touching anything else.

## Toolchain is per-machine — the notes below are not portable
The "Playwright/Chromium already installed" line under Re-sync command was true of the
original macOS machine (`~/Library/Caches/ms-playwright/`). On a fresh clone elsewhere
nothing is cached, and `.ds-sync/` is gitignored so the converter must be re-staged and
`npm i esbuild ts-morph @types/react` re-run every time. Point `--node-modules` at
`apps/web/node_modules`.

## Re-sync risks
- **Component set is pinned in `componentSrcMap` (43).** New components are NOT
  auto-discovered (no `.d.ts`) — add them to BOTH `apps/web/.ds-entry.mjs` and
  `componentSrcMap`, or they will not sync.
- **The provider depends on app internals** (`AuthContext` export, the context provider
  chain, `OwnerToolsProvider`'s global chrome). If `AppProviders.jsx` or those contexts are
  refactored, re-check `.ds-provider.jsx` first — a provider break blanks many cards at once.
- **Inter is not shipped** (`runtimeFontPrefixes: ["Inter"]`) — cards fall back to
  system-ui. By design; don't chase `[FONT_MISSING]`.
- Token names in `conventions.md` are inlined from `glow.js` — re-validate on a bump.
- `ProductCard`'s stories load remote Unsplash photos — a sandbox without network will
  render those cells without imagery.

## Re-sync command
```
node .ds-sync/resync.mjs --config .design-sync/config.json \
  --node-modules apps/web/node_modules --out ./ds-bundle \
  --remote .design-sync/.cache/remote-sync.json
```
(fetch the project's `_ds_sync.json` → `.design-sync/.cache/remote-sync.json` first;
re-stage `.ds-sync/` and install its deps on any fresh clone — see "Toolchain is
per-machine").

### `--no-render-check` needs TWO conditions, not one (corrected 2026-08)
The earlier rule here said "skip the render check when `renderHashes` all match the
anchor". **That is necessary but not sufficient.** `renderHash` covers the emitted card
artifacts, not the compiled components: a card's `.html` renders
`window.EsyGlow.<Name>` out of `_ds_bundle.js` at runtime, so a component can change
appearance completely while its `renderHash` stays byte-identical.

Proven on the manager-migration re-sync: `GlowProductCard` lost its heart control and
`GlowDock` lost a nav item, yet only `GlowTopNav`'s `renderHash` moved. What gave it
away was `bundleSha12` changing.

**The rule: skip the render check only when `renderHashes` match AND `bundleSha12` is
unchanged.** If the bundle moved, install playwright + chromium and let it run —
those are exactly the runs where a card can silently go blank.

### Playwright is installed here now
`.ds-sync/node_modules/playwright` + `%LOCALAPPDATA%\ms-playwright\chromium-1234`
(playwright-core 1.62.1). `.ds-sync/` is gitignored, so a fresh clone re-installs.

### Do NOT run `package-capture.mjs` unscoped
A bare `--out ./ds-bundle` re-captures all 41 and marks every previously
verified-by-upload component as needing a grade. Harmless (the next driver run
restores the correct partition) but it wastes a full capture pass. Use the driver, or
`--components A,B`.
