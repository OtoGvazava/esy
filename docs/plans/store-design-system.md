# Plan — store design system (themes, quick setup, advanced editor, shopper display)

Status: designed 2026-10-31. Built: Phase 1 without the cover photo, verified tick and
shopper settings; the 14 looks; the look picker in registration; on the storefront the
themes, menus, headers, product layouts and the button, corner, card, font and ground
options; the Design tab in settings (draft, publish, discard). Not built: density and
icon weight, the banner, `StorePreview` (previews use the Mini thumbnail), Phase 7.
Design: artifact **esy Store Themes** — https://claude.ai/artifact/4f7uy5MUZ71XhzB2b6AMV6
(sections 01–10: theme picker, screens, components, quick setup, looks wall,
advanced editor, menu styles, product layouts, shopper settings, shared tokens).

## Decisions (2026-10-31)

1. **Three themes:** Soft, Liquid Glass (today's Glow, rebuilt) and Neon. Every theme
   uses the same screens and components. A theme is a token preset plus a small set of
   per-theme CSS rules; no theme forks a component.
2. **A store's design is one settings object** (`design`, JSON, versioned). Quick setup,
   the advanced editor and the ready-made looks all read and write that same object.
   A "look" is just a pre-filled design object.
3. **Owner controls the brand, shopper controls comfort.** Owner: theme, menu, layout,
   header, style, colours, show/hide. Shopper: language, light/dark, text size, product
   view, reduce transparency, reduce motion, data saver.
4. **Two ways to design.** *Quick setup* runs inside store registration (category → pick
   one of 3 looks → name/logo/colour → publish). *Advanced* lives in
   Manage store → Settings → **Design** (owner-only, D5).
5. **14 ready-made looks ship as code** (a frontend constant), not database rows. Adding
   a look is one entry, no migration.
6. **Shopper settings follow the phone first** (`prefers-color-scheme`,
   `prefers-reduced-motion`, `prefers-reduced-transparency`, Save-Data) and are saved on
   the esy account, so they apply in every `*.esy.ge` store. Guests keep them in the
   browser.
7. **Accessibility settings can't be disabled by a theme.** Reduce transparency makes
   Liquid Glass solid; reduce motion stops view transitions and the Neon flicker.

## Where the code is today

| Area | Today | File |
|---|---|---|
| Tokens | One palette: `TK(dark, accent)`. `useTK()` binds MUI mode + `tenant.primaryColor`; `useGlow()` is a legacy wrapper. **45 files** call one of them, mostly as inline styles | `core/tokens.js`, `core/useTK.js`, `styles/glow.js` |
| Glass | Hard-coded indigo glass "islands" (blur 25, indigo borders) | `styles/islandStyles.js` |
| Branding data | `primaryColor`, `secondaryColor`, `logoUrl`, `tagline`, `category` on `Tenant`; `PUT /api/tenant/current` is owner-only | `Tenant.java`, `TenantController.updateCurrentStore`, `TenantMapper` |
| Logo | Upload/delete/serve from DB, immutable ids, long-cached | `TenantLogoService`, `TenantController` |
| Light/dark | `ThemeModeContext {mode, setMode}`. "System" is resolved **once** at click and stored as light/dark, so it does not follow the phone afterwards | `contexts/ThemeModeContext.jsx`, `pages/AppearanceSettings.jsx` |
| Registration | Five steps: account, identity, brand (colour + category), review, live. `tenantApi.create({name, subdomain, primaryColor, description, category})` | `platform/PlatformRegistration.jsx` |
| Owner settings | Settings sub-tabs: shop, brand, delivery, contact, integrations (owner-only) | `manager/nav.js` (`SET_TABS`, `OWNER_ONLY`), `manager/ManagerSettings.jsx` |
| Storefront chrome | One menu (the dock), one header, one card style | `components/glow/GlowDock.jsx`, `components/store/StoreBar.jsx`, `components/glow/GlowProductCard.jsx`, `GlowPills.jsx`, `GlowSearchBar.jsx` |
| Live config | Redis-backed `ConfigStore` (non-persistent free tier, falls back to env) | see CLAUDE.md |

## The design object (v1)

```json
{
  "v": 1,
  "look": "social",
  "theme": "soft | glow | neon",
  "menu": "tabs | capsule | mini | top | drawer | fab",
  "productLayout": "grid2 | grid3 | feed | list",
  "header": "compact | center | cover",
  "style": {
    "btn": "theme | pill | round | square",
    "corner": "theme | round | subtle | sharp",
    "card": "theme | flat | outline | shadow | glass",
    "font": "theme | sans | serif | rounded | mono",
    "icon": "theme | thin | regular | bold",
    "density": "normal | compact | airy",
    "ratio": "theme | square | portrait | landscape",
    "price": "below | photo",
    "addbtn": "plus | heart | none",
    "bg": "theme | plain | tinted | gradient"
  },
  "colours": { "primary": "#rrggbb", "second": "#rrggbb" },
  "show": { "stories": true, "banner": false, "labels": true, "price": true,
            "badge": true, "tick": true, "socials": true },
  "banner": { "title": "…", "subtitle": "…", "productId": 123 }
}
```

Rules, enforced the same way on server and web:

- Unknown keys are dropped, unknown values fall back to the default, missing keys take
  the default. A v1 reader never fails on a v2 object.
- Colours must match `^#[0-9a-fA-F]{6}$` (the existing `safeAccent` precondition).
- Only whitelisted ids ever reach the DOM, and only as `data-*` attributes. Banner text
  renders as text (React escapes it). Nothing from the object is interpolated into CSS.
- Max 8 KB serialised. Banner title 60 chars, subtitle 120.
- **Published colours stay in the existing `primaryColor` / `secondaryColor` columns**,
  because emails, the admin and existing screens already read them. Publish writes
  `colours` into those columns; the stored published JSON omits them.
- Name, tagline, description and logo stay where they are (Brand tab). Design only
  reads them.

**No ratings in v1.** The prototype has a Ratings switch, but there are no reviews, and
the store must never show invented ratings. The switch ships with a reviews feature.

## Phase 1 — foundation (no visible change)

**Data** (all new columns nullable, no enums, no CHECK constraints; see the CLAUDE.md
`ddl-auto` traps):

- `Tenant.designPublished` — `@Column(name="design_published", columnDefinition="TEXT")`
- `Tenant.designDraft` — `TEXT`, plus `designDraftUpdatedAt`, `designPublishedAt`
- `Tenant.verifiedAt` — `Instant`, set by an admin; the verified tick shows only when this
  is set **and** `show.tick` is on
- New `TenantCover` entity and table, mirroring `TenantLogo`. A new table is safer than a
  `kind` column on `tenant_logo` under `ddl-auto=update`.
- `User.displayPrefs` — `TEXT` JSON for shopper settings

**API** (`TenantController` unless noted):

| Method | Path | Who | Does |
|---|---|---|---|
| GET | `/api/tenant/current` | public | adds `design`: published, normalised, colours merged in |
| GET | `/api/tenant/current/design` | owner | `{draft, published, draftUpdatedAt, publishedAt}` |
| PUT | `/api/tenant/current/design/draft` | owner | validate, normalise, store draft, return it |
| POST | `/api/tenant/current/design/publish` | owner | draft → published, colours → columns, clear draft |
| DELETE | `/api/tenant/current/design/draft` | owner | discard draft |
| POST / DELETE | `/api/tenant/cover` | owner | cover photo, same validation as the logo |
| GET | `/api/tenant/cover/{id}` | public | serve bytes, long-cached + ETag like the logo |
| GET / PUT | `/api/account/display-prefs` | signed-in | shopper settings (`AccountController`) |

- Owner-only means `@PreAuthorize("@storeAccess.ownsCurrentStore(authentication)")`, the
  same as branding. A manager gets 403.
- `POST /api/tenants` (create) accepts an optional `design`, stored as published, so
  quick setup publishes in the same request that creates the store.
- `PUT /api/account/display-prefs` sits under `/api/account/**`, so `PhoneRequiredFilter`
  already lets unverified accounts save it.
- A new `DesignValidator` (pure, no Spring) holds the whitelists and the normaliser.

**Web:**

- `core/design/schema.json`: option ids and defaults. **The backend has a test that reads
  this file** (`../web/src/core/design/schema.json` relative to `apps/api`) and fails if
  its whitelist differs, so the two cannot drift.
- `core/design/normalize.js` mirrors `DesignValidator`.
- `DesignProvider` / `useDesign()`: resolves the published design (or the editor's draft
  in preview), merges shopper settings, and sets `data-theme`, `data-menu`,
  `data-layout`, `data-head`, `data-btn`, … on the storefront root.
- **Stores without a design object** resolve to Liquid Glass + tab bar + two-column grid
  + compact header. That is today's structure, so the switch itself changes nothing.

**Kill switch:** `app.design.enabled` in `ConfigStore`, editable at admin.esy.ge/config.
When off, the storefront renders today's chrome and registration keeps today's brand
step. Set it in the Render environment too (an admin-only override can vanish when
`esy-config` restarts). Add it to the `app` service's `environment:` block in
`docker-compose.yml`, or it never reaches the container.

## Phase 2 — the three themes

1. **Tokens become CSS variables.** `TK()` keeps its keys, but values become
   `var(--k-…)` references, and the actual colours live in `styles/themes/{soft,glow,neon}.css`
   per theme and mode, ported from the prototype. Inline-style components follow
   automatically. This is how 45 files switch theme without 45 rewrites.
2. **Audit hex-alpha concatenation first.** Patterns like `` `${T.accent}55` `` or
   `` `${color}55` `` (registration uses one) break when a token becomes `var(--…)`.
   Replace them with `color-mix(in oklab, … N%, transparent)`.
3. Port the three theme blocks: Soft (rounded, tinted, pastel wells), Liquid Glass (glass
   recipe for floating controls only, solid grouped lists, photos carry the colour) and
   Neon (grid page, lit products, chamfered buttons, mono labels, two neons with the
   `oklch(from …)` fallback). Each in light and dark.
4. `islandStyles.js` and its indigo literals are retired; glass comes only from the theme
   CSS.
5. **Fonts load on demand.** Chakra Petch, JetBrains Mono, Fraunces and Nunito load only
   when the store's theme or font option uses them. The default stays Geist + Noto Sans
   Georgian, loaded the way the app loads it today.
6. `prefers-reduced-transparency: reduce` solidifies glass even before the shopper
   setting exists.

## Phase 3 — structure and style options on the storefront

- **`StoreNav`**: one item list (shop, search, bag, orders, account) drawn six ways: tab
  bar (today's `GlowDock`), floating capsule + search, icon island, top tabs, side menu,
  action button. The side menu carries language, light/dark and social buttons.
- **`StoreBar`**: compact, centred name, cover photo.
- **`ProductGrid` + card**: two-column, photo grid, feed and list. The card covers price
  under or on the photo, quick action (+, heart, none), the "New" badge and photo shape.
- **Stories row**: v1 builds the circles automatically: New, Sale, under ₾50 and Low
  stock. Not the store's categories, because the category pills sit right under the row
  and the design review found the two rows repeating each other. Owners don't author
  stories yet.
- **Banner**: title, subtitle and an optional product, all from `design.banner`.
- **Style overrides** (button shape, corners, card, font, icons, spacing, photo shape,
  background) as `data-*` rules ported from the prototype. Each touches only its own
  properties, which is why they combine freely.
- **"New" badge** = product created in the last 14 days. **Verified tick** =
  `Tenant.verifiedAt` set.
- Every component handles loading, empty and error states, with all strings in both `en`
  and `ka` (new `design` namespace; `npm run i18n:check` must pass).

## Phase 4 — looks and `StorePreview`

- `core/design/looks.js`: the 14 looks and the category → three looks table. Existing
  registration category ids map onto the 7 groups; anything unmatched maps to "Other".

  | Category | Looks |
  |---|---|
  | Fashion | Social shop · Boutique · Night drop |
  | Food & drinks | Corner bakery · Fresh market · Coffee bar |
  | Beauty | Glow up · Pastel shelf |
  | Tech & gadgets | Sneaker drop · Gadget lab · Clean tech |
  | Home & handmade | Studio · Gallery wall |
  | Kids & toys | Toy box |

- **`StorePreview`** is the key reusable piece. It renders the real storefront home for a
  given design inside a fixed 390 px frame, scaled with `transform`, with
  `pointer-events: none`. It takes a sample catalogue or the store's own products, and it
  never fetches, navigates or writes to the cart. Quick setup, the looks wall, the editor
  preview, the showreel and the landing page all use it.
- Sample catalogue: a small fixture set with neutral product photos, marked as examples.
- Only the visible previews render. The wall renders cards lazily as they scroll in.

## Phase 5 — quick setup in registration

The brand step in `PlatformRegistration.jsx` becomes three screens. The other steps stay.

1. **What do you sell?** Seven categories, reusing the step's existing category field.
2. **Pick a look.** Three `StorePreview` cards in a carousel, with remix chips (Menu ▸,
   Layout ▸, Colour ▸, Shuffle) and "More looks", which opens the wall as a sheet.
3. **Name, logo and colour.** The logo is optional. Its main colour is picked client-side
   (canvas, no server work) and offered first, followed by six quick colours.

**The logo needs the store to exist first.** Keep the chosen `File` in memory and upload
it to `/api/tenant/logo` right after `tenantApi.create` resolves, on the creating
screen. If that upload fails, the store still exists and Brand settings offers the
upload again.

The **creating / live step** shows the showreel (a `StorePreview` cycling through looks)
and the live counter (computed from `schema.json`, never hard-coded). When the store is
live it shows "Customize more", which opens the advanced editor.

## Phase 6 — advanced editor (Manage store → Settings → Design)

- Add `['design', <icon>, '/settings/design']` to `SET_TABS`, with an icon from the
  existing set. The store colour moves from
  Brand into Design; Brand keeps name, tagline, description, logo and category.
- **Layout:** options on the left and a sticky live `StorePreview` with the owner's own
  products on the right. On a phone, the options fill the screen and a Preview button
  opens the phone frame.
- **Start from a look:** the 14 looks, plus Surprise me.
- **Picture options** (small SVGs) for theme, menu, layout, header, button shape and
  corners; text chips for the rest.
- **Draft and publish:** changes autosave to the draft (debounced `PUT …/draft`). A
  status bar shows "Draft · N changes not live yet" with Publish and Discard.
- **Undo** is a session history stack, plus "Back to <starting look>".
- **Colour check** (`core/design/contrast.js`, WCAG ratios): warns when white button text
  on the store colour falls below 3:1, or when the colour disappears in dark mode, and
  offers "Fix it", which darkens or lightens the colour to 4.5:1. Neon is exempt from the
  white-text check because its buttons use dark text.
- **Morph between designs** with the View Transitions API on product cards, the header
  and the menu. Skip it when the browser lacks the API or the shopper asked for reduce
  motion, and swallow the "transition skipped" rejection when changes overlap (the
  prototype hit this).

## Phase 7 — shopper Display settings

- `/settings/display` replaces `AppearanceSettings` with language, appearance
  (light/dark/**auto**, which now listens to `matchMedia` changes instead of resolving
  once), text size (4 steps), product view (the store's own, grid, photo grid, list),
  reduce transparency, reduce motion and data saver.
- Applied as `data-text`, `data-solid`, `data-motion` and `data-saver` on the storefront
  root, with the CSS ported from the prototype.
- **Text size** uses CSS `zoom` on the content container. The inline styles are px-based,
  so rem scaling would need a refactor first.
- **Data saver, v1:** lazy images with a light placeholder and no autoplay. Smaller image
  sizes need server-side thumbnails (`?w=`), which are out of scope here.
- **Storage:** guests use `localStorage` (wrapped in try/catch). After sign-in, the
  account's saved settings win; if the account has none, the local ones are uploaded.

## Phase 8 — landing page and polish

- A "Same products, 14 stores" wall on `PlatformLanding` using `StorePreview`. A tap goes
  to `/sell?look=<id>`, which preselects that look in quick setup.
- Record which look each new store starts from (`design.look`) and whether owners open
  the advanced editor, to learn which looks to improve.

## Tests and checks

- **Backend:**
  - `DesignValidatorTest`: unknown keys dropped, bad values defaulted, colour regex, 8 KB
    cap, banner length limits.
  - `TenantDesignControllerTest`: manager and shopper get 403; draft → publish copies and
    writes colour columns; discard; create-with-design publishes.
  - `DisplayPrefsTest`: an unverified account can save; bad values are rejected.
  - **Schema parity test** against `apps/web/src/core/design/schema.json`.
- **Web:** pure modules (`normalize`, `contrast`, `looks` completeness: every look uses
  only schema ids) get unit tests. If the web has no runner yet, add Vitest for these
  modules only.
- **Visual:** every look is checked in light/dark × KA/EN at 375 px. Every option value is
  checked once per theme (about 3 × 50 checks), not the millions of combinations. The
  options are orthogonal by construction, which is what makes this enough.
- **Manual:** the docker flow (`npm run up`, `studio-form.lvh.me:8092`), `npm run lint`,
  `npm run i18n:check`, and Liquid Glass scrolling on a mid-range Android phone.

## Risks

| Risk | Mitigation |
|---|---|
| Liquid Glass changes every existing store's look on release | Kill switch `app.design.enabled`; stores keep today's structure |
| `backdrop-filter` is slow on low-end phones | Glass only on floating controls, lists solid; reduce transparency; consider auto-solid on low-memory devices |
| Tokens → `var()` breaks hex-alpha string tricks | Audit and replace with `color-mix()` before the switch (Phase 2, step 2) |
| Schema drift between web and server | Parity test reads the web schema file |
| Extra fonts slow the first paint | Load only the families the store's design uses |
| `oklch(from …)` unsupported in older browsers | `color-mix` fallback first, `@supports` override after (as in the prototype) |
| `ddl-auto=update` on populated Postgres | Nullable columns and new tables only, no enums |
| Owners write banner text in one language | Expected: store content is the owner's own text; only UI chrome is translated |

## Open questions (answer before Phase 2)

1. **Existing stores:** switch to Liquid Glass automatically on release, or keep today's
   look until the owner chooses? *Recommend automatic, with the kill switch.*
2. **Neon in light mode:** open dark even on a light phone, or follow the phone?
   *Recommend opening dark (it is a night theme); an explicit Light choice still wins.*
3. **Shopper product view:** remembered per store, or one choice for all stores?
   *Recommend per store, since catalogues differ.*
4. **Stories:** automatic (New, categories, Sale) only, or owner-curated later?
   *Recommend automatic for v1.*
5. **Verified tick:** who verifies a store, and how? *Recommend an admin action in
   admin.esy.ge; the tick stays hidden until then.*
6. **Text size:** accept `zoom` now, or plan the rem refactor? *Recommend `zoom` now.*

## Rough size

| Phase | Size | Ships alone? |
|---|---|---|
| 1 Foundation | M | Yes, invisible |
| 2 Themes | L | Yes, behind the switch |
| 3 Options | L | Yes, owners can't pick yet; defaults only |
| 4 Looks + preview | M | With 5 or 6 |
| 5 Quick setup | M | Yes |
| 6 Advanced editor | L | Yes |
| 7 Shopper display | M | Yes, independent of 4–6 |
| 8 Landing + polish | S | Yes |

Most of Phase 7 (language, live auto mode, text size, reduce motion, data saver) needs
only Phase 1, so it can run in parallel with Phases 2–6. Product view needs Phase 3's
layouts, and reduce transparency only matters once Phase 2's glass ships.
