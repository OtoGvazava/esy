# esy platform: full-project code review

**Scope:** `C:/Users/GE/Desktop/esy`. The review covered the Spring Boot API in `apps/api`, the React SPA in `apps/web`, and the infra and deploy files. It ran as 16 review slices plus a cross-cutting gap-hunt pass.

**Result:** 158 verified findings: 153 CONFIRMED and 5 PLAUSIBLE. Several slices reported the same defect from different files. Those duplicates are merged below, with every location listed, which leaves **139 distinct issues: 0 Critical, 13 High, 38 Medium, 88 Low.**

The severity on each item is the one recorded in the verified findings. Where the verifier's written reasoning argued for a different level, the item has a short "Severity note".

---

## Overall assessment

The codebase is carefully written and well commented. The authors clearly thought about hard cases: conditional `claim*` UPDATEs for order state, a per-order stock-commit flag, store-scoped `@storeAccess` guards, an HttpOnly cookie design, magic-byte image sniffing, strict SMS number normalisation for Georgian numbers, and a schema-parity test between web and API. Store-scoped authorisation is mostly sound, and most single-request business rules are correct.

The weak points are mostly in the money path and at the system boundaries.

- **Payments and refunds trust too much.** The BOG callback fails open when its key is unset, and the blueprint never sets the key. A signed callback is trusted by order number alone. A bank timeout during a refund rolls back the claim the design depends on, so the money can be refunded twice. Non-PAID settlements overwrite any order state.
- **Rules are enforced only in the browser, or not at all.** Store suspension, stock checks, "card stores must use card checkout", the delivery-price ceiling and the express/courier save order are all affected.
- **One public endpoint deserialises untrusted data.** The OAuth cookie is passed to Java `ObjectInputStream` with no filter or signature. Anonymous callers can also create stores.
- **Concurrency is unprotected.** No entity has `@Version`. Stock changes are unlocked read-modify-writes, editors write back stale stock, and throttles are check-then-act.
- **Deployment config fails open.** The BOG public key, the secret-encryption key and the JWT secret all fall back silently to blank or public values. SQL logging and Spring Security DEBUG logging are on in production.
- **The automated tests never gate a deploy.** The Docker build skips tests, there is no CI, and the test named for the refund-timeout guarantee asserts nothing about it.

On the storefront, three things directly lose sales:

- The bag is lost on sign-in.
- Quick-add ignores product variants, which then fails checkout.
- The back office only ever loads the first 100 products.

---

## Fix first

1. **Remove Java deserialization of the OAuth cookie.** `apps/api/src/main/java/com/esyback/ecommerce/security/HttpCookieOAuth2AuthorizationRequestRepository.java:118`. Use JSON, or HMAC-sign the cookie and add an ObjectInputFilter.
2. **Make the BOG callback fail closed and declare `BOG_PUBLIC_KEY` in `render.yaml`.** `apps/api/src/main/java/com/esyback/ecommerce/service/BogPaymentService.java:260`, `render.yaml:17`.
3. **Settle a callback only when its BOG order id, amount and the order's current state all match.** `apps/api/src/main/java/com/esyback/ecommerce/controller/PaymentController.java:103`.
4. **Keep the refund claim on a bank timeout and stop the dialog from offering a resend.** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:444`, `apps/web/src/manager/RefundOrderDialog.jsx:53`.
5. **Require authentication to create a store.** `apps/api/src/main/java/com/esyback/ecommerce/controller/TenantController.java:101`.
6. **Enforce store suspension on the server** for orders, checkout and products. `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:65`.
7. **Bound CSV import prices before `setScale`.** `apps/api/src/main/java/com/esyback/ecommerce/service/ProductImportService.java:203`.
8. **Replace the ~72k-value order number.** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:77`.
9. **Persist the bag and return the shopper to checkout after sign-in.** `apps/web/src/contexts/CartContext.jsx:71`, `apps/web/src/pages/AuthCallback.jsx:21`.
10. **Delete a product's children before the product, and stop quick-adding products that have variants.** `apps/api/src/main/java/com/esyback/ecommerce/service/ProductService.java:261`, `apps/web/src/pages/Home.jsx:133`.

---

## Critical

None. The verifiers lowered the two critical candidates to High: the BOG fail-open (whether production sets the key cannot be seen from the repo) and the cookie deserialization (no working RCE gadget was shown).

---

## High

### H1. Store suspension is enforced only in the browser; orders and payments still go through
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:65`, `.../service/AdminService.java:157`, `.../service/TenantContextService.java:23`. Reported by 3 slices; the last two were filed as medium.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - `AdminService.suspend` only sets `isActive=false` and `suspendedAt`.
  - `TenantContextService.getCurrentTenant` resolves by subdomain without checking either field.
  - `isCurrentTenantActive()` has no callers.
  - `OrderService.createOrder` and `PaymentController.checkout` never look at tenant state.
  - `StoreAccessGuard` checks membership only, so staff of a suspended store keep every management endpoint, refunds included.
  - The only effects of suspension are the SPA's `suspended` flag, `SpaIndex` and the directory filter.
- **Scenario:** An admin suspends a fraudulent store. A shopper with a stale tab (tenant query staleTime is 5 minutes), or anyone calling the API, can still `POST /api/orders` or `/api/payments/bog/checkout` on that host. The card is charged for a store the platform believes is offline.
- **Fix:**
  - Refuse order creation and BOG checkout with 403 `STORE_SUSPENDED` when `suspendedAt != null` or the store is inactive.
  - Filter the product list and detail endpoints the same way.
  - Decide explicitly in `StoreAccessGuard` which management actions a suspended store's staff keep.

### H2. Signing in from checkout empties the bag and lands on /account
- **Where:** `apps/web/src/contexts/CartContext.jsx:71`, `apps/web/src/pages/AuthCallback.jsx:21`. Duplicate reports.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - The bag lives only in `useReducer(cartReducer, { items: [] })`. Nothing reads or writes `STORAGE_KEYS.CART`.
  - Google sign-in is a full-page redirect, so the reducer state is torn down.
  - `signInWithGoogle` stashes `/signin`, not `/checkout`.
  - `AuthCallback` then sends the user to `/account` with `window.location.replace`.
- **Scenario:** A guest adds 3 items, opens `/checkout` and is sent to `/signin` ("Sign in to place your order"). After Google they land on `/account` with an empty bag and must find every item again. Ordering requires an account, so this hits every first-time buyer.
- **Fix:**
  - Persist the bag per store in sessionStorage or localStorage and hydrate it in the reducer initialiser.
  - Stash the real originating path, and have `AuthCallback` return to it if it starts with a single `/`.
  - Changing the destination alone is not enough, because the reload still wipes the bag.

### H3. Quick-add on the home grid, related row and empty-bag suggestions ignores variants
- **Where:** `apps/web/src/pages/Home.jsx:133`.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - `Home.handleAdd`, `ProductDetails.jsx:307` (related products) and `EmptyStates.jsx:52` call `addToCart` without a `variantId` and never check `p.hasVariants`.
  - `GlowProductCard` shows "+" whatever the product's variant status.
  - `Collection.jsx:161` already sends variant products to their page instead, so this case was meant to be handled.
- **Scenario:** The shopper taps "+" on a shirt sold in sizes and pays. `ProductVariantService.require(product, null)` throws 400 "Choose an option before adding this to the basket" and the whole order is refused.
- **Fix:** Move the `hasVariants` branch into one shared handler, or into `GlowProductCard`, so every card sends a variant product to its page.

### H4. A bank-timeout refund (502) is shown as "not sent" and the Send button stays live
- **Where:** `apps/web/src/manager/RefundOrderDialog.jsx:53`.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - On a 502 the dialog shows "The refund could not be sent", calls `setBusy(false)`, and leaves Send enabled for the same amount.
  - It never calls `onDone`, so the order is not refetched and still reads PAID with the full amount refundable.
  - The cancel-plus-refund flow tells the owner the refund "can be sent again".
- **Scenario:** BOG accepts a ₾40 refund but the response times out. Because of H6 the claim is rolled back, so the second press passes every check. A new random Idempotency-Key goes to the bank and the buyer receives ₾80.
- **Fix:**
  - Have the server return a distinct `REFUND_UNCONFIRMED` code.
  - On that code, lock or close the dialog, say the refund may have gone through, invalidate the order queries, and hide Refund until the order is reloaded.
  - Pair this with the H6 fix.

### H5. The back-office product list only ever loads the oldest 100 products
- **Where:** `apps/web/src/core/query/managerQueries.js:74`, `apps/web/src/manager/ManagerProducts.jsx:48`. Duplicate reports; the second was filed as medium.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - `storeProductsQuery` is one `productPageQuery({page:0,size:100})`, and the server's default sort is id ascending.
  - Search, the stock filters and both pagers work on that one array in the browser.
  - Nothing reads `hasMore` or `totalElements`.
- **Scenario:** A merchant imports a 300-row CSV (up to 500 rows are allowed per file). Products 101 to 300 cannot be seen, searched, edited or deleted in the back office, while shoppers can still buy them. The screen gives no hint that anything is missing.
- **Fix:**
  - Page through the server: an infinite query, or server-side search, filter and paging.
  - At the very least, sort by id descending and show "showing 100 of N".

### H6. A bank timeout rolls back the refund claim, which invites a double refund (and the test meant to catch it asserts nothing)
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:444`, `apps/api/src/test/java/com/esyback/ecommerce/service/RefundTest.java:250`. Duplicate reports.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - `requestRefund` is `@Transactional` with no rollback rules. `claimRefund` (line 473) and `bogPaymentService.refund` (line 485) run in that one transaction.
  - `BogUnreachableException` extends `RuntimeException`, so Spring rolls the claim back.
  - `TenantController.refundOrder` catches the exception after the rollback, and its comment "The claim was kept on purpose" is false.
  - The code base has no `noRollbackFor`, `REQUIRES_NEW` or `TransactionTemplate`.
  - `unreachableBankKeepsTheClaim` only checks the exception type, and it is itself `@Transactional`, so it can never see the rollback.
  - This contradicts the Javadoc at OrderService.java:433-435 and CLAUDE.md.
  - A second, minor problem: the HTTP call of up to 20 seconds holds the order row lock and a pooled connection.
- **Scenario:** A ₾40 refund of a ₾100 order times out at BOG after being processed. The order goes back to PAID with nothing refunded. A retry sends a second ₾40 with a new key, so ₾80 is paid back while the ledger shows ₾40.
- **Fix:**
  - Commit the claim in its own `REQUIRES_NEW` transaction before calling the bank, or add `noRollbackFor = BogUnreachableException.class`.
  - Compensate explicitly when the bank refuses.
  - Derive the Idempotency-Key from a persisted refund attempt.
  - Make the test non-transactional and assert that the order is REFUND_PENDING with `refundedAmount` equal to the claim.

### H7. The BOG callback signature check fails open, and the deploy blueprint never sets the key
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/BogPaymentService.java:260`, `apps/api/src/main/resources/application.yml:180`, `render.yaml:17`. Three reports; the render.yaml one was filed as medium.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - `public-key: ${BOG_PUBLIC_KEY:}` defaults to blank, and `verifyCallbackSignature` returns `true` for a blank key with only a log warning. Nothing checks `env=live` or the Spring profile.
  - `render.yaml` and `deploy/render.md` never mention the key ("Nothing else to configure"), and no admin UI sets it.
  - The callback path is public (`permitAll`, CSRF off, exempt from `PhoneRequiredFilter`).
  - It settles purely from `external_order_id` and `order_status.key` in the request body.
- **Scenario:** A shopper starts a card checkout and abandons the bank page. They then POST `{"body":{"external_order_id":"<their order>","order_status":{"key":"completed"}}}` with no signature. The order becomes PAID, stock is committed, and the store ships unpaid goods. With `"rejected"`, any known order number is set to FAILED and CANCELLED.
- **Caveat:** This only applies if the variable is not set by hand in the Render dashboard, which cannot be seen from the repo.
- **Fix:**
  - Reject callbacks when no key is configured unless an explicit dev flag is set, or re-fetch BOG's receipt before settling.
  - Add `BOG_PUBLIC_KEY` (`sync: false`) to `render.yaml` and `render.md`.
  - Refuse to boot in production without the key.

### H8. Deleting a product that has photos, variants or options fails on a foreign key
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/entity/ProductImage.java:38`, `apps/api/src/main/java/com/esyback/ecommerce/service/ProductService.java:261`. Duplicate reports; the second was filed as medium.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - `deleteProduct` only calls `productRepository.delete(product)`.
  - `ProductImage`, `ProductVariant` and `ProductOption` each have a non-null FK to Product with no cascade, `@OnDelete` or prior child delete.
  - `ApiErrorAdvice` only maps `ResponseStatusException`, and no test covers product deletion.
- **Scenario:** A merchant uploads one photo and clicks Delete. The database rejects the delete and the request returns 500. The product cannot be deleted until every image is removed and variants are switched off.
- **Fix:**
  - In `deleteProduct`, bulk-delete variants, options and images for the product first, in the same transaction. Add an image `deleteByProduct` method that avoids loading the bytes.
  - Alternatively, add `@OnDelete(CASCADE)` and ship the matching ALTER, because `ddl-auto=update` will not change existing constraints.

### H9. A CSV price with a large exponent pins the CPU and exhausts the heap, even on dry run
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/ProductImportService.java:203`.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - `new BigDecimal("1e50000000")` passes the sign and scale checks, and `setScale(2)` then materialises an integer of about 166 million bits. Measured: 17.6 s of CPU for one cell.
  - Only `NumberFormatException` is caught, so `1e999999999` throws an uncaught `ArithmeticException` and returns 500.
  - The cell is parsed before the dryRun branch.
- **Scenario:** A phone-verified store owner uploads a 10 KB CSV of 500 such rows to `?dryRun=true`. That is hours of CPU on one request thread plus heap pressure on the single shared free instance. A few parallel requests take every store down.
- **Fix:** Before `setScale`, require `precision() - scale() <= 8` and a scale between 0 and 2, or match the raw cell against `^\d{1,8}([.,]\d{1,2})?$`. Report a failure as a row error.

### H10. The order number has only ~72k possible values under a global unique constraint
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:77`.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - The number is `"ESY-" + nextInt(1000,9999) + "-" + nextInt(1,9)`, which gives 8,999 × 8 = 71,992 values.
  - `order_number` is unique across all tenants.
  - Nothing checks for an existing number or retries.
- **Scenario:** With N orders, each checkout fails with probability N/71,992. The first collision is expected around 320 orders, about 14% of checkouts fail at 10k orders, and checkout stops entirely once the space is used up. A collision surfaces as an unhandled 500.
- **Fix:** Use a sequence or a much larger random space (10 or more base32 characters) and retry on a unique violation.

### H11. The callback settles by `external_order_id` only; the BOG order id and paid amount are never checked
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/controller/PaymentController.java:103`.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - `body.order_id` is never compared with `Order.bogOrderId`, and the amount and currency are never compared with the order total.
  - One global public key verifies callbacks for every merchant.
  - The non-PAID branch of `settlePayment` applies FAILED or REFUNDED to an order in any state, without releasing stock.
  - `partial_completed` is mapped to PAID for the full total.
- **Scenario:** Any BOG merchant, for example another esy tenant, creates a ₾0.01 order with `external_order_id` set to a victim's pending order number and pays it. BOG sends a genuinely signed "completed" callback, and the victim's ₾1000 order becomes PAID. A signed "rejected" can flip a delivered order to FAILED and CANCELLED.
- **Caveat:** This assumes BOG lets a merchant choose `callback_url` and `external_order_id`, which could not be checked from the repo.
- **Fix:**
  - Require `order_id == bogOrderId` and a matching amount and currency, or re-fetch the receipt with the tenant's own credentials.
  - Apply FAILED only from PENDING through a conditional UPDATE, and REFUNDED only from PAID or REFUND_PENDING.

### H12. `POST /api/tenant` creates stores for unauthenticated callers
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/controller/TenantController.java:101`.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - `SecurityConfig` permits `/api/tenant/**`, and `createTenant` has no `@PreAuthorize`, unlike every other write in the class.
  - The tenant is saved first. The OWNER membership is added only if an authentication happens to be present.
  - `PhoneRequiredFilter` lets anonymous writes through.
- **Scenario:** `curl -X POST https://esy.ge/api/tenant -d '{"name":"Nike Official","subdomain":"nike","logoUrl":"https://attacker/pixel.png"}'` with no cookie returns 201. The result is an active, publicly listed store that permanently squats the subdomain and name, has no owner, and can only be removed by a platform admin. It is scriptable, and it bypasses the verified-phone rule.
- **Fix:** Add `@PreAuthorize("isAuthenticated()")`, resolve the user first (401 if there is none), and create the tenant and its OWNER membership in one transaction.

### H13. Unauthenticated Java deserialization of the OAuth request cookie
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/security/HttpCookieOAuth2AuthorizationRequestRepository.java:118`.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - The `ESY_OAUTH2_AUTH_REQUEST` cookie is decoded from base64url and passed to `ObjectInputStream.readObject()`.
  - It is not signed, there is no ObjectInputFilter, and there is no global `jdk.serialFilter`.
  - `removeAuthorizationRequest` runs before any state comparison, and the class cast only happens after the whole object graph has been read.
- **Scenario:** An anonymous `GET /login/oauth2/code/google?code=x&state=y` carrying a crafted cookie of a few KB holds a CPU core for minutes. That is a certain denial of service on the single free instance. Remote code execution depends on a usable gadget chain on the classpath; none was built.
- **Fix:** Serialize the request as JSON, or HMAC-sign the cookie and verify before decoding, and add an allowlisting ObjectInputFilter.

---

## Medium

### M1. SMS, email and BOG calls run while a pooled DB connection and the order row lock are held
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:640`.
- **Verdict:** CONFIRMED.
- **What is wrong:** Notifications are sent synchronously inside the class-level `@Transactional`, before commit and after `claimStatus` has locked the order row. Open-in-view is on by default and the Hikari pool is 10.
- **Scenario:** The SMS or email provider slows down (time-outs of 10+10 s and 15+15 s). Ten concurrent status changes, checkouts or PayReturn polls take every pooled connection. The health check then fails and Render restarts the instance.
- **Fix:** Send after commit (`@TransactionalEventListener(AFTER_COMMIT)` or an async executor), set `spring.jpa.open-in-view=false`, and keep BOG calls out of transactions.

### M2. With the documented production `APP_PUBLIC_BASE_URL`, every BOG return lands on a platform 404
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/controller/PaymentController.java:149`.
- **Verdict:** CONFIRMED.
- **What is wrong:** The success and fail URLs are built from the public base URL. `.env.example` says to set it to `https://www.esy.ge`, which is the platform host, and the platform router has no `pay/return` route.
- **Scenario:** The shopper is returned to PlatformNotFound. The PayReturn poll and receipt reconcile never run, there is no retry after a failed payment, and the shopper gets no confirmation. Settlement itself still happens through the callback.
- **Fix:** Use the base URL only for `callback_url`. Build the redirects from the store's own origin, or add a platform `/pay/return` that forwards to the store.

### M3. Revenue, average order and best sellers count unpaid card orders (PENDING)
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:805`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `countsAsRevenue` excludes only CANCELLED and REFUNDED. There is no expiry job for abandoned PENDING orders. Billing's "sales" figure (`isBillable`) excludes them, so revenue and sales disagree on the same row.
- **Scenario:** A ₾300 abandoned bank checkout inflates analytics, Finances, top sellers and admin billing revenue indefinitely.
- **Fix:** Count only PAID, NONE and REFUND_PENDING (or reuse `isBillable` minus REFUNDED) so that revenue, average, top sellers and billing agree.

### M4. Cancelling a paid card order wipes the platform fee while the merchant keeps the money
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:835`.
- **Verdict:** CONFIRMED.
- **What is wrong:** A MANAGER can move a PAID order to CANCELLED, even from SHIPPED, without a refund. `feesOwedOf`, `isBillable` and `countsAsRevenue` all drop every CANCELLED order whatever its payment status.
- **Scenario:** A ₾1000 paid order is shipped and then marked cancelled. The platform bills 0, the order disappears from revenue, and the shopper receives a "cancelled" email. Doing this to every order avoids all commission.
- **Fix:** Base the fee and revenue exclusion on money actually returned, keeping PAID+CANCELLED orders billable, or refuse to cancel a PAID order without a full refund. Flag paid-but-cancelled orders in admin billing.

### M5. Order SMS go to any phone number the shopper types, including foreign numbers, with no limit
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:712`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `recipientPhone` prefers the unverified delivery phone. `SmsSender` accepts any 11-15 digit non-995 number. Nothing caps orders or SMS per account.
- **Scenario:** An attacker runs a store with a ₾0.01 product and scripts orders, each with a different premium-rate number, plus three status-change texts per order. The platform pays for SMS pumping, and the texts carry esy's sender name and an attacker-chosen subdomain link.
- **Fix:** Text only the account's verified phone, or verify a delivery phone first. Restrict sends to +995 5XX mobiles and add per-account and per-store caps.

### M6. Order times are zone-less `LocalDateTime` values, but the client reads them as local time
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/controller/OrderController.java:154`, `apps/web/src/manager/ManagerOverview.jsx:85`. The second report was filed as low.
- **Verdict:** CONFIRMED.
- **What is wrong:** `placed` is a `LocalDateTime.now()` from a UTC container, serialised without an offset, and parsed with `new Date(v)` in `kit.jsx`, `ManagerOverview`, `ManagerOrders` and `SettingsStore`. TenantController added `placedAt` (with Z) for the detail screen only.
- **Scenario:** A new order shows "4 hours ago". An order placed between 00:00 and 04:00 Tbilisi time is dated the previous day.
- **Fix:** Emit an Instant (`placedAt` with Z) in every order map and read it everywhere.

### M7. A blank `GOOGLE_CLIENT_ID` (as `.env.example` instructs) crashes app startup
- **Where:** `docker-compose.yml:60`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `${GOOGLE_CLIENT_ID:-}` passes an empty string, which overrides the yml default. Spring Boot 3.2's `OAuth2ClientProperties.validateRegistration` then throws "Client id must not be empty."
- **Scenario:** A new contributor runs `docker compose up` and the app never starts. The documented "Gmail inert, dev-login still works" mode cannot be reached.
- **Fix:** Use `${GOOGLE_CLIENT_ID:-your-google-client-id}` (and the same for the secret), or register the client only when the id is set.

### M8. Search "quick filters" and "trending" rows run a text search for their own labels
- **Where:** `apps/web/src/pages/SearchOverlay.jsx:48`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `run(label)` navigates to `/?search=<label>`, which the backend matches against product titles. The label is also saved as a recent search.
- **Scenario:** "Under 50 ₾" returns "No results for «Under 50 ₾»".
- **Fix:** Map the chips to real collection parameters (min/max/stock), drop the ones the data cannot support (sale, free shipping, best sellers), and stop recording them as recent searches.

### M9. Product cards cannot be opened with a keyboard or screen reader
- **Where:** `apps/web/src/components/glow/GlowProductCard.jsx:117`.
- **Verdict:** CONFIRMED.
- **What is wrong:** The card is a `<div onClick>` with no role, tabIndex or link. The only focusable element is "+", labelled just "Add".
- **Scenario:** Keyboard users cannot open any product from the home or related grids. In the grid3 and addbtn-none layouts a card has no focusable element at all.
- **Fix:** Render the title or photo as a `<Link>`, and put the product name in the add button's label.

### M10. A variant refetch makes the bag receive a different variant from the one shown
- **Where:** `apps/web/src/components/store/VariantPicker.jsx:49`.
- **Verdict:** CONFIRMED.
- **What is wrong:** When `variants` changes reference, the effect reports `rowFor(variants, initial)` to the parent, while the picker's local `picked` state keeps the shopper's choice.
- **Scenario:** Any write invalidates all queries. If stock changed in the meantime, the buttons still show size 40 but "Add to bag" adds size 38.
- **Fix:** Report `rowFor(variants, picked)`, or lift `picked` into the parent.

### M11. The Markdown emphasis pass corrupts link hrefs and `target="_blank"`
- **Where:** `apps/web/src/utils/markdown.js:30`.
- **Verdict:** CONFIRMED (reproduced in node).
- **What is wrong:** The `_` and `*` regexes run over the generated `<a>` tags, including their attributes.
- **Scenario:** `[size guide](https://shop.example/size_guide)` renders as `href=".../size<em>guide" target="</em>blank"`, which gives a broken link and a window named "</em>blank".
- **Fix:** Replace links with placeholders before the emphasis pass and restore them afterwards.

### M12. The variant picker can make an in-stock combination unreachable
- **Where:** `apps/web/src/components/store/VariantPicker.jsx:82`.
- **Verdict:** CONFIRMED.
- **What is wrong:** A value is disabled unless it is in stock together with the current value on the other axis.
- **Scenario:** With rows (38,red,5), (38,blue,0), (40,red,0) and (40,blue,3), the picker opens on (38,red). Both 40 and blue are disabled, so (40,blue) can never be selected and the sale is lost.
- **Fix:** Keep a value clickable if it is buyable with any value of the other axis, and move the other axis to an in-stock value when needed.

### M13. Card quick-add and the bag "+" ignore stock, so sold-out items can be paid for
- **Where:** `apps/web/src/components/glow/GlowProductCard.jsx:99`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `showAdd` never checks `p.quantity`, and the bag "+" has no cap. The server does not block it either (see M34).
- **Scenario:** A product with quantity 0 is added from the grid and paid by card. `commitStock` logs OVERSELL and the store must refund.
- **Fix:** Hide or disable quick-add when quantity is 0 or less, cap bag quantities at known stock, and add the server check.

### M14. The SMS length counter undercounts `{order}`, so the billed units shown are wrong
- **Where:** `apps/web/src/admin/AdminIntegrations.jsx:45`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `{order}` is counted as `#99999` (6 characters), but the real value is always `ESY-1234-5` (10 characters).
- **Scenario:** The counter says a template is 69 characters, 1 unit, but each message is really 73 characters and bills 2 units.
- **Fix:** Count `{order}` at its longest real length, ideally as reported by the server.

### M15. Retrying after a partial save failure creates a duplicate product or duplicate photos
- **Where:** `apps/web/src/components/owner/ProductEditorDialog.jsx:152`.
- **Verdict:** CONFIRMED.
- **What is wrong:** The created id is thrown away when a later step fails, `isEdit` stays false, and `staged` is never cleared. There is no client-side 5 MB check.
- **Scenario:** Create succeeds but a 7 MB photo gets 413. Pressing Save again creates a second live product. In edit mode, a variants failure followed by a retry re-uploads the photos.
- **Fix:** Keep the saved id and switch to update mode after create, clear `staged` after a successful upload, check the 5 MB limit on the client, and report which step failed.

### M16. The variant save sends every row's stale stock and overwrites sales
- **Where:** `apps/web/src/components/owner/VariantEditor.jsx:166`.
- **Verdict:** CONFIRMED.
- **What is wrong:** The document is adopted once, and each PUT sends all of `doc.rows`. `ProductVariantService.replace` writes any stock value it is sent.
- **Scenario:** M sells 2 (5 becomes 3) while the editor is open. Editing L's stock writes M back to 5, and the store oversells.
- **Fix:** Send stock only for edited cells, or send deltas or expected previous values and have the server reject a conflict.
- **Severity note:** The verifier argued for High.

### M17. Product save writes back the stock read when the editor opened, undoing sales made since
- **Where:** `apps/web/src/components/owner/ProductEditorDialog.jsx:147`, `apps/api/src/main/java/com/esyback/ecommerce/service/ProductService.java:243`. Duplicate reports.
- **Verdict:** CONFIRMED.
- **What is wrong:** The editor always sends `quantity`, and `updateProduct` sets it unconditionally. There is no `@Version` and no exemption for variant products.
- **Scenario:** 10 in stock, 3 sell while the editor is open, the merchant fixes a typo and saves, and stock is back to 10. For variant products, `product.quantity` drifts away from the sum of the rows.
- **Fix:** Send quantity only when the field changed, or apply it as a delta. Add optimistic locking. Ignore quantity in `updateProduct` when variants are enabled.

### M18. Turning off the couriers and express in one save always fails, on every retry
- **Where:** `apps/web/src/manager/SettingsDelivery.jsx:129`.
- **Verdict:** CONFIRMED.
- **What is wrong:** All switch-offs have rank 2 and the stable sort keeps server row order, so the Tbilisi courier is switched off before express. `guardExpressNeedsCourier` refuses that.
- **Scenario:** The same failing order is sent on every Save. The owner has to save express on its own first.
- **Fix:** Order express first among switch-offs and couriers first among switch-ons.

### M19. A failed chunk prefetch on hover or idle warm-up reloads the page
- **Where:** `apps/web/src/router/prime.js:56`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `lazyScreen`'s rejection handler calls `location.reload()`, and `prefetchRoute` calls the same `route.lazy()`.
- **Scenario:** After a deploy, hovering a link reloads the page under the cursor and loses the in-memory bag and any half-filled form. On a flaky network the home page reloads itself from idle warm-up. If sessionStorage is blocked, a chunk that keeps failing causes an endless reload loop.
- **Fix:** Swallow prefetch failures and keep the reload-once recovery for real navigations only. Key the guard on the failing chunk, and stop retrying when storage is unavailable.

### M20. A hard-coded 2% fee makes the back office show wrong merchant payouts
- **Where:** `apps/web/src/core/money.js:26`, `apps/web/src/manager/ManagerOrders.jsx:62`. The second report was filed as low.
- **Verdict:** CONFIRMED.
- **What is wrong:** `FEE_PERCENT = 2`, and the list computes `total - feeOf(total)`. The server charges the admin-configurable rate on goods only and freezes it per order. REFUND_PENDING and partly refunded orders still show a full payout.
- **Scenario:** ₾100 of goods plus ₾10 delivery shows ₾107.80 in the list but ₾108 on the detail screen. At a 5% admin rate, the list, the product editor's "you receive", the overview and the settings hints still say 2%.
- **Fix:** Use `order.serviceFee` (add it to the list DTO) and the `serviceFeeRate` the stats endpoints already return. Payout = goods − serviceFee − refunded.

### M21. A confirmed partial refund becomes REFUNDED: the rest can never be refunded and the whole order leaves revenue
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/BogPaymentService.java:427`, `apps/api/src/test/java/com/esyback/ecommerce/service/RefundTest.java:143`. Duplicate reports.
- **Verdict:** CONFIRMED.
- **What is wrong:**
  - `refunded_partially` maps to REFUNDED, and `settlePayment` writes it unconditionally.
  - `requestRefund` and `claimRefund` accept only PAID or REFUND_PENDING.
  - `countsAsRevenue` drops REFUNDED orders entirely.
  - The test fires three refunds back to back and never lets the confirmation arrive.
- **Scenario:** After refunding ₾10 of ₾200, the callback arrives. A second partial refund gets 409, and ₾200 leaves revenue.
- **Fix:** Keep the order refundable while `refundedAmount < total` (a PARTIALLY_REFUNDED state, or back to PAID), subtract `refundedAmount` from revenue, and add a refund → settle → refund test.

### M22. Per-store BOG secrets are encrypted with a key published in the repo unless an env var is set by hand
- **Where:** `apps/api/src/main/resources/application.yml:163`, `apps/api/src/main/java/com/esyback/ecommerce/security/SecretCipher.java:36`. Duplicate reports.
- **Verdict:** CONFIRMED.
- **What is wrong:** The fallback is `dev-local-esy-secret-encryption-key-override-in-prod`. There is no boot check, and `render.yaml` and `render.md` never set `APP_SECRET_ENC_KEY`.
- **Scenario:** Anyone with a DB dump or backup can decrypt every merchant's BOG client secret. Setting the real key later makes the stored secrets undecryptable. This depends on dashboard state that cannot be seen from the repo.
- **Fix:** Fail boot when the key is blank or equals the dev default outside dev, and add `APP_SECRET_ENC_KEY` (`generateValue: true`) to `render.yaml`.

### M23. No per-account cap on OTP codes, so phone verification can be brute-forced and used for SMS pumping
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/PhoneVerificationService.java:141`.
- **Verdict:** CONFIRMED.
- **What is wrong:** The 5-attempt limit is per code, and a new code is allowed every 60 s indefinitely by rotating numbers. Foreign numbers are accepted.
- **Scenario:**
  - About 1,440 rounds a day gives roughly a 51% chance of "verifying" a stranger's number, which squats it so the real owner gets PHONE_TAKEN.
  - The same loop sends 1,440 texts a day per account.
  - Five sends exhaust a victim number's daily cap.
- **Fix:** Add per-account daily caps on sends and failed verifies with escalating lockout, a global budget and alert, and a Georgian-mobile-only destination rule.

### M24. OTP send throttles are check-then-act, so parallel requests bypass the cooldown and daily cap
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/PhoneVerificationService.java:128`.
- **Verdict:** CONFIRMED.
- **What is wrong:** The cooldown and cap are read before the blocking SMS send and recorded only afterwards in `issue()`. `issue()` also mutates the ArrayDeque without synchronisation.
- **Scenario:** 100 parallel `send-code` requests to a victim send 100 billed texts.
- **Fix:** Reserve atomically before sending (compute or putIfAbsent, plus a synchronized counter) and roll back the reservation if the send fails.

### M25. Removing an address from `ADMIN_EMAILS` never revokes ADMIN for a live session
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/AdminService.java:417`.
- **Verdict:** CONFIRMED.
- **What is wrong:** The ADMIN row stays in `users_roles` and is reconciled only at OAuth sign-in. `revokeAdmin` refuses addresses that come from the env list. `POST /api/auth/token` renews sessions indefinitely.
- **Scenario:** An offboarded admin keeps full `/api/admin/**` power by renewing the token daily, while the admin list no longer shows them.
- **Fix:** Check the effective allowlist per request (drop ROLE_ADMIN otherwise), or reconcile at startup and whenever the list changes. Stop `/token` from extending sessions without re-syncing.

### M26. Any ADMIN can redirect every merchant's BOG client secret to an arbitrary URL
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/controller/AdminConfigController.java:111`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `bogAuthUrl` and `bogBaseUrl` accept any http(s) URL, and `accessToken()` POSTs `Basic base64(clientId:decryptedSecret)` there. The change writes no audit row.
- **Scenario:** A runtime-granted or hijacked admin harvests every merchant's live credentials as token caches expire, or points `baseUrl` at a phishing payment page.
- **Fix:** Allowlist the BOG hosts (or make the overrides env-only), require https, and audit every change.

### M27. Semicolon-delimited CSV, Excel's default in decimal-comma locales, is refused
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/web/Csv.java:60`.
- **Verdict:** CONFIRMED.
- **What is wrong:** Only commas separate fields, and a bare CR is dropped.
- **Scenario:** On Georgian regional settings Excel saves `title;description;...`, and the import fails with IMPORT_NO_COLUMN "no title column". A "CSV (Macintosh)" file becomes a single row (IMPORT_NO_ROWS).
- **Fix:** Detect the delimiter from the header line and treat a lone CR as a line break.

### M28. Thousands-separated prices import at one thousandth of their value
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/ProductImportService.java:191`.
- **Verdict:** CONFIRMED.
- **What is wrong:** Every comma becomes a decimal point, and the precision check strips trailing zeros first.
- **Scenario:** `"1,250"` imports as 1.25 and `"2,000"` as 2.00. The products go live at a 1000× discount.
- **Fix:** Treat a comma as decimal only when 1-2 digits follow it at the end of the value, and reject a single comma followed by exactly three digits as ambiguous.

### M29. Stock commit and restock are unlocked read-modify-writes, so concurrent orders lose updates
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/ProductService.java:103`, `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:314`. Duplicate reports.
- **Verdict:** CONFIRMED.
- **What is wrong:** `commitStock`, `recordStockTaken` and `restock` read quantity into Java and save it back. The code base has no `@Version`, `@Lock` or FOR UPDATE anywhere.
- **Scenario:** Two callbacks both read 5 and both write 4, with no OVERSELL log. `stockTaken` is wrong too, so a later cancel returns the wrong amount.
- **Fix:** Use `UPDATE ... SET quantity = GREATEST(0, quantity - :n) WHERE id = :id`, or PESSIMISTIC_WRITE, and derive `stockTaken` from the same statement.

### M30. Saving the variant grid recreates every row id, so paid orders take no stock and carts break
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/ProductService.java:82`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `ProductVariantService.replace` deletes and re-inserts every row. `commitStock` looks up the old id with `ifPresent` only, and logs nothing when the row is gone.
- **Scenario:**
  - A grid save between order and payment means the decrement is silently skipped and the item can be sold again.
  - Every cart holding that product fails with "That combination is no longer available".
- **Fix:** Upsert rows and keep the ids of combinations that still exist. In `commitStock`, fall back to the stored combination label and log when no row is found, as `restock` already does.

### M31. Unpaid card orders stay live: bank-call failures stay NONE/PLACED, abandoned ones stay PENDING forever
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/controller/PaymentController.java:70`.
- **Verdict:** CONFIRMED.
- **What is wrong:** The order commits before BOG is called, and nothing compensates when that call fails. There is no `@Scheduled` expiry.
- **Scenario:** BOG is down, so the order is left PLACED/NONE, looks like a free order, and is billed and counted as revenue. Each retry adds another. Abandoned checkouts stay PENDING indefinitely, and staff can ship them.
- **Fix:** Create card orders as PENDING up front and mark them FAILED when `createPayment` throws. Expire stale PENDING orders through a receipt reconcile. Count only paid or genuine free orders.

### M32. The callback acknowledges 200 on every processing error, so a transient failure loses the payment confirmation
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/controller/PaymentController.java:108`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `catch (Exception)` around both parsing and `settlePayment` always returns 200, so BOG stops retrying. The only reconcile path is the shopper's own polling of `/status`.
- **Scenario:** A brief DB failure during "completed" leaves the order PENDING with the money taken.
- **Fix:** Return 5xx for non-parse failures (`settlePayment` is idempotent) and add a periodic receipt reconcile.

### M33. Any refund, however small, removes the order's entire platform fee
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:836`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `feesOwedOf` bills only PAID and NONE orders, and there is no minimum refund amount.
- **Scenario:** Refunding ₾0.01 on each order writes off the whole 2% fee for every one of them.
- **Fix:** Pro-rate the fee by `(total − refunded)/total`, or write it off only on a full refund.

### M34. Checkout never checks stock and accepts unbounded quantities
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:101`.
- **Verdict:** CONFIRMED.
- **What is wrong:** Quantity is only floored at 1. There is no stock comparison and no `@Max`.
- **Scenario:** Sold-out goods are charged in full. On the free flow, `quantity=100000` zeroes every stock row with no payment. A huge quantity can overflow the total and return 500.
- **Fix:** Return 409 with the offending line when quantity exceeds stock, cap quantity, and flag an oversell at PAID.

### M35. The free-order endpoint is not restricted to stores without a payment provider
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/controller/OrderController.java:39`.
- **Verdict:** CONFIRMED.
- **What is wrong:** `POST /api/orders` never checks `bogPaymentService.isConfigured(tenant)`. Only the UI hides it.
- **Scenario:** A shopper on a card store creates a PLACED/NONE order directly. Stock is taken, the "placed" SMS goes out, and the order is billed and counted as revenue without any payment.
- **Fix:** Return 409 when BOG is configured, or make the allowed payment flows an explicit per-store setting.

### M36. Any store owner can attach arbitrary accounts as staff or owner
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/service/MembershipService.java:135`.
- **Verdict:** CONFIRMED.
- **What is wrong:** Grants take effect immediately with no invitation or consent. A 404 versus a 200 reveals whether an email has an account, and the 200 returns the person's username and real name.
- **Scenario:** An attacker with a throwaway store enumerates emails and collects names. They can make a victim the sole owner of a scam store and then remove themselves.
- **Fix:** Use a pending invitation that the target must accept, give the same response whether or not the account exists, and expose names only after acceptance.

### M37. `POST /api/auth/token` hands the session JWT to page JavaScript and renews it without limit
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/controller/AuthController.java:89`.
- **Verdict:** CONFIRMED.
- **What is wrong:** Any cookie-authenticated caller gets a fresh 24-hour Bearer token in the JSON body. Logout cannot revoke it. The web app never calls this endpoint.
- **Scenario:** An XSS in one store exfiltrates a portable token valid on every host, admin included, and renews it indefinitely.
- **Fix:** Remove the endpoint. If a non-browser client needs it, refuse cookie-authenticated callers and add token versioning or a jti denylist.

### M38. `PhoneRequiredFilter` is bypassed by percent-encoding a letter of `/api`
- **Where:** `apps/api/src/main/java/com/esyback/ecommerce/security/PhoneRequiredFilter.java:68`.
- **Verdict:** CONFIRMED.
- **What is wrong:** The filter matches the raw `getRequestURI()`, while MVC routes on the decoded path, and StrictHttpFirewall allows `%61`.
- **Scenario:** An unverified account sends `POST /%61pi/tenant` and skips the phone gate for every write. The order and payment controllers re-check, so the money paths are still protected.
- **Fix:** Match on the decoded, normalised servlet path, or refuse every non-safe request from an unverified account unless its decoded path is exempt.

---

## Low

Format for each item: **Title**: `file:line` (verdict). What is wrong. Scenario. Fix.

### Payments, orders and delivery (API)
- **Every boot drops and re-adds a CHECK constraint under an ACCESS EXCLUSIVE lock**: `apps/api/src/main/java/com/esyback/ecommerce/config/SchemaMigrations.java:63` (CONFIRMED). The drop and re-add run on every boot, as two autocommit statements, with no staleness check. During an overlapping deploy, the ALTER waits behind an in-flight checkout's transaction and stalls `store_memberships` queries. If the ADD fails, the constraint is left dropped. Fix: compare with `pg_constraint` first; use one transaction with a `lock_timeout`.
- **The back-office order list is unpaginated and runs one lazy items query per order**: `apps/api/src/main/java/com/esyback/ecommerce/controller/TenantController.java:253` (CONFIRMED). 5,000 orders means 5,001 SELECTs, repeated after every write. Fix: a Pageable or keyset query, and a grouped COUNT or fetch join for the item count.
- **The refund Idempotency-Key is a new random UUID per call**: `apps/api/src/main/java/com/esyback/ecommerce/service/BogPaymentService.java:342` (CONFIRMED). BOG can never deduplicate a retry, so the Javadoc's claim of protection is false. Fix: derive the key from the order and the claimed refund, or persist one key per claim.
- **REFUND_PENDING has no reconcile path**: `apps/api/src/main/java/com/esyback/ecommerce/controller/PaymentController.java:129` (CONFIRMED). If the refund callback is missed, the order shows "being refunded" forever. Billing figures are unaffected. Fix: a scheduled or owner-triggered `fetchReceiptStatus` sweep.
- **The BOG token cache survives a live/sandbox switch, and a rejected token is never evicted**: `apps/api/src/main/java/com/esyback/ecommerce/service/BogPaymentService.java:209` (CONFIRMED). After an env flip, checkout can return 502 for up to about an hour. Fix: key the cache on (authUrl, clientId, secret hash); evict and retry once on 401 or 403.
- **The BOG token cache keyed by clientId alone lets one store use another merchant's bank session**: `apps/api/src/main/java/com/esyback/ecommerce/service/BogPaymentService.java:209` (CONFIRMED). An owner saves store B's client ID with a junk secret, and while B's token is cached, A's checkouts and refunds run on B's BOG account. Fix: key the cache by tenant, or clientId plus a secret hash; enforce one store per bogClientId; evict on credential change. *Severity note: the verifier argued for Medium.*
- **A non-PAID settlement overwrites any state, and a PAID after FAILED is dropped**: `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:361` (CONFIRMED). A late "rejected" cancels a shipped or delivered order. "Completed" after "rejected" leaves the money with no refund path. Fix: FAILED only from PENDING via a conditional UPDATE; cancel through `claimStatus`; flag a late PAID; refuse SHIPPED while payment is PENDING.
- **The BOG basket omits the delivery fee**: `apps/api/src/main/java/com/esyback/ecommerce/service/BogPaymentService.java:157` (CONFIRMED). `total_amount` does not equal the basket sum on courier orders, and BOG might reject it (unverified). Fix: send `purchase_units.delivery.amount` or a delivery line; correct the comment.
- **Unbounded delivery prices let a merchant avoid commission**: `apps/api/src/main/java/com/esyback/ecommerce/service/DeliveryService.java:121` (CONFIRMED). Pickup priced at ₾1500 plus a ₾0.01 item gives a fee of ₾0.00. Fix: an admin-configurable cap with pickup forced to 0, or commission above a delivery allowance.
- **Lazy creation of delivery rows can duplicate a route and break checkout**: `apps/api/src/main/java/com/esyback/ecommerce/service/DeliveryService.java:249` (CONFIRMED). Two concurrent first visits insert 8 rows. `findByTenantAndRoute` then throws, `feeFor` returns 500 at every checkout, and the store stays broken until fixed by hand. Fix: a unique (tenant_id, route) constraint, or seed the rows at store creation.
- **Courier orders are accepted with no delivery address**: `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:188` (CONFIRMED). The fee is charged and the ship fields are null or blank. Fix: 400 when a courier route has no address; reject blank fields.
- **The "order placed" SMS and email go out for card checkouts before any payment exists**: `apps/api/src/main/java/com/esyback/ecommerce/service/OrderService.java:150` (CONFIRMED). Abandoned or failed checkouts still get the notice, and nothing is sent when payment actually succeeds. Fix: send from the free-flow path and from the PAID claim winner.

### Infrastructure and configuration
- **SQL echo and Spring Security DEBUG logging are on in production**: `apps/api/src/main/resources/application.yml:59` and `apps/api/src/main/resources/application.yml:56` (CONFIRMED; duplicates merged). `show-sql`, `format_sql` and DEBUG logging are hard-coded with no override. This adds CPU and I/O on the free instance, buries real warnings, and may put PII in logs. Fix: `${JPA_SHOW_SQL:false}` and INFO by default, enabled only in dev or compose.
- **There is no `.dockerignore`**: `Dockerfile:10` (CONFIRMED). Host `node_modules` and `dist` overlay the `npm ci` tree, so local builds diverge from Render's. The claim that `.env` ends up in the image is wrong (it is only in the build context). Fix: exclude `**/node_modules`, `dist`, `target`, `.git`, `.env*`.
- **Unauthenticated Valkey is published on 0.0.0.0:6379**: `docker-compose.yml:27` (CONFIRMED). Anyone on the LAN can `SET config:app.admin-emails` and become admin of the developer's stack, or redirect BOG URLs. Fix: drop the port mapping or bind it to 127.0.0.1; optionally set `requirepass`.
- **Compose passes an empty `JWT_SECRET` and `APP_SECRET_ENC_KEY`**: `docker-compose.yml:69` (CONFIRMED). The keys become hashes of the empty string, and the compose comments are wrong. Fix: `${JWT_SECRET:?...}`, reject blank secrets in `JwtUtil` and `SecretCipher`, add the variable to `.env.example`.
- **The API test suite is never run by any build, hook or deploy**: `Dockerfile:21` (CONFIRMED). The build uses `-DskipTests`, there is no CI, and the pre-commit hook only checks i18n. A push to main auto-deploys whatever the tests say. Fix: run `mvn -B test` in a CI job that gates main, with `schema.json` available for the parity test.
- **Spring Boot is pinned to 3.2.0, which is out of support**: `apps/api/pom.xml:8` (CONFIRMED). The managed Tomcat 10.1.16 and Framework 6.1.1 predate known CVE fixes. Exploitability was not shown. Fix: move to a supported 3.5.x patch and the matching springdoc and jjwt versions.
- **The committed MCP config auto-runs unpinned `@latest` npm packages**: `.mcp.json:24` (PLAUSIBLE). A compromised package would run with the developer's privileges and secrets. Fix: pin exact versions.
- **Demo stores and sample products are seeded into production with no owner**: `apps/api/src/main/java/com/esyback/ecommerce/config/DataInitializer.java:25` (PLAUSIBLE). There are 16 ownerless, orderable stores, and their names and subdomains are squatted. Seeding is documented and an admin can suspend these stores. Fix: seed only roles and `main` unconditionally; put the demo data behind `app.seed-demo` or a dev profile.

### Tests
- **No test exercises the store-access guard across two stores**: `apps/api/src/test/java/com/esyback/ecommerce/controller/TenantCoverControllerTest.java:175` (CONFIRMED). Reintroducing the ADMIN short-circuit, or a `?tenant=` mix-up, would pass the suite. Fix: MockMvc cases for an owner of A on B's host, on `manager?tenant=B`, and for ADMIN with no membership, all expecting 403.
- **Tests read the developer's live Redis config store and real provider keys**: `apps/api/src/main/resources/application.yml:12` (CONFIRMED). A local fee-rate override breaks the fee assertions, and exported SMS keys send real texts. Fix: a test profile pointing Redis at an unused port or a mocked ConfigStore, with provider keys blanked.

### Auth, accounts and admin (API)
- **Immediate admin revocation misses accounts whose stored email is not lowercase**: `apps/api/src/main/java/com/esyback/ecommerce/service/UserService.java:158` and `apps/api/src/main/java/com/esyback/ecommerce/service/AdminService.java:427` (CONFIRMED; duplicates merged). `findByEmail` is case-sensitive, so a revoke returns success but ADMIN stays until the next sign-in. Fix: `findByEmailIgnoreCase`, and normalise on store.
- **Store sign-in never records the CUSTOMER membership when the OAuth funnel is on**: `apps/api/src/main/java/com/esyback/ecommerce/service/UserService.java:72` and `apps/api/src/main/java/com/esyback/ecommerce/security/OAuth2AuthenticationSuccessHandler.java:51` (CONFIRMED; duplicates merged). The callback always runs on the canonical platform host, so the storefront branch is dead code. No current reader of the data was found. Fix: pass the stashed `tenant_origin` store into `findOrCreateUser`.
- **Sign-in falls back to an email match and re-binds the account to the new provider identity**: `apps/api/src/main/java/com/esyback/ecommerce/service/UserService.java:39` and `apps/api/src/main/java/com/esyback/ecommerce/security/OAuth2AuthenticationSuccessHandler.java:51` (CONFIRMED; duplicates merged). `email_verified` is never checked and the provider id is silently overwritten. Whoever controls a reassigned or lapsed address takes over the account. Fix: treat (provider, sub) as the identity; link by email only when verified and no provider id exists; never overwrite a different one.
- **An unthrottled PHONE_TAKEN oracle lets any account enumerate registered phone numbers**: `apps/api/src/main/java/com/esyback/ecommerce/service/PhoneVerificationService.java:122` (CONFIRMED). The 409 answer comes before any throttle, and within the cooldown 409 versus 429 leaks membership without sending an SMS. Fix: rate-limit before the uniqueness check, or defer "taken" to the verify step. *Severity note: the verifier argued for Medium.*
- **The OTP attempt counter is unsynchronised**: `apps/api/src/main/java/com/esyback/ecommerce/service/PhoneVerificationService.java:231` (CONFIRMED). Concurrent guesses get more than 5 attempts per code. Fix: increment and test atomically inside `pending.compute`.
- **OTP codes, cooldowns and caps live only in process memory**: `apps/api/src/main/java/com/esyback/ecommerce/service/PhoneVerificationService.java:90` (PLAUSIBLE). A redeploy drops codes and resets limits, and the maps are never evicted. Fix: Redis with TTLs, or a table.
- **The account hub loads every order ever placed with per-order lazy queries**: `apps/api/src/main/java/com/esyback/ecommerce/controller/AccountController.java:85` (CONFIRMED). Hundreds of statements per load. Fix: page or cap the list; use a fetch join or projection.
- **The single-default-address rule is enforced only by read-then-write**: `apps/api/src/main/java/com/esyback/ecommerce/controller/AddressController.java:57` (CONFIRMED). A double submit gives two defaults. Fix: a partial unique index on `user_id WHERE is_default`, or a user row lock.
- **An address update can null required fields and fails with 500**: `apps/api/src/main/java/com/esyback/ecommerce/controller/AddressController.java:73` (CONFIRMED). Fix: re-run the required-field check after `apply()` and return 400.
- **Concurrent `grantAdmin` for the same address returns 500 instead of 409**: `apps/api/src/main/java/com/esyback/ecommerce/service/AdminService.java:397` (CONFIRMED). Fix: `saveAndFlush`, and map `DataIntegrityViolationException` to 409.
- **A failed Redis read is cached as "no override"**: `apps/api/src/main/java/com/esyback/ecommerce/service/ConfigStore.java:65` (CONFIRMED). A 2-second blip reverts the fee rate, SMS kill switch or BOG env to env values for 8 seconds, and orders freeze the wrong fee. Fix: serve the last good value on error; log at WARN.
- **The admin store list and billing load every order on the platform, several times per request**: `apps/api/src/main/java/com/esyback/ecommerce/service/AdminService.java:130` (CONFIRMED). Fix: grouped aggregate queries with the date range in SQL; a top-10 Pageable for recent orders.
- **The public `/docs` page runs an unpinned CDN script on the session origin, and the full spec is public**: `apps/api/src/main/java/com/esyback/ecommerce/controller/ScalarDocsController.java:30` (CONFIRMED). A compromised package could act with an admin's cookie. Fix: disable or gate the docs in production; pin the version and add SRI.
- **Live config and integration writes leave no audit trail**: `apps/api/src/main/java/com/esyback/ecommerce/controller/AdminConfigController.java:91` (CONFIRMED). Fee-rate, BOG-env and SMS kill-switch changes are untraceable. Fix: an AuditLog row per changed key recording actor and old → new value.
- **A config PUT applies earlier keys before a later key fails validation**: `apps/api/src/main/java/com/esyback/ecommerce/controller/AdminConfigController.java:92` (PLAUSIBLE). The response is 422 but the fee rate is already written. `AdminIntegrationsController` has the same shape. Fix: validate the whole body first, then apply in one batch.
- **The JWT filter costs a DB query and three signature verifications per request, assets included**: `apps/api/src/main/java/com/esyback/ecommerce/security/JwtAuthenticationFilter.java:56` (CONFIRMED). Fix: `shouldNotFilter` for non-API paths; parse once; cache the signing key.
- **The account active/locked flag is never enforced**: `apps/api/src/main/java/com/esyback/ecommerce/security/JwtAuthenticationFilter.java:58` (CONFIRMED). A deactivated account keeps access. This only matters after a manual DB change. Fix: require `isEnabled()` and `isAccountNonLocked()`; refuse inactive users at sign-in.
- **OAuth failures, including a sign-in slower than 3 minutes, strand store shoppers on the platform host**: `apps/api/src/main/java/com/esyback/ecommerce/config/SecurityConfig.java:82` (CONFIRMED). Fix: use the tenant origin in the failure handler; extend cookie life to 10-15 minutes.
- **A leftover `ESY_TENANT_ORIGIN` cookie redirects the next sign-in to the wrong store**: `apps/api/src/main/java/com/esyback/ecommerce/security/HttpCookieOAuth2AuthorizationRequestRepository.java:68` (PLAUSIBLE). Fix: expire the cookie when the new request has none, or store the origin inside the signed state.

### Tenancy and products (API)
- **Tenant is saved as a whole row, so concurrent requests silently undo each other**: `apps/api/src/main/java/com/esyback/ecommerce/service/TenantDesignService.java:77` (CONFIRMED). A draft save can revert a publish, or un-suspend a store. Fix: `@Version` (a nullable Long) with 409 on conflict, or at least `@DynamicUpdate`.
- **The public store directory loads and sorts every tenant in memory**: `apps/api/src/main/java/com/esyback/ecommerce/service/TenantService.java:88` (CONFIRMED). Fix: a paged `findByIsActiveTrueOrderByCreatedAtDesc` projection.
- **`createTenant` has a uniqueness race, unbounded field lengths and non-atomic ownership**: `apps/api/src/main/java/com/esyback/ecommerce/service/TenantService.java:110` (CONFIRMED). These produce 500s instead of 409s, and an ownerless store if the membership write fails. Fix: map the violation to 409, check lengths, use one transaction.
- **Every stats request loads the store's full order history, plus N+1 on items**: `apps/api/src/main/java/com/esyback/ecommerce/service/StoreStatsService.java:95` (CONFIRMED). Fix: date-bounded queries, SQL aggregates, a fetch join or `@BatchSize`.
- **The last-owner guard is check-then-act**: `apps/api/src/main/java/com/esyback/ecommerce/service/MembershipService.java:148` (CONFIRMED). Two concurrent demotions leave zero owners. Fix: lock the tenant or owner rows before counting.
- **An unknown subdomain or unserved host silently resolves to the "main" store**: `apps/api/src/main/java/com/esyback/ecommerce/service/TenantContextService.java:25` (CONFIRMED). A typo'd store URL renders main's catalogue and books orders against it. Fix: 404 for a named-but-missing store; treat non-`<sub>.<base>` hosts as platform.
- **Every revenue, fee and stats figure loads a store's entire order history**: `apps/api/src/main/java/com/esyback/ecommerce/repository/OrderRepository.java:19` (CONFIRMED). Fix: JPQL aggregates, a Pageable variant, an index on (tenant_id, created_at).
- **Every unknown path returns 200 index.html and runs DB reads**: `apps/api/src/main/java/com/esyback/ecommerce/config/SpaConfig.java:44` (CONFIRMED). Stale chunks fail with a MIME error, and scanner probes cost database queries. Fix: 404 for `assets/` and extension paths.
- **A stray quote or CR-only line endings silently merge CSV rows**: `apps/api/src/main/java/com/esyback/ecommerce/web/Csv.java:59` (CONFIRMED). Fix: open quoted mode only at the start of a field; error on an unterminated quote; treat a lone CR as a row break.
- **The controller-local upload-size handler is bypassed, and calls a CSV an image**: `apps/api/src/main/java/com/esyback/ecommerce/controller/ProductController.java:299` (CONFIRMED). Fix: move it to `ApiErrorAdvice` with a neutral "File too large" message and a stable code.
- **Missing length and magnitude bounds surface as 500s, and a passing dry run can fail on the real import**: `apps/api/src/main/java/com/esyback/ecommerce/service/ProductService.java:220` (CONFIRMED). Fix: `@Size(max=255)` on title and `@Digits(8,2)` on price, plus an import row error.
- **An axis value containing a line break splits into two values on read**: `apps/api/src/main/java/com/esyback/ecommerce/service/ProductVariantService.java:107` (CONFIRMED). The product becomes unbuyable. Only reachable through the API. Fix: reject or collapse `\r` and `\n`.
- **Variant price is stored with no validation**: `apps/api/src/main/java/com/esyback/ecommerce/service/ProductVariantService.java:144` (CONFIRMED). A negative price produces a negative order total. Fix: refuse a sign of 0 or less, scale above 2, or more than 8 integer digits.
- **No cap on photos per product, and the public serve path loads the whole blob every time**: `apps/api/src/main/java/com/esyback/ecommerce/service/ProductImageService.java:48` (CONFIRMED). Fix: a per-product cap (for example 12); answer 304 on If-None-Match before loading the data.
- **Upload validation falls back to the client-declared content type**: `apps/api/src/main/java/com/esyback/ecommerce/service/ImageUpload.java:46` (CONFIRMED). Arbitrary files can be hosted under the platform domain. Fix: return 415 when the sniff finds nothing.
- **The public product list accepts unbounded size and unvalidated page and sort**: `apps/api/src/main/java/com/esyback/ecommerce/service/ProductService.java:120` (CONFIRMED). Fix: clamp page to 0 or more and size to 1-100; allowlist sortBy.

### Web: storefront
- **The reduced-motion spinner slowdown is overridden, so the spinner freezes**: `apps/web/src/styles/shop-kit.css:119` (CONFIRMED). Fix: mark the rule `!important`, or exclude `.spin` from the blanket rule.
- **The gallery thumbnail label is English on Georgian pages**: `apps/web/src/pages/ProductDetails.jsx:178` (CONFIRMED). The `viewImage` key is missing. Fix: add `product.viewImage` in en and ka.
- **The sign-in modal's scroll lock targets `<body>`, but `<html>` is the scroller**: `apps/web/src/pages/SignIn.jsx:40` (CONFIRMED). Fix: lock `documentElement`.
- **Bag lines are keyed by product id, so two variants of one product collide**: `apps/web/src/pages/Cart.jsx:57` (CONFIRMED). Fix: `key={lineKey(it)}`.
- **The product facts card shows the base price and total stock, not the chosen variant**: `apps/web/src/pages/ProductDetails.jsx:245` (CONFIRMED). Fix: use `shownPrice` and `pickedStock`.
- **Search overlay rows, chips and Cancel cannot be used with a keyboard**: `apps/web/src/pages/SearchOverlay.jsx:17` (CONFIRMED). Fix: use `<button type="button">`. *Severity note: the verifier argued for Medium.*
- **`variantsQuery` turns any failure into a cached "no variants"**: `apps/web/src/core/query/queries.js:106` (CONFIRMED). The shopper adds the product without a variant and checkout refuses it. Fix: map only a real no-variants answer (or 404) to null; rethrow other errors.
- **A malformed URL hash crashes every platform page**: `apps/web/src/platform/PlatformShared.jsx:245` (CONFIRMED). Fix: wrap `decodeURIComponent` in try/catch.

### Web: account, admin and owner tools
- **The delete-product Cancel button is English on Georgian pages**: `apps/web/src/components/owner/DeleteProductDialog.jsx:44` (CONFIRMED). Fix: add `common.cancel` in en and ka, or reuse an existing key.
- **The admin payment chip shows a raw `REFUND_PENDING`**: `apps/web/src/admin/AdminStoreDetail.jsx:151` (CONFIRMED). Fix: add the translation key.
- **A raw `phoneGate.takenHelp` key is shown when a seller's phone is already taken**: `apps/web/src/platform/sell/SellGates.jsx:273` (CONFIRMED). Fix: add the key in both locales.
- **"Make default" fails silently**: `apps/web/src/account/AccountAddresses.jsx:158` (CONFIRMED). Fix: set and show an error state.
- **Removing an existing photo deletes it immediately, despite the Save/Cancel model**: `apps/web/src/components/owner/ProductEditorDialog.jsx:110` (CONFIRMED). Fix: stage removals until Save, or confirm first.
- **A failed background refetch of the account replaces the whole page with an error**: `apps/web/src/account/AccountBody.jsx:215` (CONFIRMED). Fix: show the error page only when there is no data.
- **The store overview's "spent" total includes refunded and unpaid orders**: `apps/web/src/account/HereBlock.jsx:25` (CONFIRMED). Fix: exclude refunded, pending and failed payments, matching `countsAsRevenue`.
- **The bank environment is matched case-sensitively, unlike the server**: `apps/web/src/admin/AdminConfig.jsx:270` (CONFIRMED). `BOG_ENV=LIVE` locks the switch, and a blank value defeats the type-to-confirm guard. Fix: normalise before comparing.
- **Page Save commits unapplied axis edits, and Cancel in the axes panel discards typed stock**: `apps/web/src/components/owner/VariantEditor.jsx:164` (CONFIRMED). Fix: save `doc.axes`; have Cancel reset `axes` only.
- **The billing CSV export allows formula injection through store names**: `apps/web/src/admin/AdminBilling.jsx:40` (CONFIRMED). Fix: prefix cells starting with `= + - @`, tab or CR with `'`.
- **The seller agrees to a hard-coded 2% fee while the server charges the admin-set rate**: `apps/web/src/platform/sell/SellFinish.jsx:87` (CONFIRMED). Fix: expose the live rate publicly, render it, and block publish until it is known. *Severity note: the verifier argued for Medium.*
- **The stale-subdomain check can mark a too-short link "available"**: `apps/web/src/platform/PlatformRegistration.jsx:156` (CONFIRMED; the effect is actually at lines 74-84). Fix: bump `checkSeq` before the early return.
- **`handleApiError` shows a developer message to users and misses non-Chrome network errors**: `apps/web/src/utils/api.js:874` (CONFIRMED). Fix: detect a non-ApiError TypeError and return the translated fallback.
- **Multipart helpers parse Spring's HTML sign-in page as JSON**: `apps/web/src/utils/api.js:563` and `apps/web/src/utils/api.js:252` (CONFIRMED; duplicates merged). `uploadImages`, `importCsv`, `uploadLogo` and `uploadCover` show "Unexpected token '<'" after the session expires. Fix: share `request()`'s redirect and 401 handling.
- **The shopper-orders query runs, and refetches after every write, on the manager and admin hosts**: `apps/web/src/contexts/OrdersContext.jsx:51` (CONFIRMED). Fix: enable it only on store and platform hosts.
- **Manager loaders take the store from the target URL but scope reads to the current page**: `apps/web/src/router/managerLoaders.js:15` (CONFIRMED). Fix: pass the url's tenant into the query factories, or skip cross-store prefetch.

### Web: back office (manager)
- **"Waiting for you" never shows what was ordered**: `apps/web/src/manager/ManagerOverview.jsx:59` (CONFIRMED). The list rows have no `lines`. Fix: fall back to the `items` count.
- **An out-of-range founding year is silently dropped while the save reports success**: `apps/web/src/manager/SettingsStore.jsx:233` (CONFIRMED). Fix: check 1900 to next year in the tab, or have the server refuse with a code.
- **Any failed invite blocks retry until the email is retyped**: `apps/web/src/manager/InviteDialog.jsx:68` (CONFIRMED). Fix: block only on validation codes; clear the error on role change.
- **The team screen has no owner guard**: `apps/web/src/manager/ManagerTeam.jsx:192` (CONFIRMED). Managers see an enabled action that returns 403. Fix: the same redirect or locked state as Settings.
- **A failed "fix and publish" leaves the fixed colour in the server draft unseen**: `apps/web/src/manager/ManagerDesign.jsx:497` (CONFIRMED). "Publish anyway" then publishes the colour the owner declined. Fix: sync `view.draft` after the colour save, or revert on failure.
- **Demoting or removing yourself leaves a stale owner permission snapshot**: `apps/web/src/manager/ManagerTeam.jsx:103` (CONFIRMED). Fix: call `refreshUser()`, or reload after a self-change.
- **A Shop/Brand save writes back a stale `logoUrl`**: `apps/web/src/manager/SettingsStore.jsx:80` (CONFIRMED). The logo breaks if an upload is in flight or another tab changed it. Fix: drop `logoUrl` from the payload, and have the server leave it alone when absent.

---

## Themes and recommendations

1. **The money path needs server-side state guards, not just correct happy paths.**
   - Callbacks are trusted by order number (H7, H11, M32).
   - Settlement overwrites state (Low: `OrderService:361`).
   - Refund atomicity is broken (H4, H6, M21).
   - Free orders bypass card checkout (M35).
   - Stock is not checked at checkout (M34).
   - Suspension is not enforced (H1).

   *Next steps:*
   - Write a state machine for `paymentStatus` and order `status`, and make every transition a conditional UPDATE (`... WHERE payment_status = :expected`).
   - Verify callbacks against the BOG receipt.
   - Add a scheduled reconcile for PENDING and REFUND_PENDING orders (there is no `@Scheduled` anywhere today).
   - Move BOG HTTP calls and notifications outside transactions.

2. **There is no concurrency control anywhere.**
   - No entity has `@Version`, and nothing uses `@Lock` or FOR UPDATE.
   - Stock is lost (M29) or overwritten from stale editors (M16, M17). Variant ids churn (M30).
   - Tenant rows are saved whole (`TenantDesignService:77`).
   - The last-owner guard, default address, OTP throttles and OTP attempts are all check-then-act.

   *Next steps:*
   - Add `@Version` to Product, ProductVariant and Tenant.
   - Change stock with atomic UPDATEs.
   - Add unique constraints: (tenant, route); a partial index on the default address.
   - Make the editors send deltas or changed fields only.

3. **Deployment config fails open.** The BOG public key, the encryption key and the JWT secret fall back silently, `render.yaml` omits them, and DEBUG/SQL logging ships to production.

   *Next step:* add a startup `@ConfigurationProperties` validator that refuses to boot outside dev when any required secret is blank or equals a dev default. Then declare every one of them in `render.yaml` and `deploy/render.md`.

4. **Fee, revenue and billing definitions disagree.** `countsAsRevenue`, `feesOwedOf` and `isBillable` each treat PENDING, CANCELLED and partial refunds differently (M3, M4, M21, M33, M31). The web app hard-codes 2% and charges it on delivery (M20, `SellFinish:87`). Delivery pricing can absorb commission (`DeliveryService:121`).

   *Next steps:*
   - Define one "money actually collected minus money returned" rule in a single service.
   - Pro-rate the fee by refunded amount.
   - Expose the live rate and frozen per-order fees to every screen.
   - Add tests for every payment and fulfilment combination.

5. **Abuse limits are missing or held in memory.** SMS pumping is possible through both OTP and order notices (M5, M23, M24). The PHONE_TAKEN oracle, the CSV exponent DoS (H9), anonymous store creation (H12), unpaged public lists and an unbounded image count all lack limits, and there is no rate limiter in the app.

   *Next steps:*
   - Add a Redis-backed rate limiter (per account, IP and store) in front of `send-code`, `orders`, `tenant` and `import`.
   - Restrict SMS to +995 5XX mobiles.
   - Clamp all pagination and numeric inputs.

6. **Input errors become 500s.** `ApiErrorAdvice` only handles `ResponseStatusException`, so `DataIntegrityViolationException`, `IllegalArgumentException`, `PropertyReferenceException`, `ArithmeticException` and upload-size errors all reach users as generic 500s.

   *Next steps:* add advice handlers for these, and put bean validation (`@Size`, `@Digits`, `@Max`) on the DTOs: products, variants, addresses, tenants and order quantities.

7. **Authentication and session hardening.**
   - Remove the cookie deserialization (H13) and `/api/auth/token` (M37).
   - Key identity on (provider, sub), not email (`UserService:39`).
   - Evaluate ADMIN against the allowlist per request (M25), enforce `isActive`, use case-insensitive email lookups, and match filters on the decoded path (M38).
   - Audit admin config changes and allowlist BOG hosts (M26).

8. **Frontend state and product handling.**
   - The cart lives only in memory (H2).
   - Variant and stock logic is spread across four card call sites (H3, M13).
   - The picker has two sources of truth (M10, M12).
   - `invalidateQueries()` with no filter after every write causes refetch storms (`OrdersContext:51`) and stale-state bugs.

   *Next steps:*
   - Persist the cart.
   - Make one `useQuickAdd` hook own the variant and stock rules.
   - Scope cache invalidation by query key.
   - Separate route prefetch from the navigation reload path (M19).

9. **Tests exist but guard nothing in practice.** The build skips them and there is no CI (`Dockerfile:21`). The test named for the refund-timeout guarantee cannot observe the rollback (H6). There are no cross-tenant tests and no product-delete test, and tests read live Redis.

   *Next steps:*
   - Add a CI job that runs `mvn test` and gates deploys.
   - Add a hermetic test profile.
   - Add non-transactional tests for the rollback paths, and two-store authorisation tests.

10. **Scalability, i18n and accessibility.**
    - Several endpoints load full order histories with N+1 item queries. Replace them with aggregates and paging, and add an index on `orders(tenant_id, created_at)`.
    - Extend `check-i18n-parity.mjs` to flag `t()` keys used in source but missing from the locale files; it would have caught the four missing keys.
    - Fix the keyboard-inaccessible controls (M9, the SearchOverlay rows and chips) with real links and buttons.
