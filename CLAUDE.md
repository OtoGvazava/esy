# CLAUDE.md — esy

Multi-tenant storefront ("Glow" design). Monorepo:

- `apps/api` — Spring Boot 3.2, **Java 17**, OAuth2 + JWT, H2, multi-tenant.
- `apps/web` — React 19 + Vite + MUI, the Glow design system, i18n (en/ka).
- `deploy/` + root `Dockerfile` + `render.yaml` — Render deployment.

Backend serves the built SPA *and* `/api` from one origin; the frontend calls
relative `/api/...` (Vite proxy in dev, same-origin in prod).

## Run locally

**Docker compose is the ONLY supported local flow.** There is no native
Maven/Vite path — it was removed deliberately. Do not reintroduce one, and do
not "helpfully" run `mvn spring-boot:run` or `vite` to work around a broken
container; fix the container.

```bash
cp .env.example .env          # set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET;
                              # keep APP_OAUTH2_CANONICAL_ORIGIN=http://lvh.me:8092
npm run dev                   # docker compose up --build
```

Root scripts: `dev` (foreground), `up` (detached), `down` (keep data), `reset`
(**wipes** the `esy_pgdata` volume), `logs`, `ps`, `build`. `npm run setup`
installs `apps/web` deps for `lint` / `i18n:check` / editor tooling only — the
image builds the SPA itself.

- Platform front door: `http://lvh.me:8092`
- A tenant store: `http://<sub>.lvh.me:8092` (e.g. `studio-form.lvh.me:8092`)
- **Port 8092 is load-bearing** — it matches the Google redirect URI. Moving it
  breaks sign-in with `redirect_uri_mismatch`.
- **No hot reload.** The SPA is baked into the jar at image build time; any
  `apps/web` or `apps/api` edit needs `npm run up` again.
- Docker Desktop here is a **per-user** install — the CLI is at
  `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`, *not*
  `C:\Program Files\Docker`. Probing only the latter falsely concludes Docker
  is missing.
- Every env var must be listed explicitly in the `app` service's `environment:`
  block in `docker-compose.yml`, or it silently never reaches the container
  (this is how `ADMIN_EMAILS` was dropped).

Sign-in is Google OAuth only — there is **no** `/api/auth/dev-login` endpoint
(`AuthController` exposes `/user`, `/token`, `/logout`). ADMIN comes solely from
`ADMIN_EMAILS`.

- **Google Cloud Console** → OAuth client → Authorized redirect URIs must
  contain this exact URI: `http://lvh.me:8092/login/oauth2/code/google` (Google
  accepts `.me`; it rejects `.local`).
- One Gmail sign-in is shared across the platform **and every** `*.lvh.me`
  store — HttpOnly `Domain=lvh.me` cookie, mirroring prod `Domain=esy.ge` over
  `*.esy.ge`. Sign out once = signed out everywhere.

## Build & deploy

- Artifacts: `./deploy/build.sh` (jar + web dist).
- One Docker image builds web + jar and runs it (`Dockerfile`, multi-stage).
- Render: `render.yaml` blueprint, free plan, **`autoDeploy: true`** (push to
  `main` ⇒ Render rebuilds). Live: `esy-r5ee.onrender.com`, `www.esy.ge`.
- Setup runbook: `deploy/render.md` (incl. Google OAuth + custom domain steps).

## Gotchas (these cost real time — heed them)

- **JDK 17 only.** Machine default is JDK 25; Spring Boot 3.2 will not compile
  on it. Always set `JAVA_HOME` to the `ms-17.0.18` JDK for any `mvn`.
- **Vite dev server needs Node 18–22.** Node 25 crashes `vite`/`vite preview`
  silently (the Docker build pins Node 20). `vite build` works on Node 25.
- **Prod runs on Render PostgreSQL** (`SPRING_DATASOURCE_*` +
  `JPA_DDL_AUTO=update`) — data persists across deploys. **Local/default is
  in-memory H2** (`create-drop`, wiped each boot; `DataInitializer` reseeds
  products/roles/tenants). Consequence: the `ddl-auto=update` traps below now
  bite *prod*, not just the docker `lvh.me:8092` stack. Setup steps:
  `deploy/render.md` (note: `SPRING_DATASOURCE_URL` must be a `jdbc:postgresql://`
  URL — Render's Internal URL is `postgresql://…` and must be rewritten).
- **`ddl-auto=update` cannot migrate a *populated* Postgres** (the docker
  `lvh.me:8092` stack + any persistent prod). It is additive-only: it never
  drops/alters an existing column or constraint, and it silently *logs-and-
  continues* on a failed DDL, so the app boots but later 500s. Two traps, both
  fine on H2 (`create-drop` rebuilds fresh) and only biting persistent
  Postgres: **(1)** a new `@Column(nullable=false)` → `ADD COLUMN … NOT NULL`
  is rejected on a table with rows. Always give such a column a DB default via
  `columnDefinition` (e.g. `"numeric(12,2) default 0"`, `"varchar(255) default
  'NONE'"`) — see `Order.serviceFee`/`paymentStatus`. **(2)** Hibernate freezes
  an `@Enumerated(STRING)` column's `CHECK (col IN (…))` at the enum's *original*
  values; adding a constant to `Order.Status` or `StoreMembership.Role` later
  passes on H2 but rejects every write on populated Postgres
  (`violates check constraint …_check`). Ship an explicit `DROP/ADD CONSTRAINT`
  for that table, or suppress the CHECK via `columnDefinition="varchar(255)"`
  and validate in code.
- **JWT**: `JwtUtil` derives the HS512 key via SHA-512, so any-length secret
  works (Render's generated `JWT_SECRET` is short — do not "fix" by shortening).
- **Google = OIDC** (the `openid` scope). `application.yml` must keep
  `google.user-name-attribute: sub` (not `id`) or `DefaultOidcUser` throws
  "Missing attribute 'id'". Provider is taken from the registrationId.
- **Local OAuth uses `lvh.me`, not `localhost`/`esy.local`.** Google rejects
  `.local` (not a public TLD); a `Domain=` cookie can't span `*.localhost`, so
  cross-subdomain SSO would break. `lvh.me` (`*.lvh.me` → 127.0.0.1 via public
  DNS) is a real registrable domain Google accepts, zero DNS setup. The host
  allowlist lives in `AuthCookie`, `TenantOrigins`, `TenantContextService`,
  `SecurityConfig` (backend) + `storeUrl`/`isPlatformHost` (web) — change all
  of them together if you add a domain.
- **The SPA is baked into the jar** in the docker/Render image. After editing
  `apps/web` you must rebuild (`docker compose up --build`) — it is not
  hot-reloaded in that stack (only the standalone Vite `:5173` flow is).
- iCloud/Apple sign-in is a **dev stand-in** (real Apple needs a paid
  $99/yr Apple Developer account); the button is temporarily commented out
  in `apps/web/src/pages/SignIn.jsx`.
- Admin product writes are gated by `@PreAuthorize` + `@EnableMethodSecurity`;
  public GET/SPA routes are `permitAll`.

## Conventions

- **Never `git push` or deploy without the user's explicit, per-change
  approval.** Implement and verify locally, then ask. (Push ⇒ Render prod
  deploy via autoDeploy.)
- Don't commit build output — `target/`, `apps/web/dist/`, `node_modules/`,
  `.idea/`, `.claude/` are gitignored.
- Code exploration: use **codebase-memory-mcp** (project indexed). After
  meaningful edits run `detect_changes` then re-index (`fast`). An auto-reindex
  hook keeps it fresh.
- **i18n is bilingual EN/KA, enforced.** All user-facing strings go through
  react-i18next `t()` (namespaces in `apps/web/src/locales/{en,ka}/*.json`) —
  never hardcode UI text. Every key MUST exist in **both** `en` and `ka`.
  `npm run i18n:check` (script `scripts/check-i18n-parity.mjs`) is the gate;
  it runs in the husky pre-commit and a Claude PostToolUse hook, so a change
  that adds a string in one language only cannot be committed. New screens →
  add a namespace, wire it in `i18n.js`, fill `en` + `ka`. `eslint-plugin-
  i18next` (`no-literal-string`, currently `warn`) flags stray literals; flip
  it to `error` once the legacy backfill is complete.

## Verify a change

```bash
docker build -t esy:test . && docker run -d -p 8090:8080 -e PORT=8080 esy:test
curl -s localhost:8090/ | grep -c id=\"root\"          # SPA served
curl -s localhost:8090/api/products                    # real API
curl -s -o /dev/null -w '%{http_code}' -X POST localhost:8090/api/auth/dev-login \
  -H 'Content-Type: application/json' -d '{"email":"a@b.co"}'   # 200
curl -s -o /dev/null -w '%{http_code}' localhost:8090/oauth2/authorization/google  # 302
```
