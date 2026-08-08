---
description: Start the local docker compose stack on :8092 and verify it is serving
---

Start the esy stack (SPA + API + Postgres + Valkey) and confirm it is actually
serving. Docker compose is the only supported local flow — there is no native
Maven/Vite path any more.

## Steps

1. **Check the port.** Only one thing can hold 8092. If something already does,
   report it rather than killing it blindly:
   ```
   docker compose ps
   ```

2. **Build and start**, detached so the session is not blocked:
   ```
   npm.cmd run up
   ```
   Use `npm.cmd`, not `npm` — PowerShell's execution policy blocks npm's `.ps1`
   shim on this machine. This is `docker compose up --build -d`; the build step
   is required whenever `apps/web` or `apps/api` changed.

3. **Wait for readiness.** The image build can take minutes on a cold cache, and
   Spring Boot needs ~10s after the container starts. Poll with a generous
   timeout, not 2s:
   - `http://lvh.me:8092/` → HTTP 200, HTML containing `id="root"`
   - `http://lvh.me:8092/api/products` → HTTP 200, JSON
   - `http://studio-form.lvh.me:8092/api/tenant/current` → `subdomain=studio-form`
     (proves Host-header tenant resolution)

4. **Report** the URL and any errors from `docker compose logs app`. Tell the
   user to open **http://lvh.me:8092**.

## Notes

- Requires Docker Desktop running. The CLI lives at
  `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin` (a per-user install, not
  `C:\Program Files\Docker`). If `docker` is not found, the terminal has a stale
  environment — the parent app must be restarted.
- **Port 8092 is load-bearing.** It matches the redirect URI registered with
  Google (`http://lvh.me:8092/login/oauth2/code/google`), so sign-in works with
  no Console changes. Do not move it.
- Tenant storefronts are subdomains: `http://<sub>.lvh.me:8092`. `*.lvh.me`
  resolves to `127.0.0.1` via public DNS — nothing to add to `/etc/hosts`.
- Compose reads the root `.env` automatically (Google credentials, ADMIN_EMAILS,
  JWT_SECRET). Every variable must be listed explicitly in the `app` service's
  `environment:` block or it never reaches the container.
- **No hot reload.** The SPA is baked into the jar at image build time, so any
  `apps/web` edit needs `npm run up` again to be visible.
- Data lives in the `esy_pgdata` volume and persists across restarts.
  `npm run down` keeps it; `npm run reset` wipes it.
