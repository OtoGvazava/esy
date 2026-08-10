# Editing the Miro board

Board: **esy — Surface Map & Product Scope** — https://miro.com/app/board/uXjVHzlpzUQ=/

Read this only when you have decided the board is actually stale. If the change
does not alter what the board documents, say so in one sentence and finish.

## What the board holds

Surface-map diagram · scope doc · decision log · ERD (3) · order lifecycle (4) ·
backend structure (7) · target architecture (8) · migration status (9).

## The rules

These docs are read on a **canvas**, not scrolled like a page. They have three
times had to be cut back after growing into walls of text, so the default
answer to "should I write this on the board?" is **no**.

- **Replace, never append.** Edit the row or sentence that is now wrong. Never
  add a note beside stale wording saying it is wrong.
- **State a fact once, in the place that owns it.** A capability's *status*
  belongs in the scope table; its *reasoning* belongs in the decision log.
  Neither restates the other — link by decision id (D9, D17) instead.
- **A cell is a cell.** Past ~15 words, move the detail to the decision that
  owns it and leave a reference.
- **Delete what has become historical.** A section describing a migration that
  finished, or a defect that was fixed, is rot. Remove it rather than leaving
  it to be re-read forever.
- **Pay for growth.** If an edit makes a doc longer, say in your reply what you
  removed to pay for it.
- **Status only, not narrative.** The board records *what is true now*. It is
  not a changelog and not a record of how the work went — git holds that.

## What does NOT belong on the board

Bug fixes, refactors, breakpoint and styling work, token changes, i18n,
component splits, test additions. These change the code, not what the board
describes. The hook fires on architecture-bearing paths, but even those often
warrant no edit — check before assuming.
