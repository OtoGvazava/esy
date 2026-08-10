// UI primitives — ported from the Claude Design project's esy-core.jsx
// (its Btn, Chip, Field, Card, SectionTitle and Note). Geometry, typography and
// colour rules are reproduced verbatim; only the module shape is adapted — ESM
// named exports, no canvas harness, no design-local t(key, lang) table, no
// fixtures. Every primitive is styled with inline style objects read from the
// token object handed in as `T` (see ./tokens TK), the same idiom as
// ../styles/glow.js. No CSS files, no CSS-in-JS, no new dependencies.
//
// User-facing copy is NEVER baked in: labels, placeholders, hints and errors all
// arrive as props, so callers pass react-i18next `t()` output and the EN/KA
// parity gate keeps working.

import { IconSpark } from './icons';
import { track } from './tokens';

// Action button. `kind` picks the colour rule, `size` the height/padding/type
// scale (sm 36 · md 46 · lg 54), `full` stretches to the container width.
// Anything else (type, disabled, aria-*, onClick, title…) is forwarded to the
// underlying <button>; `type` defaults to "button" so a Btn inside a form does
// not submit it by accident.
export function Btn({
  T,
  kind = 'primary',
  size = 'md',
  children,
  full,
  style = {},
  type = 'button',
  disabled,
  ...rest
}) {
  const h = size === 'lg' ? 54 : size === 'sm' ? 36 : 46;
  const base = {
    height: h,
    padding: size === 'sm' ? '0 14px' : '0 20px',
    borderRadius: size === 'lg' ? 16 : 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    font: `700 ${size === 'lg' ? 14.5 : size === 'sm' ? 12.5 : 13.5}px ${T.font}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: full ? '100%' : undefined,
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.55 : undefined,
  };
  const kinds = {
    primary: {
      border: 'none',
      background: T.grad,
      color: '#fff',
      boxShadow: `0 10px 26px ${T.accent}45`,
    },
    ghost: { border: `1.5px solid ${T.border}`, background: 'transparent', color: T.text },
    quiet: { border: 'none', background: T.surface2, color: T.text },
    dark: { border: 'none', background: T.text, color: T.bg },
    danger: {
      border: `1.5px solid ${T.danger}44`,
      background: 'transparent',
      color: T.dangerFg,
    },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      style={{ ...base, ...(kinds[kind] || kinds.primary), ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

// Pill-shaped status/label token. One tone per semantic colour pair in TK.
export function Chip({ T, tone = 'neutral', children, style = {} }) {
  const tones = {
    neutral: { bg: T.surface2, fg: T.textDim },
    accent: { bg: T.accentBg, fg: T.accentFg },
    success: { bg: T.successBg, fg: T.successFg },
    warn: { bg: T.warnBg, fg: T.warnFg },
    danger: { bg: T.dangerBg, fg: T.dangerFg },
    admin: { bg: T.adminBg, fg: T.adminFg },
  };
  const c = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 11px',
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        font: `700 11px ${T.font}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// Labelled input shell. `tall` is the multi-line variant, `right` is a slot
// rendered at the right edge inside the box (unit suffix, toggle, small Btn…),
// `error` recolours the border and the message line, `hint` is the quiet
// message shown when there is no error.
//
// Two modes, so the same primitive serves both a read-only detail row and a
// real form control:
//   • no `onChange` → the design's static display row (value, or placeholder
//     in muted text when value is empty). No React controlled-input warning.
//   • `onChange`    → a real <input> (or <textarea> when `tall`). The
//     placeholder is drawn as an overlay span rather than the native attribute,
//     because ::placeholder cannot be coloured from an inline style object and
//     the browser default is unreadable in dark mode.
// Extra props (name, type, autoComplete, disabled, maxLength…) are forwarded to
// the control in editable mode.
export function Field({
  T,
  label,
  value,
  placeholder,
  hint,
  error,
  tall,
  right,
  onChange,
  id,
  style = {},
  ...rest
}) {
  const editable = typeof onChange === 'function';
  const hasValue = value !== undefined && value !== null && value !== '';
  const LabelTag = editable ? 'label' : 'span';
  const msgId = id && (error || hint) ? `${id}-msg` : undefined;

  const textStyle = {
    font: `500 14px ${T.font}`,
    color: hasValue ? T.text : T.textMute,
    lineHeight: 1.5,
  };
  const controlStyle = {
    width: '100%',
    minWidth: 0,
    font: `500 14px ${T.font}`,
    color: T.text,
    lineHeight: 1.5,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: 0,
    margin: 0,
    resize: 'none',
    minHeight: tall ? 64 : undefined,
  };
  const controlProps = {
    id,
    value: value ?? '',
    onChange,
    style: controlStyle,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': msgId,
    ...rest,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <LabelTag
          htmlFor={editable ? id : undefined}
          style={{
            font: `600 10.5px ${T.font}`,
            color: T.textMute,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </LabelTag>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: tall ? 'flex-start' : 'center',
          gap: 8,
          minHeight: tall ? 96 : 52,
          padding: tall ? '14px 16px' : '0 16px',
          borderRadius: 14,
          background: T.surface,
          border: `1.5px solid ${error ? T.danger : T.border}`,
        }}
      >
        {editable ? (
          <span style={{ position: 'relative', flex: 1, display: 'flex', minWidth: 0 }}>
            {tall ? <textarea {...controlProps} /> : <input {...controlProps} />}
            {!hasValue && placeholder && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  font: `500 14px ${T.font}`,
                  color: T.textMute,
                  lineHeight: 1.5,
                  pointerEvents: 'none',
                }}
              >
                {placeholder}
              </span>
            )}
          </span>
        ) : (
          <span style={{ flex: 1, ...textStyle }}>{hasValue ? value : placeholder}</span>
        )}
        {right}
      </div>
      {(hint || error) && (
        <span
          id={msgId}
          style={{ font: `500 11.5px ${T.font}`, color: error ? T.danger : T.textMute }}
        >
          {error || hint}
        </span>
      )}
    </div>
  );
}

// Surface container. `pad={0}` is the edge-to-edge variant — used whenever the
// content owns its own insets (list rows, tables, media). Pair it with
// style={{ overflow: 'hidden' }} so children are clipped by the 18px radius.
export function Card({ T, children, pad = 16, style = {} }) {
  return (
    <div
      style={{
        padding: pad,
        borderRadius: 18,
        background: T.surface,
        border: `1px solid ${T.border}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// The switch used wherever a setting is on or off — delivery routes, whether a
// contact channel is public, the cart. Presentational only: it renders the
// state it is given and the caller owns the click, so an optimistic flip can
// never disagree with what the server kept.
export function Toggle({ T, on, onClick, disabled, style = {} }) {
  return (
    <span
      role="switch"
      aria-checked={!!on}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        flexShrink: 0,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        background: on ? T.accent : T.surface2,
        border: `1px solid ${on ? T.accent : T.borderStr}`,
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 20 : 2,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          transition: 'left 120ms ease',
        }}
      />
    </span>
  );
}

// Section heading with an optional sub-line and a right-hand slot for actions.
// The title is `title` or, matching the design's call sites, `children`. `lang`
// is the active i18n language and only feeds track() — Georgian display text
// takes less negative tracking than Latin.
export function SectionTitle({ T, lang, title, children, sub, right, style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 14,
        ...style,
      }}
    >
      <div>
        <div
          style={{
            font: `700 22px ${T.font}`,
            color: T.text,
            letterSpacing: track(lang, '-0.03em'),
          }}
        >
          {title ?? children}
        </div>
        {sub && (
          <div style={{ font: `400 13px ${T.font}`, color: T.textDim, marginTop: 4 }}>{sub}</div>
        )}
      </div>
      {right}
    </div>
  );
}

// Tinted callout. In the design this pins a rule from the architecture document
// onto the screen it governs; in the app it is the same shape for any inline
// notice that is not a form error. Text comes from the caller's t().
//
// The border is the design's `${c.fg}33` — an 8-digit-hex alpha suffix. It only
// resolves for the admin and danger tones, whose token is a hex literal; TK's
// accentFg is an rgb() string, so the accent tone's border declaration is
// invalid and the browser drops it. That is exactly how the tone renders on the
// design canvas, so it is reproduced rather than silently "fixed" here.
export function Note({ T, tone = 'accent', children, style = {} }) {
  const c =
    tone === 'admin'
      ? { bg: T.adminBg, fg: T.admin }
      : tone === 'danger'
        ? { bg: T.dangerBg, fg: T.danger }
        : { bg: T.accentBg, fg: T.accentFg };
  return (
    <div
      style={{
        display: 'flex',
        gap: 9,
        alignItems: 'flex-start',
        padding: '12px 14px',
        borderRadius: 14,
        background: c.bg,
        border: `1px solid ${c.fg}33`,
        ...style,
      }}
    >
      <span style={{ color: c.fg, marginTop: 1, flexShrink: 0 }}>
        <IconSpark size={13} />
      </span>
      <span style={{ font: `500 12.5px/1.55 ${T.font}`, color: T.textDim }}>{children}</span>
    </div>
  );
}
