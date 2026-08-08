# esy

Monorepo for the esy multi-tenant ecommerce platform.

```
apps/
  api/   Spring Boot 3.2 backend (Java 17, OAuth2 + JWT, multi-tenant)
  web/   React 19 + Vite frontend (MUI, i18n)
```

## Running locally

**Docker is the only supported local flow.** One image serves the SPA and the
API together, backed by Postgres and Valkey — the same shape as production.

Prerequisite: **Docker Desktop**, running.

```bash
cp .env.example .env
```

Fill in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and keep
`APP_OAUTH2_CANONICAL_ORIGIN=http://lvh.me:8092`, then:

```bash
npm run dev
```

Open **http://lvh.me:8092**. That is `docker compose up --build`; `Ctrl+C`
stops it. Common variants:

| Command | Does |
|---|---|
| `npm run up` | Same, detached |
| `npm run down` | Stop, **keep** the database |
| `npm run reset` | Stop and **wipe** the database volume |
| `npm run logs` | Follow the app container's logs |
| `npm run ps` | Container status |

Tenant storefronts are subdomains of the same host, e.g.
`http://studio-form.lvh.me:8092`. `*.lvh.me` resolves to `127.0.0.1` via public
DNS, so there is nothing to add to `/etc/hosts`, and it is a real registrable
domain that Google accepts as a redirect host.

**Port 8092 is load-bearing** — it matches the redirect URI registered with
Google (`http://lvh.me:8092/login/oauth2/code/google`), so real sign-in works
locally with no Console changes. One Gmail sign-in is shared across the platform
and every `*.lvh.me` store via a `Domain=lvh.me` cookie, mirroring production's
`Domain=esy.ge` over `*.esy.ge`.

**There is no hot reload.** The SPA is compiled into the jar when the image is
built, so any change under `apps/web` or `apps/api` needs `npm run dev` (or
`npm run up`) again before you see it.

Data lives in the `esy_pgdata` volume and survives restarts.

### Working on the frontend without Docker

`npm run setup` installs `apps/web` dependencies so `npm run lint`,
`npm run i18n:check`, and editor tooling work. Starting `vite` by hand is
possible but unsupported: it serves on 5173, where Google sign-in fails because
that origin is not a registered redirect URI.

### Local auth

Google OAuth is the only sign-in. There is no email dev-login endpoint — set
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env` and add this exact
redirect URI to the OAuth client in Google Cloud Console:

```
http://lvh.me:8092/login/oauth2/code/google
```

Leaving the credentials blank keeps the app usable for anonymous browsing;
"Continue with Gmail" just won't complete.

ADMIN is granted only to addresses listed in `ADMIN_EMAILS` (comma-separated),
applied on sign-in.

## Apps

See `apps/api/README.md` and `apps/web/README.md` for app-specific details.
