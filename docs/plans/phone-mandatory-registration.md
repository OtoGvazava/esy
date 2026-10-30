# Plan — phone number mandatory at registration (P)

Status: designed 2026-10-31, not built.
Design: canvas "esy" → page *Flow · sign in* → section **06 · ტელეფონი სავალდებულოა**.
Docs: Miro board, diagrams 5, 3, 6, 9 updated; 10 (flow) and 11 (enforcement) added.

## Decisions (2026-10-31)

1. Registration = Google sign-in **plus** two blocking steps: profile, then phone with SMS code. No skip; the only exit is sign-out.
2. **One verified number = one account.** A second account gets `409 PHONE_TAKEN`.
3. **Existing accounts** without a verified phone are blocked by the same gate on their next visit.
4. **Changing a number** keeps the old one active until the new one is verified, so no account is ever left unverified.

## Where the code is today

| Area | Today | File |
|---|---|---|
| Sign-in gate | name, surname, date of birth only; comment says phone is checkout-only | `apps/web/src/components/ProfileGate.jsx` |
| Phone set | `PUT /api/account/phone` overwrites and **clears** verification | `AccountController.updatePhone` |
| Code send/verify | 4 digits, 10 min TTL, 5 attempts, 60 s cooldown, in-memory | `PhoneVerificationService` |
| Enforcement | only at order / payment | `OrderController:87`, `PaymentController:166` |
| Store creation | web-only phone step | `apps/web/src/platform/PlatformRegistration.jsx` |
| Normalising | `SmsSender.normalise` → `995XXXXXXXXX` | `SmsSender` |

## Phase 1 — data

- `User.verifiedPhone`: `@Column(name="verified_phone", unique=true)`, nullable. A **new** nullable column, so `ddl-auto=update` can add it and its unique constraint on populated Postgres (all values start NULL; see the CLAUDE.md `ddl-auto` traps).
- Backfill runner at startup, idempotent: for users with `phoneVerified=true` and `verifiedPhone IS NULL`, ordered by id, set `verifiedPhone = normalise(phoneNumber)`. If the number is already taken, set `phoneVerified=false` instead, so the later account meets the gate and the "taken" error. Log the count of accounts this unverified.
- `phoneNumber` stays as the display value; `verifiedPhone` is the identity and the constraint.

## Phase 2 — API

1. **`POST /api/account/phone/send-code`** takes `{ phoneNumber }` (optional; falls back to the current number). It normalises the number and checks the format (400). It returns `409 PHONE_TAKEN` if another user's `verifiedPhone` matches. It keeps the per-user cooldown and adds a **per-number cap** (e.g. 5 sends / 24 h), because registration now forces a paid SMS. The pending entry stores `{code, number}`.
2. **`POST /api/account/phone/verify`** checks the code, re-checks "taken" (race), then sets `phoneNumber`, `verifiedPhone` and `phoneVerified=true` together. Catch `DataIntegrityViolationException` and return `409 PHONE_TAKEN`. The old number stays in force until this succeeds.
3. **`PUT /api/account/phone`** returns `409` when the account is already verified ("use send-code"), so it can no longer unverify an account. The web stops calling it.
4. **Stable error codes.** Have `ApiErrorAdvice` return a `code` field (`PHONE_INVALID`, `PHONE_TAKEN`, `PHONE_COOLDOWN`, `PHONE_CAP`, `CODE_WRONG`, `CODE_LOCKED`, `SMS_UNAVAILABLE`, `PHONE_REQUIRED`) so the web can map them to i18n keys instead of showing English server text.
5. **`PhoneRequiredFilter`** (`OncePerRequestFilter`, registered after `JwtAuthenticationFilter`). If the request is authenticated, the user is not verified, the method is not GET/HEAD/OPTIONS, and the path is not `/api/auth/**`, `/api/account/**` or `/logout`, it returns `403 {code: PHONE_REQUIRED}`. The existing order/payment checks stay as defence in depth.
6. **Close the dev-code hole first.** `sendCode` returns the code to the browser whenever no SMS key is set. With registration mandatory, a prod deploy without `APP_SMS_KEY` would hand every sign-up its own code. Gate the fallback behind an explicit `app.sms.dev-fallback` (true in `docker-compose.yml`, unset on Render). Without a key and without the flag, return `503 SMS_UNAVAILABLE`. Add the flag to the compose `environment:` block (CLAUDE.md: unlisted env vars never reach the container).

## Phase 3 — web gate

- `ProfileGate.jsx` renders when `!profileComplete || !phoneVerified`.
  - Step 1 / 2 — the existing profile form (design `signin-pr-pg-m`).
  - Step 2 / 2 — number input, send, 4 cells, resend countdown, "wrong number? change" (designs `pr-ph-m`, `pr-ot-m`).
  - Error states map from the codes above (`pr-ph-m-inv`, `-taken`, `-fail`, `pr-ot-m-wrong`, `-locked`).
  - An existing account (`profileComplete && !phoneVerified`) gets the "one more step" copy (`pr-ex-m`, `pr-ex-w`).
  - A sign-out link is the only way out.
- `usePhoneVerify` / `AuthContext.sendPhoneCode(phoneNumber)` take the number. Remove `savePhone` from the gate path.
- `api.js`: on `403 PHONE_REQUIRED`, refresh the user so the gate appears instead of a raw error.
- i18n: new keys in `auth` (or a new `phoneGate` namespace) in **both** `en` and `ka`. `npm run i18n:check` must pass (pre-commit enforces it).

## Phase 4 — account page

- `PersonalInfo.jsx` gets a change-number flow (design `pr-ch-m`): current number shown as verified, new number "awaiting code", confirm, cancel. Built on the same send-code/verify calls.
- `Checkout.jsx` and `PlatformRegistration.jsx` phone branches stay untouched as a safety net. Simplify them later, once the gate is proven.

## Phase 5 — tests and checks

- `PhoneVerificationTest`: taken number → 409; verify race → 409 via the constraint; change keeps the old number until verify; per-number cap; dev fallback off → 503.
- New `PhoneRequiredFilterTest`: unverified write → 403, `/api/account/**` allowed, GET allowed, verified write passes.
- Backfill test: duplicate verified numbers → the oldest keeps it, the newer is unverified.
- `AccountController`: `PUT /phone` on a verified account → 409.
- Web: `npm run lint`, `npm run i18n:check`.
- Manual run on the docker stack (`npm run up`, `http://lvh.me:8092`) with no SMS key and the dev fallback on. Cover a new Google account through both steps, an existing account without a phone, a taken number from a second Google account, wrong code ×5, and changing the number from the account page.

## Phase 6 — rollout (needs your go-ahead; push = Render deploy)

1. Confirm `APP_SMS_KEY` and `APP_SMS_SENDER` are set in the Render environment (not only in the admin screen, which is non-persistent) and that the SMS master switch is on. Otherwise nobody can register.
2. Deploy. The backfill runs once and logs how many duplicate-number accounts it unverified.
3. Watch the logs for `Phone OTP refused` and for SMS spend over the first days.

## Risks

- **Cost:** at least one paid SMS per new account. The per-number cap and the per-user cooldown bound the damage.
- **In-memory pending codes:** a restart drops them and the user asks again. Fine on one Render instance, wrong if it is ever scaled out.
- **Admins are gated too:** every `ADMIN_EMAILS` account needs a verified phone before it can write anything.
- **Shared family phones** can no longer back two accounts. This was decided, but expect support questions.
