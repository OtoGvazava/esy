#!/usr/bin/env bash
# Stop hook: keep the Miro documentation board in sync with the code.
#
# Fires when Claude finishes a turn. If documentation-relevant files changed
# since the last time this hook prompted (fingerprint = HEAD + working-tree
# status/diff over scope-bearing paths), it blocks the stop ONCE with an
# instruction to review/update the Miro board, then records the fingerprint so
# it stays silent until something else changes. Without that gate this would
# nag on every stop forever.
#
# State lives in .claude/.miro-sync-state (gitignored, per-machine).
set -u
cd "$(dirname "$0")/../.." 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

STATE=".claude/.miro-sync-state"
# Paths whose changes can invalidate the architecture/scope documentation.
# Locales, previews and build config are deliberately excluded — they never
# change what the board describes.
PATHS=(apps/api/src apps/web/src/manager apps/web/src/pages apps/web/src/contexts docker-compose.yml Dockerfile render.yaml)

# Use the last commit that TOUCHED a watched path, not bare HEAD — bare HEAD
# moves on every commit, so a commit to unrelated files (docs, .design-sync,
# the hook itself) would re-fire this nag with nothing doc-relevant changed.
FP=$(
  {
    git log -1 --format=%H -- "${PATHS[@]}" 2>/dev/null
    git status --porcelain -- "${PATHS[@]}" 2>/dev/null
    git diff -- "${PATHS[@]}" 2>/dev/null
  } | git hash-object --stdin 2>/dev/null
)
[ -z "${FP:-}" ] && exit 0

LAST=""
[ -f "$STATE" ] && LAST=$(cat "$STATE" 2>/dev/null)
[ "$FP" = "$LAST" ] && exit 0

# Record BEFORE blocking: the very next stop (after Claude handles the nag)
# must not re-fire for the same change-set.
printf '%s' "$FP" > "$STATE"

# Changed files, sanitized for JSON (paths in this repo carry no quotes).
CHANGED=$(git status --porcelain -- "${PATHS[@]}" 2>/dev/null | head -10 | tr -d '"\\' | tr '\n' ';')
[ -z "$CHANGED" ] && CHANGED="(committed changes since last check)"

cat <<EOF
{"decision":"block","reason":"Documentation-relevant code changed this session, so the Miro board may be stale. Board: 'esy — Surface Map & Product Scope' (https://miro.com/app/board/uXjVHzlpzUQ=/). Check whether the changes affect: the surface-map diagram, scope doc, decision log, ERD (3), order lifecycle (4), backend structure (7), target architecture (8), or migration status (9). If yes: update the affected items now via the Miro tools (diagram_update_mermaid / doc_update), then finish. If the changes genuinely do not alter what the board documents, say so in one sentence and finish — do not update the board for cosmetic code changes. KEEP THE BOARD SHORT — this is the rule most often broken. These docs are read on a canvas, not scrolled like a page, and they have twice had to be cut back after growing into walls of text. So: REPLACE stale wording, never append a correction beside it; edit the row or sentence that is now wrong rather than adding a note that it is wrong. State a fact once, in the one place that owns it — a capability's status belongs in the scope table, its reasoning in the decision log, and neither should restate the other; link by decision id (D9, D17) instead of repeating the argument. A table cell is a cell, not a paragraph: if it runs past about fifteen words, move the detail to the decision that owns it. Prefer deleting a section that has become historical over leaving it to rot. If an edit makes a doc longer, say in your reply what you removed to pay for it. Changed: $CHANGED"}
EOF
