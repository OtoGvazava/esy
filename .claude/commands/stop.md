---
description: Stop the local docker compose stack
---

Stop the esy stack.

1. Bring the containers down, keeping the Postgres volume:
   ```
   npm.cmd run down
   ```
2. Confirm nothing is left on 8092 and report the container state:
   ```
   docker compose ps
   ```

Only use `npm run reset` (`docker compose down -v`) if the user explicitly asks
to wipe the database — it destroys every store, account and order in the
`esy_pgdata` volume.
