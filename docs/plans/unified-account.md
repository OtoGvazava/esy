# Plan — one account everywhere (option A: the hub at esy.ge/account)

Status: planned 2026-11-12. Nothing is built.
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

The menu's links carry where they came from: `?from=store&store=<sub>`,
`?from=manager&store=<sub>` or `?from=admin`. The hub then shows one block on top of the
overview: that place, what the account has there, and a button back.

- Store: the store, order count and spend there, the two latest orders, the back office
  row for its team. `/account/orders` opens with that store's pill chosen.
- Back office: the store and the role, new orders, team, switch store.
- Admin: only for a session that is an admin's.

Rules:

- **The return link is built, never read.** `storeUrl`, `managerUrl` and `adminUrl` make
  it from the subdomain; a URL in the query string is never followed. `store` must match
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

### W2 — The hub on esy.ge

New folder `apps/web/src/platform/account/`:

- `AccountLayout.jsx`: `PTopBar`, the section list (desktop), `<Outlet>`, `PFooter`, the
  sign-in state now in `PlatformAccount`, and the origin block's state.
- `AccountHome.jsx` (U2, U3), `AccountOrders.jsx` (U4), `AccountAddresses.jsx` (U5),
  `AccountStores.jsx` (U6, U6b), `AccountPersonal.jsx` (wraps `PersonalInfo`).
- `origin.js`: reads and validates `from` / `store`, keeps it for the visit, builds the
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

### W3 — The account menu, on esy.ge, the back office and admin

- `apps/web/src/components/account/AccountMenu.jsx` and a small stylesheet on the
  `--k-*` tokens every host already sets, so it needs no host's kit. Props: `app`
  (`store`, `platform`, `manager`, `admin`), `sheet` (the host's own device hook
  decides), the anchor's placement. `usePresence` for the fade, focus kept inside,
  Escape and an outside press close it.
- Counts come from `accountQuery()`, read when the menu first opens and cached.
- Mounted in `PTopBar` (the avatar becomes a button), `ManagerShell` (replaces `Account`)
  and `AdminShell` (replaces `UserMenu`).

### W4 — The store

- The account button in `StoreBar` and the account item of the bottom menu open the menu
  when signed in. `useStoreNav`'s account item gains a press handler in place of `to`;
  `GlowDock` and the six menus in `StoreMenus` must draw an item that is a button. This
  is the fiddly part of the plan.
- `/account` and `/account/personal` on a store become forwards to the hub with the
  origin (`GoTo`, as `/create-store` does), so bookmarks keep working.
- `/orders`, `/orders/:orderNumber` and `/settings/display` stay on the store. `/orders`
  gains a link to all orders on esy.ge.
- Deleted: `pages/Account.jsx`, `pages/PersonalDetails.jsx`, the store's `accountLoader`,
  and `/account` from the store's `next` list. `components/ProfileMenu.jsx` and
  `MobileFooter.jsx` look unreferenced already; confirm, then delete.

### W5 — Strings, checks, records

- The menu's strings are read on every host, so they go in a shared namespace
  (`locales/namespaces.js`: move `account` into `SHARED_NS`, or add the keys to
  `navbar`); the hub's go in `platform` (`me.*`). English and Georgian for every key;
  `npm run i18n:check`. The build's namespace check will fail a host that reads a
  namespace it does not load.
- `npm run up`, then by hand on `lvh.me:8092`: the menu on all four hosts at phone,
  tablet and desktop; the hub opened directly and from each app; the return button; an
  address added in the hub offered at checkout; a store's `/orders` showing only its own.
- Canvas: retire L4 and D1 once the screens match U2 and U1. CLAUDE.md: one line that
  the account lives at `esy.ge/account` and a store's order list is the store's.

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
