// Frames — ported from the Claude Design project's `esy-core.jsx` (`Screen`,
// `Phone`). In the design these are ARTBOARD shells: `position:absolute;
// inset:0` inside a canvas pinned to 1440×900 / 834×1194 / 390×844, with
// `overflow:hidden` so nothing spills past the board edge, and an iOS-mock
// status bar on the phone board.
//
// None of that is app behaviour, so this port keeps the visual contract — the
// background, the text colour, the base font, the phone's 390px column, the
// dock — and drops the artboard mechanics:
//
//   · no fixed height (`minHeight: 100dvh` instead of a pinned 844/900),
//   · no `overflow: hidden` (it would clip real content and kill page scroll),
//   · no `position: absolute / inset: 0` — but `position: relative` stays, so
//     the design's overlay idiom (an absolutely positioned scrim or panel as a
//     child) still anchors to the frame,
//   · 390 becomes a `max-width`, not a `width`: the phone frame is a centred
//     column that shrinks below 390 and never grows past it,
//   · the mock status bar is gone (device chrome plus a hardcoded "9:41"),
//   · the dock is `position: sticky; bottom: 0` rather than the last child of a
//     fixed-height flex column, so it stays on screen however long the content
//     runs. Sticky keeps its space in flow, so the design's 86px bottom
//     clearance under a dock is no longer needed and is not reproduced.
//
// Two things in esy-core.jsx are deliberately NOT ported, for the same reason:
// they are artboard furniture, not application UI.
//
//   · `StatusBar` — an iOS mock with a hardcoded "9:41" and battery glyphs. A
//     real phone draws its own; ours would be a lie that never updates.
//   · `Ph` — the striped placeholder whose caption is literally `// label`.
//     That is mock-data notation. A product with no image needs an empty
//     state, not a note to the designer.
//
// Colours come only from the token object passed in as `T` (see ./tokens).
import { MOB } from './tokens';

// Desktop / tablet frame. Full-bleed like the design — the screens themselves
// own their padding — but `maxWidth` and `pad` are available for surfaces that
// want a centred measure. Extra props (className, id, aria-*) spread onto the
// element; `style` merges last so a caller can override any of it.
export function Screen({
  T,
  children,
  maxWidth,
  pad = 0,
  style = {},
  ...rest
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth,
        margin: maxWidth ? '0 auto' : undefined,
        minHeight: '100dvh',
        padding: pad,
        background: T.bg,
        color: T.text,
        font: `400 14px ${T.font}`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// Mobile frame — a centred column capped at the design's 390px, with an
// optional bottom dock. `pad` is the body's bottom padding (the design's
// no-dock case); it is no longer overloaded to clear a dock, because a sticky
// dock reserves its own space.
export function Phone({
  T,
  children,
  dock,
  pad = 0,
  maxWidth = MOB.w,
  style = {},
  ...rest
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth,
        margin: '0 auto',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: T.bg,
        color: T.text,
        font: `400 14px ${T.font}`,
        ...style,
      }}
      {...rest}
    >
      <div style={{ flex: 1, position: 'relative', paddingBottom: pad }}>
        {children}
      </div>
      {dock ? (
        <div style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>{dock}</div>
      ) : null}
    </div>
  );
}
