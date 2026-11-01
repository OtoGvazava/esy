# Plan — implement the full design (every flow, every screen)

Status: planned 2026-10-31.
Design: canvas **esy Full Design** — https://claude.ai/artifact/6ucTyRHjsgpMJdWQLjU6Rz
(81 boards on 8 pages, each drawn at phone 390, tablet 834 and desktop 1440).
Store design system detail (design object, looks, editor): `store-design-system.md`.

## What the canvas covers

| Page | Boards | App surface |
|---|---|---|
| Shop | A1–A9 browse and buy · B1–B5 sign in and phone · C1–C3 orders · D1–D3 account and display · E1–E4 about, closed, empty, offline | `<store>.esy.ge` (`App.jsx` `AppShell`) |
| Store themes | T1–T4: every screen in Soft, Liquid Glass and Neon; six menus; four layouts; three headers | storefront chrome |
| Open a store | O1 landing → O2 sign in → O2b phone → O3–O8 quick setup → O9 creating → O10 live | `esy.ge/sell` (`PlatformRegistration`) |
| Back office | M0 sign in and store picker · M1 overview · M1b first visit · M2–M7 orders, ship, refund, cancel · P1–P3 products and CSV · X1–X2 numbers · Y1–Y2 team · Z1–Z7 settings incl. the design editor | `manager.esy.ge` (`ManagerShell`) |
| esy platform | L1 directory · L2 help · L3 terms, privacy, returns · L4 my account · L5 not found | `esy.ge` (`PlatformShell`) |
| Admin | AD0 sign in · AD1–AD3 stores and suspend · AD4 admins · AD5 billing · AD6 live config · AD7 SMS and email | `admin.esy.ge` (`AdminShell`) |
| Components | StoreTop, StoreNav, Mini, PlatTop, PlatFoot, Shell | shared chrome |

The canvas follows the real model: order status PLACED → SHIPPED → OUT_FOR_DELIVERY →
DELIVERED or CANCELLED, payment status separate (NONE, PENDING, PAID, FAILED,
REFUND_PENDING, REFUNDED); refunds owner-only and asynchronous; SMS for the four order
notices and the code, email adds cancelled and refunded; one verified phone per account.

## How the design is built

The canvas runs on one stylesheet, `esy-kit.css`. Its structure is what the app ports:

- **Tokens per theme and mode** on `[data-th="soft|glow|neon|esy"]` × `[data-md]`, with
  the store colour as `--brand`. Status colours are shared. Neon derives its two neons
  with `oklch(from var(--brand) …)` inside `@supports`, `color-mix` as the fallback.
- **On-colour by lightness.** White text on the brand flips to black past oklch L .596
  (orange, light green and yellow brands fail 4.5:1 with white); heroes cap the brand at
  L .5. Destructive buttons use one deep red in both modes.
- **Components are classes**, and a theme changes them with a few scoped rules (glass
  only on floating controls, Neon chamfers and capitals), never by forking markup.
- **Device rules** by `[data-dev]`; phone targets are at least 40–44 px.

## Workstreams

Ordered so each one ships alone and the screens change in visible steps.

### W0 — Visual foundation (every surface at once)

The app draws with inline styles from `TK()` in 48 files, so the cheapest way to restyle
every screen is to change what `TK()` returns.

1. `src/styles/themes.css`: the kit's token blocks for esy, soft, glow and neon in light
   and dark, renamed to the app's keys (`--k-bg`, `--k-surface`, `--k-text`, `--k-accent`,
   …), plus the status colours, the on-colour rule and the hero cap.
2. `TK()` returns `var(--k-…)` references. **Audit first:** 66 template strings append a
   hex alpha to a token (`` `${T.accent}55` ``) and 10 do it to an accent variable; each
   becomes `alpha(T.accent, 0.33)`, a `color-mix(in srgb, … N%, transparent)` helper that
   works for hex and `var()` alike. The MUI theme keeps concrete colours (it does colour
   maths), which it already does.
3. The root carries `data-th`, `data-md` and `--brand`: `esy` on the platform, manager and
   admin hosts; the store's theme on a storefront (Liquid Glass until W1 ships).
   `data-md` follows the phone when the shopper chose Auto (`matchMedia` listener — today
   "system" is resolved once).
4. Fonts: Geist + Noto Sans Georgian by default (Inter goes); Chakra Petch and JetBrains
   Mono load only for Neon.
5. `adminTokens.js` and `islandStyles.js` stop carrying their own colours.

### W1 — Store design object

`store-design-system.md` Phase 1 as written: nullable TEXT columns on `Tenant`
(`design_published`, `design_draft`, timestamps), `DesignValidator`, draft/publish/discard
endpoints, `schema.json` shared by web and server with a parity test, `useDesign()`.
Kill switch `app.design.enabled` (ConfigStore **and** the Render environment **and** the
compose `environment:` block).

### W2 — Storefront chrome and layouts (T1–T4, StoreTop, StoreNav)

- `StoreNav`: one item list drawn six ways (tab bar, capsule + search, icon island, top
  tabs, side menu, action button). Labels at least 11 px (the dock draws 9.5 px today).
- `StoreBar`: compact, centred, cover.
- Product grid: two-column, photo grid, feed, list. Names wrap to two lines instead of
  being cut; the "New" badge means created in the last 14 days.
- Stories row (New, categories, Sale) and the banner.

### W3 — Storefront screens (A, B, C, D, E)

| Board | Route | Main changes |
|---|---|---|
| A1 | `/` | header, stories, hero, category pills, grid from W2 |
| A2 | `/search` | recent and suggested searches, result count, E3 no-results state |
| A3 | `/?category=` | category page with removable filter chips (SVG ×, not a glyph) |
| A4 | `/product/:id` | gallery, variant picker, sticky buy bar on phone |
| A5, E3 | `/cart` | quantity stepper with 36 px buttons, delivery hint, empty bag |
| A6–A7 | `/checkout` | contact and delivery, then review and pay |
| A8 | `/pay/return` | processing and failed states |
| A9 | `/success` | placed, with tracking link |
| B1–B5 | `/signin`, profile gate | Google, details, phone, code, wrong code / taken / locked |
| C1–C3 | `/orders`, `/orders/:n` | shopper labels from `storefront.json` (მიღებულია, გაიგზავნა, მიწოდების გზაშია, მიწოდებულია, გაუქმდა); status chips 12 px, not 9.5 px capitals |
| D1–D3 | `/account`, `/settings/display` | display settings replace language and appearance (store plan Phase 7) |
| E1, E2, E4 | `/about`, closed, offline | contact channels; paused vs suspended copy; reconnect |

### W4 — Platform and opening a store (O, L)

PlatTop on every platform page (help link hidden on tablet so the bar fits); directory;
help; legal as one page with Terms / Privacy / Returns pills (the routes already exist);
not found. Registration gains the O2b phone step in the esy look, then quick setup
(store plan Phases 4–5).

### W5 — Back office (M, P, X, Y, Z)

- M0: sign in, store picker (owner / manager chips), no-stores state.
- M1b first visit: checklist (product, delivery, card payments, share link).
- Orders use the manager labels (განთავსებული, გაგზავნილი, მიტანის პროცესში, მიტანილი,
  გაუქმებული) with payment as its own column; actions follow the legal transitions only.
- M7 cancel dialog: stock returns, email only, a paid order still needs a refund.
- Empty states for products and orders; P3 CSV import UI on the existing endpoint.
- Settings tabs: shop, brand, design, delivery, contact, payments; Z3–Z4 are store plan
  Phase 6.

### W6 — Admin (AD)

AD0 sign in and "not an admin"; stores table with status pills; store detail and
suspend; admins (env-only, read-only list); billing; live config with a source chip per
value (**needs the API to say env vs override**); SMS and email: channel cards, the
template matrix (OTP SMS-only and always on, cancelled and refunded email-only), the
template editor with the 70-character unit counter.

### W7 — Shopper display settings

Store plan Phase 7.

## Verification

The visual pairs harness (`apps/web/scripts/visual-check.cjs`) compares an app shot with
a design shot at the same viewport. Its design side becomes the canvas: a board rendered
alone at one device (`dev` prop) by the local canvas server, so each pair is
`board · device · state` ↔ `route · viewport`. Gated hosts use the minted session
cookie and `seed-visual.sql`, as today. Every workstream ends with its pairs captured
and read, and the defects found fixed.

## Order for the first pass

W0 → W5 and W6 label and size fixes → W2 default chrome (Liquid Glass, tab bar,
two-column grid, compact header) → verification → W1 → W2 options → W3–W4 screens →
W7 → store plan Phases 4–6.

## Design review (2026-10-31)

Before handoff every board was rendered in every theme, mode and state and checked
two ways: an automated pass over every variant (535 by the last run: clipping,
overflow, overlap, contrast, tiny text, missing Georgian glyphs, touch targets) and six
designers' visual review of the screenshots, three rounds of review and fixes in all.
What changed in the design, and what the app must copy:

- **On-colour by lightness** and **deep-red destructive buttons** (above). White on
  the orange brand, and white on dark mode's light red, both failed 4.5:1.
- **Glass carries no text.** Sheets, dialogs and drawers are 94% opaque; badges on
  photos are a dark pill; the tab bar's glass is denser than other floating controls.
- **Full-width buttons never grow vertically** (`flex: 1` in a column turned the
  bag's checkout button and three settings save buttons into slabs).
- **Product names keep two lines of room**, so prices line up across a row.
- **Phone tab bars** have equal slots with a label under every icon, and the active
  one is told apart by tint. Georgian labels are wide ("პროდუქტები" is ~80 px at
  11 px), so the back office and admin show four slots, the last one "მეტი".
- **One money format everywhere**: `38 ₾`, `4 860 ₾`, `97,20 ₾`, with no-break spaces.
- **Copy follows the real system**: a manager's role applies at once with no email;
  a placed order is cancelled (M7) and a delivered one refunded (M5).
- **Tab roots have no back button**; they open with a large title.
- **Order status chips** have one hue per status (placed amber, shipped indigo, out
  for delivery blue, delivered green, cancelled grey); payment is a separate outlined
  chip. Shopper labels and manager labels follow the locale files.
- **Secondary text is 12 px** at least; nothing Georgian below 11 px.
- New boards from the review: back-office sign-in and store picker (M0), first visit
  (M1b), cancel an order (M7), admin sign-in (AD0), seller phone check (O2b), and empty
  states for products and orders.

## Status

- W0: theme tokens ported (`styles/themes.css`), `TK()` reads them, `ThemeRoot` sets
  `data-th` / `data-md` / `--k-brand`, 70 hex-alpha strings replaced with `alpha()`,
  white-on-brand text replaced with the on-colour (primary buttons included). Text
  floor applied app-wide: body text below 11 px raised to 11 (59 places) and upper-case
  transforms removed (63), so Georgian never renders as small Mtavruli.
- Money everywhere through `core/money`: `4 860 ₾`, `97,20 ₾`, no-break spaces.
- W2/W3 storefront: dock and product card restyled; home has the brand hero (the
  store's own words, not its name again), stories built only from sets the data
  supports (under 50 ₾, running out), the search as a clearable chip, the design's
  sort label; "ქა · EN" on the store bar. The product page's phone buy bar takes the
  tab bar's place (price and one action), with round glass photo buttons; bag, orders
  and account open with a large title instead of a back button.
- W6 admin: stores as a table on desktop with the platform figures above it (cards
  stay on phone); amounts in the shared format; the refunds caveat as a footnote.
- W5 back office: phone tab bar of four equal labelled slots with the orders badge and
  a "More" sheet (stats, finances, team, settings); icon-only tablet rail; overview
  with "waiting for you" (placed → ship, shipped → out for delivery, oldest first);
  sentence-case stat labels; the money section is "ფინანსები".
- Real-app fixes from the first verification pass: the store avatar showed the
  placeholder's "E"; invented English location and founding year; a keyboard hint on
  phones; a developer note on the back-office overview; role codes ("OWNER") in chips;
  route paths under admin menu items; "ჩანთა" where the design says "კალათა".
- W1 and W2: the store design object (API, validator shared with the web through
  `core/design/schema.json`, kill switch `app.design.enabled`), the look picker when a
  store is opened, the Design tab in settings, and a storefront that follows the design:
  three themes, six menus, three headers, four product layouts, style options. Tablet
  now draws the phone's header and menu, as the design does; desktop keeps the bar.
- W3–W7: categories with the collection page and its filters (A1, A3), checkout's two
  steps (A6–A7; the bag now sends the delivery route and the chosen variant), back-office
  sign-in, store picker and first visit (M0, M1b), the cancel dialog with stock returned
  (M7), empty products and orders, CSV import (P3), billing by month and verified stores
  (AD5, AD2), config sources and the SMS and email screens (AD6, AD7), and shopper Display
  settings (D3, W7). Orders are priced from the store's catalogue, never the browser.
- Not built yet: a collections index page, saved items (the heart), the cover photo on
  the About page, smaller photos for data saver (needs server thumbnails), and a notice
  to the owner when a manager cancels an order.
