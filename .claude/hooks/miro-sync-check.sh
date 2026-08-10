#!/usr/bin/env bash
# Stop hook: keep the Miro documentation board in sync with the code.
#
# Fires when Claude finishes a turn. If ARCHITECTURE-bearing files changed since
# the last prompt, it blocks the stop ONCE with a short instruction, then records
# a fingerprint so it stays silent until something else changes.
#
# Three things keep it from nagging — and, more importantly, from inviting an
# edit to the board on every turn. Every firing is an invitation to write
# something, and the board only ever grew:
#
#   1. NARROW PATHS. The watched set used to be all of apps/api/src plus
#      apps/web/src/pages, which is nearly every change in the repo — a
#      breakpoint fix or a token rename fired it just as loudly as a new
#      entity. It now watches only what can actually change the ERD, the API
#      surface, the surface map or the deployment: entities, repositories,
#      controllers, the host/shell routing files, and deploy config.
#   2. COOLDOWN. At most one prompt per COOLDOWN_SECS, so a long session that
#      touches an entity six times is asked once, not six times.
#   3. SHORT MESSAGE. The editing rules live in .claude/miro-board-rules.md and
#      are read only if Claude decides the board is genuinely stale. The block
#      text used to carry ~350 words of rules into the context on every fire.
#
# State lives in .claude/.miro-sync-state (gitignored, per-machine): the
# fingerprint on line 1, the epoch seconds of the last prompt on line 2.
set -u
cd "$(dirname "$0")/../.." 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

STATE=".claude/.miro-sync-state"
RULES=".claude/miro-board-rules.md"
COOLDOWN_SECS=${MIRO_SYNC_COOLDOWN:-21600}   # 6h; override in the environment

# Paths whose changes can invalidate the architecture/scope documentation.
#
# Deliberately NOT watched, because they never change what the board describes:
# locales, styles, core tokens, components, admin/manager screen bodies, tests,
# design-sync previews, build config.
PATHS=(
  apps/api/src/main/java/com/esyback/ecommerce/entity
  apps/api/src/main/java/com/esyback/ecommerce/repository
  apps/api/src/main/java/com/esyback/ecommerce/controller
  apps/api/src/main/java/com/esyback/ecommerce/security
  apps/api/src/main/resources/application.yml
  apps/web/src/App.jsx
  apps/web/src/utils/hosts.js
  apps/web/src/hooks/usePlatformHost.js
  apps/web/src/manager/nav.js
  docker-compose.yml
  Dockerfile
  render.yaml
)

# Use the last commit that TOUCHED a watched path, not bare HEAD — bare HEAD
# moves on every commit, so a commit to unrelated files would re-fire this with
# nothing doc-relevant changed.
FP=$(
  {
    git log -1 --format=%H -- "${PATHS[@]}" 2>/dev/null
    git status --porcelain -- "${PATHS[@]}" 2>/dev/null
    git diff -- "${PATHS[@]}" 2>/dev/null
  } | git hash-object --stdin 2>/dev/null
)
[ -z "${FP:-}" ] && exit 0

LAST_FP=""
LAST_AT=0
if [ -f "$STATE" ]; then
  LAST_FP=$(sed -n '1p' "$STATE" 2>/dev/null)
  LAST_AT=$(sed -n '2p' "$STATE" 2>/dev/null)
fi
[ "$FP" = "$LAST_FP" ] && exit 0

# Cooldown: something changed, but we asked recently. Record the new
# fingerprint anyway so the next prompt reflects the latest state rather than
# re-reporting a change-set already superseded.
NOW=$(date +%s 2>/dev/null || echo 0)
case "${LAST_AT:-0}" in ''|*[!0-9]*) LAST_AT=0 ;; esac
if [ "$NOW" -gt 0 ] && [ "$LAST_AT" -gt 0 ] && [ $((NOW - LAST_AT)) -lt "$COOLDOWN_SECS" ]; then
  printf '%s\n%s' "$FP" "$LAST_AT" > "$STATE"
  exit 0
fi

# Record BEFORE blocking: the very next stop must not re-fire for the same set.
printf '%s\n%s' "$FP" "$NOW" > "$STATE"

# Changed files, sanitized for JSON (paths in this repo carry no quotes).
CHANGED=$(git status --porcelain -- "${PATHS[@]}" 2>/dev/null | head -8 | tr -d '"\\' | tr '\n' ';')
[ -z "$CHANGED" ] && CHANGED="(committed changes since last check)"

cat <<EOF
{"decision":"block","reason":"Architecture-bearing code changed: $CHANGED Decide whether this alters what the Miro board documents (surface map, scope table, decision log, ERD, order lifecycle, backend structure, migration status). Most changes do NOT — if so, say so in one sentence and finish. If it does, read $RULES first and follow it; the board is read on a canvas and must stay short."}
EOF
