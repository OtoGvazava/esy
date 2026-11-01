// The design kit's pieces as the platform pages draw them (esy-kit.css on the
// "esy Full Design" canvas, the esy theme): buttons, cards and list rows, the
// small-caps label, chips, avatars, alerts, pills, menu rows and the glyphs
// the L-boards use. Inline styles over the theme tokens (styles/themes.css),
// like the rest of the platform; no copy lives here — every label arrives from
// the caller's t().
/* eslint-disable react-refresh/only-export-components */
import { Link } from 'react-router-dom';
import { useDevice } from '../contexts/DeviceContext';

/**
 * The three device classes the boards are drawn at. `gut` is the kit's page
 * gutter (16 / 28 / 48) — the boards' --gut.
 */
export function usePDevice() {
  const { isMobile, isTablet, isDesktop } = useDevice();
  const ph = !!isMobile;
  const tab = !ph && !!isTablet;
  const desk = !ph && !tab && isDesktop !== false;
  return { ph, tab, desk, gut: ph ? 16 : tab ? 28 : 48 };
}

// ─── Glyphs ─────────────────────────────────────────────────────────────────
// Paths copied from the boards (PlatTop, L2–L5). 24×24, stroked in
// currentColor at the theme's weight; decorative unless the caller labels one.
const PATHS = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  close: <path d="M7 7l10 10M17 7 7 17" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  chevD: <path d="m6 9 6 6 6-6" />,
  chevU: <path d="m6 15 6-6 6 6" />,
  chevR: <path d="m9 5 7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.5" /></>,
  user: <><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
  logout: <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />,
  truck: <><path d="M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  undo: <><path d="M4 9a8 8 0 1 1-1 6" /><path d="M4 4v5h5" /></>,
  store: <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5" />,
  bank: <path d="M3.5 9.5 12 4.5l8.5 5M5 10v7M9.7 10v7M14.3 10v7M19 10v7M3.5 20h17" />,
  box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" /></>,
};

export function Glyph({ name, size = 20, style, label }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
      style={{ flex: 'none', strokeWidth: 'var(--k-ic-w, 1.8)', ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}

/** The esy bag mark and wordmark (the kit's `.logo`): 30px mark, 21px 800. */
export function Logo({ T, size = 30, font = 21 }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, flex: 'none',
      font: `800 ${font}px/1 ${T.font}`, letterSpacing: '-0.045em', color: T.text,
    }}>
      <svg viewBox="0 0 48 48" aria-hidden="true" style={{ width: size, height: size, color: T.accent, flex: 'none' }}>
        <rect x="4" y="10" width="40" height="34" rx="13" fill="currentColor" />
        <path d="M17 12V9.5a7 7 0 0 1 14 0V12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M15.5 27.5c4.5 5.5 12.5 5.5 17 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {/* The brand is a proper noun, the same in both languages. */}
      {'esy'}
    </span>
  );
}

// ─── Type ───────────────────────────────────────────────────────────────────
/** The kit's type scale. h1 is 30px on a desktop, as the kit sets it. */
export const type = (T, desk) => ({
  big: { font: `700 ${desk ? 46 : 32}px/1.08 ${T.font}`, letterSpacing: '-0.025em', margin: 0, textWrap: 'balance' },
  h1: { font: `700 ${desk ? 30 : 26}px/1.15 ${T.font}`, letterSpacing: '-0.02em', margin: 0, textWrap: 'balance', color: T.text },
  h2: { font: `700 20px/1.22 ${T.font}`, letterSpacing: '-0.015em', margin: 0, textWrap: 'balance', color: T.text },
  h3: { font: `600 16px/1.3 ${T.font}`, margin: 0, color: T.text, textWrap: 'balance' },
  body: { font: `400 14px/1.45 ${T.font}`, margin: 0, textWrap: 'pretty' },
  sm: { fontSize: 12.5 },
  xs: { fontSize: 12 },
  dim: { color: T.textDim },
});

/** The kit's `.lbl`: the small spaced label above a block. */
export function Lbl({ T, children, style, as, ...rest }) {
  const Tag = as || 'span';
  return (
    <Tag
      style={{
        display: 'block', font: '600 11.5px/1.2 var(--k-font-m)', letterSpacing: '0.06em',
        color: T.textDim, margin: 0, ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ─── Buttons ────────────────────────────────────────────────────────────────
const BTN_KIND = (T) => ({
  p: { background: T.accent, color: T.onAccent },
  i: { background: 'var(--k-ink)', color: 'var(--k-on-ink)' },
  s: { background: T.surface2, color: T.text },
  g: { background: 'transparent', color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}` },
  bad: { background: '#c42b2b', color: '#fff' },
});

/**
 * The kit's `.btn`: 48px, `sm` 38px (40px on a phone, the kit's touch rule),
 * `lg` 54px. `to` renders a router Link, `href` a plain anchor, else a button.
 */
export function Btn({ T, kind = 'g', size, block, ph, to, href, children, style, ...rest }) {
  const h = size === 'sm' ? (ph ? 40 : 38) : size === 'lg' ? 54 : 48;
  const css = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: h, padding: size === 'sm' ? '0 15px' : size === 'lg' ? '0 26px' : '0 22px',
    borderRadius: 'var(--k-r-btn)', border: 0, cursor: 'pointer', whiteSpace: 'nowrap',
    textDecoration: 'none', flex: 'none', boxSizing: 'border-box',
    font: `600 ${size === 'sm' ? 13.5 : size === 'lg' ? 16 : 15}px/1 ${T.font}`,
    width: block ? '100%' : undefined,
    ...BTN_KIND(T)[kind], ...style,
  };
  if (to) return <Link to={to} style={css} {...rest}>{children}</Link>;
  if (href) return <a href={href} style={css} {...rest}>{children}</a>;
  return <button type="button" style={css} {...rest}>{children}</button>;
}

/** The kit's `.ibtn`: a 44px square icon button. */
export function IconBtn({ T, label, children, style, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      style={{
        width: 44, height: 44, borderRadius: 'var(--k-r-ibtn)', display: 'inline-grid', placeItems: 'center',
        color: T.text, flex: 'none', border: 0, background: T.surface2, cursor: 'pointer', padding: 0, ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ─── Surfaces ───────────────────────────────────────────────────────────────
export const cardStyle = (T) => ({
  background: T.surface, border: 'var(--k-card-bd)', boxShadow: 'var(--k-card-sh)',
  borderRadius: 'var(--k-r-card)', boxSizing: 'border-box',
});

export function Card({ T, pad = 16, children, style, as, ...rest }) {
  const Tag = as || 'div';
  return <Tag style={{ ...cardStyle(T), padding: pad, ...style }} {...rest}>{children}</Tag>;
}

/** The kit's `.list`: a card whose rows own their insets. */
export function List({ T, children, style, ...rest }) {
  return <div style={{ ...cardStyle(T), overflow: 'hidden', ...style }} {...rest}>{children}</div>;
}

/** The kit's `.li`: 56px at least, 13px × 16px, a rule under every row but the last. */
export const liStyle = (T, last) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56,
  // Longhands only, so a <button> row loses its own border and nothing conflicts on a re-render.
  borderTop: 0, borderLeft: 0, borderRight: 0, borderBottom: last ? 0 : `1px solid ${T.border}`,
  color: T.text, textDecoration: 'none',
  boxSizing: 'border-box', width: '100%', background: 'transparent', font: 'inherit', textAlign: 'left',
});

/** The 34px tinted square an icon sits in at the start of a row (the kit's `.li-ic`). */
export function LiIc({ T, name, color, size = 34 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 'var(--k-r-in)', background: T.surface2, flex: 'none',
      display: 'grid', placeItems: 'center', color: color || T.text,
    }}>
      <Glyph name={name} size={18} />
    </span>
  );
}

// ─── Chips & avatars ────────────────────────────────────────────────────────
// The kit's chip tones. `ship` is the kit's indigo for "shipped", which the
// ported theme tokens do not carry, so it is drawn here per mode.
const TONES = (T) => ({
  pend: ['var(--k-warn-bg)', 'var(--k-warn)'],
  conf: ['var(--k-info-bg)', 'var(--k-info)'],
  done: ['var(--k-ok-bg)', 'var(--k-ok)'],
  canc: ['var(--k-mute-bg)', 'var(--k-mute)'],
  bad: ['var(--k-bad-bg)', 'var(--k-bad)'],
  proc: [T.surface2, T.text],
  ship: T.dark ? ['#25234a', '#a9a5ff'] : ['#e7e6fb', '#4338ca'],
  brand: [`color-mix(in oklab, ${T.accent} 15%, ${T.surface})`, T.accentFg],
});

/** The kit's `.chip`: 26px, 12px type, a status dot unless `nd`. */
export function Chip({ T, tone = 'canc', nd, children, style, ...rest }) {
  const [bg, fg] = TONES(T)[tone] || TONES(T).canc;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px',
        borderRadius: 999, background: bg, color: fg, font: `600 12px/1 ${T.font}`,
        whiteSpace: 'nowrap', flex: 'none', ...style,
      }}
      {...rest}
    >
      {!nd && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flex: 'none' }} />}
      {children}
    </span>
  );
}

// Latin letters only: toUpperCase() would turn Georgian Mkhedruli into
// Mtavruli capitals, which the design never uses.
const latinUpper = (s) => String(s).replace(/[a-z]/g, (c) => c.toUpperCase());

/** Two initials from a person's or a store's name; the first letter of the email otherwise. */
export function initialsOf(name, email) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length) return latinUpper(parts.slice(0, 2).map((w) => Array.from(w)[0]).join(''));
  return latinUpper(Array.from(String(email || '?'))[0] || '?');
}

/**
 * The kit's `.av`: 44px, `lg` 76px, `sm` 34px. `ink` is the kit's `.u` — a
 * person, drawn in ink; otherwise the colour given (a store's own) or the brand.
 */
export function Av({ T, size = 'md', ink, color, children, label, style }) {
  const px = size === 'lg' ? 76 : size === 'sm' ? 34 : 44;
  const fs = size === 'lg' ? 25 : size === 'sm' ? 12 : 15;
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      style={{
        width: px, height: px, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
        background: ink ? 'var(--k-ink)' : (color || T.accent), color: ink ? 'var(--k-on-ink)' : '#fff',
        font: `700 ${fs}px ${T.font}`, letterSpacing: '0.02em',
        boxShadow: T.dark ? '0 0 0 1px rgba(255,255,255,.16)' : 'none', ...style,
      }}
    >
      {children}
    </span>
  );
}

// ─── Alert, pill, menu row ──────────────────────────────────────────────────
/** The kit's `.alert` (info tone): a tinted block with an icon. */
export function Alert({ T, children, style }) {
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px',
      borderRadius: 'var(--k-r-card)', background: 'var(--k-info-bg)', color: T.text, ...style,
    }}>
      <span style={{ color: 'var(--k-info)', display: 'flex' }}><Glyph name="info" /></span>
      <span style={{ font: `400 12.5px/1.45 ${T.font}`, minWidth: 0 }}>{children}</span>
    </div>
  );
}

/** The kit's `.pill`, as a router link (the legal documents' tabs). */
export function Pill({ T, on, to, children, ...rest }) {
  return (
    <Link
      to={to}
      style={{
        height: 38, padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 6,
        borderRadius: 999, whiteSpace: 'nowrap', flex: 'none', textDecoration: 'none', boxSizing: 'border-box',
        background: on ? 'var(--k-pill-on)' : 'var(--k-pill-bg)', color: on ? 'var(--k-pill-on-fg)' : T.text,
        border: on ? '1px solid transparent' : 'var(--k-pill-bd)', font: `${on ? 600 : 500} 13.5px ${T.font}`,
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** The kit's `.mi`: a 46px menu row (side menus, the contents list). */
export const miStyle = (T, on) => ({
  display: 'flex', alignItems: 'center', gap: 12, minHeight: 46, padding: '0 12px',
  borderRadius: 'var(--k-r-in)', fontSize: 15, color: T.text, textDecoration: 'none',
  background: on ? T.surface2 : 'transparent', fontWeight: on ? 600 : 400,
  border: 0, width: '100%', boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer', fontFamily: T.font,
});

/** The kit's `.ingrp` field shell: 50px, 1.5px border, the focus ring when `on`. */
export const ingrpStyle = (T, on) => ({
  display: 'flex', alignItems: 'center', height: 50, borderRadius: 'var(--k-r-in)', boxSizing: 'border-box',
  border: `1.5px solid ${on ? T.accent : 'var(--k-in-bd)'}`, background: 'var(--k-in-bg)', overflow: 'hidden',
  color: T.textDim, boxShadow: on ? `0 0 0 4px color-mix(in oklab, ${T.accent} 18%, transparent)` : 'none',
});

export const ingrpInput = (T) => ({
  flex: 1, minWidth: 0, border: 0, background: 'transparent', height: '100%',
  padding: '0 4px 0 15px', font: `15px ${T.font}`, color: T.text, outline: 'none',
});
