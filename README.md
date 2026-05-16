# esy

Monorepo for the esy multi-tenant ecommerce platform.

```
apps/
  api/   Spring Boot 3.2 backend (Java 17, OAuth2 + JWT, multi-tenant)
  web/   React 19 + Vite frontend (MUI, i18n)
```

## Running locally

Start the backend (port 8080):

```bash
cd apps/api
mvn spring-boot:run
```

Start the frontend (port 5173):

```bash
cd apps/web
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to the backend at `http://localhost:8080`,
so the frontend talks to the real Spring API with no CORS setup needed in dev.

### Local auth

Real Google/Apple OAuth2 needs credentials that aren't configured by default.
For local development the backend exposes `POST /api/auth/dev-login`, which
issues a real JWT for any email so the full authenticated flow (including admin
product CRUD) works end to end without external credentials. Use an email
containing `admin` to get an admin token.

## Apps

See `apps/api/README.md` and `apps/web/README.md` for app-specific details.
