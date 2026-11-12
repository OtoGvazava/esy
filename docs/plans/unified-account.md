# Plan — one account everywhere (option A: the hub at esy.ge/account)

Status: built 2026-11-12, W1–W5. Not pushed.
Design: canvas **esy Full Design**, page **Account** — https://claude.ai/artifact/6ucTyRHjsgpMJdWQLjU6Rz
(boards U1–U6b, components AcctMenu and AcctNav; drawn 2026-11-12, not yet reviewed
against a render).

## The decision

A person has one esy account, and it lives in **one place: `esy.ge/account`**. Every app
(a store, esy.ge, the back office, admin) opens the **same account menu** from its
avatar. The menu holds what belongs to the place you are in and the way to the account.

Rejected: the same account page mounted inside every app (four chromes to keep alike),
and a drawer over the current page (too cramped for order lists, the address form and
the phone code).

The cost we accept: managing the account is a full page load to esy.ge and leaves the
store's look. The menu keeps the two things a shopper does most on a store, "my orders
here" and the back office link, on the store.

## Today

| App | The account today | Kit |
|---|---|---|
| `<store>.esy.ge` | `/account` page, `/account/personal`, `/orders` (`pages/Account.jsx`) | shop kit |
| `esy.ge` | `/account` page, `/account/personal` (`platform/PlatformAccount.jsx`) | platform kit |
| `manager.esy.ge` | popup: switch store, sign out (`ManagerShell.jsx` `Account`) | office kit |
| `admin.esy.ge` | popup: back office, sign out (`AdminShell.jsx` `UserMenu`) | admin kit |

Three things found while planning:

- **A store's order list is not the store's.** `GET /api/orders` returns
  `orderService.ordersForUser(user)`: every order the account placed anywhere. So
  `/orders` and the account page on Studio Form list Tbilisi Threads orders too, and the
  "spent" figure sums all of them, cancelled ones included. W1 fixes this whether or not
  the rest ships.
- **The address book has no screen.** `/api/addresses` has list, create, update and
  delete, with a default flag the server keeps consistent. Only checkout uses it.
- **The back office and admin cannot reach** personal details or the display settings.

## Target behaviour

### The account menu (U1, U1b, AcctMenu)

One component, the same markup on four hosts. Phone and tablet: a bottom sheet. Desktop:
a popover out of the control that carries the account (header button on a store and
esy.ge, the sidebar's foot in the back office and admin).

| Group | Store | esy.ge | Back office | Admin |
|---|---|---|---|---|
| Here | My orders here (count) · Back office (owner or manager only) | My stores (new-order count) · Open a store | Switch store · View the store | My back office · esy.ge |
| esy account | Manage account · All orders · Language and display · Help | same | same | same |
| | Sign out | same | same | same |

Signed out, a store's account button goes to `/signin` as it does now; there is no menu.

### The hub (U2–U6b, AcctNav)

`esy.ge/account`, behind sign-in. Desktop: a section list on the left (overview, orders,
addresses, my stores, personal details, language and display, sign out everywhere).
Phone and tablet: the overview carries the sections as rows, and each section has a
"back to esy account" link.

| Route | Board | Data |
|---|---|---|
| `/account` | U2 | `GET /api/account` |
| `/account/orders` | U4 | the same response's `orders`, filtered by store in the page |
| `/account/addresses` | U5 | `/api/addresses` |
| `/account/stores` | U6, U6b | the same response's `ownedStores`, `managedStores` |
| `/account/personal` | D2's cards | existing `PersonalInfo` |
| `/settings/display` | D3 | unchanged in the first pass (see Open questions) |

### Arriving from an app (U3)

The menu's links carry where they came from: `?from=store&sub=<sub>`,
`?from=manager&sub=<sub>` or `?from=admin` (not `store=`: that name forces the storefront
shell on any host). The hub then shows one block on top of the
overview: that place, what the account has there, and a button back.

- Store: the store, order count and spend there, the two latest orders, the back office
  row for its team. `/account/orders` opens with that store's pill chosen.
- Back office: the store and the role, new orders, team, switch store.
- Admin: only for a session that is an admin's.

Rules:

- **The return link is built, never read.** `storeUrl`, `managerUrl` and `adminUrl` make
  it from the subdomain; a URL in the query string is never followed. `sub` must match
  `^[a-z0-9-]+$`, and the block's facts come from the account's own data (its orders
  there, its role there), so a made-up subdomain shows nothing.
- The origin is kept for the visit (session storage), so it survives moving between the
  hub's sections and is gone in a new tab.
- Spend excludes cancelled orders.

## Workstreams

Each one ships alone, in this order.

### W1 — A store's orders are that store's (API) — done 2026-11-12

- `OrderRepository.findByUserAndTenantOrderByCreatedAtDesc`, and
  `OrderService.ordersForUser(user, tenant)`.
- `TenantContextService.currentStorefront()`: the store a shopper's page is on (a
  storefront host, or bare localhost with `?tenant=`), empty everywhere else.
  `OrderController.myOrders` lists that store's orders when there is one, and the whole
  account's on esy.ge, the back office and admin.
- Not `getCurrentTenant()` alone, which falls back to the default store on a platform
  host; and not `isPlatformHost()`, which calls bare localhost a platform host even with
  `?tenant=` (its comment says otherwise; left alone, the access guard reads it).
- `GET /api/orders/{orderNumber}` stays as it is: `OrderDetail` already handles an order
  from another store (`sameStore`).
- Test: `OrderScopeTest` — one shopper, two stores: each store host lists its own, the
  apex and the back office list all, the localhost simulation counts as a store.
- No schema change, so no `ddl-auto` trap. No web change: only the store's screens read
  `/api/orders`; the platform account reads `/api/account`.
- Not yet checked in the docker stack.

### W2 — The hub on esy.ge — done 2026-11-12

Checked in the docker stack at phone, tablet and desktop with a seeded test account:
every section, the address book's add, edit, set-default and delete, and the origin block
for a store, the back office and admin. Not checked: an account that is not an admin
opening `?from=admin`, and light mode.

New folder `apps/web/src/platform/account/`:

- `AccountLayout.jsx`: `PTopBar`, the section list (desktop), `<Outlet>`, `PFooter`, the
  sign-in state now in `PlatformAccount`, and the origin block's state.
- `AccountHome.jsx` (U2, U3), `AccountOrders.jsx` (U4), `AccountAddresses.jsx` (U5),
  `AccountStores.jsx` (U6, U6b), `AccountPersonal.jsx` (wraps `PersonalInfo`).
- `origin.js`: reads and validates `from` / `sub`, keeps it for the visit, builds the
  return link.

`router/platform.jsx`: `account` becomes a parent route with these children, each
`lazyScreen`; `accountLoader` stays on the parent, an `addressesLoader` on the address
route. `PlatformAccount.jsx` and `PlatformPersonal.jsx` are deleted once the new screens
draw.

Addresses: the list with the default chip, edit, delete, set as default, add; the form
is a dialog (a sheet on a phone) with the stored fields: recipient, phone, city, line,
postal code, default. Writes need a verified phone (`PhoneRequiredFilter`); a
`403 PHONE_REQUIRED` sends the person to personal details. The address query key is
shared with checkout, so a change here shows there.

Orders: one list from `/api/account`, store pills counted in the page, the first rows
with "show more" as `PlatformAccount` does today. A row opens the order on its own
store (`storeUrl(store)/orders/<n>`), as now.

### W3 — The account menu, on esy.ge, the back office and admin — done 2026-11-12

- `apps/web/src/components/account/AccountMenu.jsx` and `styles/account-menu.css`, on
  the `--k-*` tokens every host already sets, so it needs no host's kit. Props: `app`
  (`store`, `platform`, `manager`, `admin`), `sheet` and `wide` (the host's own device
  hook decides: a sheet on a phone, a floating one on a tablet), `anchor` (`below` a bar's
  control, `above` a sidebar's), `store`. The host renders the control itself and
  spreads `triggerProps` on it.
- **The popover is a portal, fixed to its control's place**, not a child of the control's
  box: the back office sidebar scrolls, so it clips anything wider than its 256 px, and
  the menu is 340.
- Arrow keys, Home and End move between rows; Escape closes and returns to the control;
  an outside press closes the popover, the scrim closes the sheet.
- Counts come from `accountQuery()`, read when the menu first opens and cached. Rows do
  not come and go with it: "my stores" is always there on esy.ge.
- Strings are `navbar.acct.*`: `navbar` is in the shared namespaces, so no host list
  changed.
- Mounted in `PTopBar` (the avatar is a button now), `ManagerShell` (`Account`: sidebar
  row, the rail's avatar, which had no menu before, and the phone header) and
  `AdminShell` (`UserMenu`, its three places).
- Checked in the docker stack on all three hosts: popover placement on a desktop, the
  sheet on a tablet and a phone, every link and its origin query, the keys. Not checked:
  the store app's rows (W4 mounts them), and pressing sign out.

### W4 — The store — done 2026-11-12

- **One menu for the whole store**, mounted once by the store's layout
  (`components/account/StoreAccount.jsx`) and fetched the first time it is opened.
  `accountSheet.js` holds whether it is open and which control opened it.
- Signed in, the bar's account button (`StoreBar`) opens it as a popover out of itself;
  the account item of the store's menu opens it as a sheet. `useStoreNav`'s account item
  carries `press`: the button-drawn menus (`GlowDock`: tab bar, capsule, icon island) call
  it instead of navigating, and the link-drawn ones (`StoreMenus`: top tabs, side menu,
  action button) keep the link and answer its click. Signed out nothing changes: the
  item is a link to `/account`, which signs in.
- The back office row comes from the session's own flags (`storeRole`), so it is there
  from the first frame. Platform ADMIN grants nothing inside a store.
- `/account` and `/account/personal` are `pages/AccountDoor.jsx`: sign-in when signed
  out, a forward to the hub with the store as its origin when signed in.
- After signing in on a store, `AuthCallback` returns to the shop, not to `/account`,
  which would now forward to esy.ge.
- Display settings on a store go back to the shop; checkout's "add phone" goes to the
  hub's personal details; the closed-store page's "my orders" goes to the hub's orders;
  the store's orders screen links to all orders on the hub.
- Layering: the menu is at 1300, above a store's floating menu (1200) and filter sheet
  (1295), under the registration gate (3000). It was 90 and the store's menu covered it.
- Deleted: `pages/Account.jsx`, `pages/PersonalDetails.jsx`, the store's `accountLoader`,
  `/account` from the store's `next` list, `components/ProfileMenu.jsx` and
  `MobileFooter.jsx` (nothing imported either).
- Checked in the docker stack: the popover on a desktop, the sheet on a phone and a
  tablet, five of the six menu styles (tabs, top tabs, side menu, capsule, action
  button; the icon island shares the capsule's code), the forwards, the orders link and
  the signed-out path. Not checked: a real Google sign-in returning to the shop, and
  pressing sign out.

### W5 — Strings, checks, records — done 2026-11-12

- Strings: the menu's are `navbar.acct.*` (shared), the hub's `platform.hub.*` beside
  the `me.*` it kept. The ones whose only readers were the replaced screens are removed
  in both languages: the store's `storefront.account.*` (all but `personal.*`, which the
  personal details cards still read), `account.displayRow` / `displaySummary`, the back
  office's `nav.signOut`, admin's `shell.toManager` / `shell.signOut`. Strings that
  nothing read before this work are left as they were.
- A store no longer loads the `account` namespace (`locales/namespaces.js`): nothing on
  a store reads it.
- Checks ran in the docker stack per workstream (see each above). Still by hand for
  whoever has a Google session: signing in on a store and landing on the shop, signing
  out from the menu, and an address added in the hub being offered at checkout (the
  store's `GET /api/addresses` returns it; the checkout screen itself was not driven).
- Canvas: L4 and D1 are kept and titled as retired, pointing at U2 and U1; deleting
  them is the owner's call. CLAUDE.md records where the account lives, the `sub`
  parameter and why it is not `store`, and that a store's order list is the store's.

## Out of scope

- Paging `/api/account`'s orders (the list is whole today; revisit when it is long).
- A label on an address ("home", "work"): the model has none.
- Notifications preferences, deleting the account, a profile photo.

## Open questions

1. **Language and display inside the hub.** `DisplaySettings` draws its own page with the
   store kit. First pass: the hub's row links to `/settings/display` as today. Splitting
   its body from its chrome so it sits in the hub's frame is a follow-up.
2. **A store the account has never bought from.** Arriving from it, the block has only
   the store's name and the way back. Its name and colour need the public store read
   (the directory already serves it); confirm that is enough.
3. **The design is not checked against a render.** Review U1–U6b before W2 starts; the
   plan follows the boards, so a change there changes W2–W4.
