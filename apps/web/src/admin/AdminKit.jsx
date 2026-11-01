// The design kit's pieces as the admin screens draw them (billing, config,
// SMS and email, the store's verified switch): alert, figure card, segmented
// control, 12px chip, list row, dialog and the glyphs the boards use that the
// shared icon set lacks. Inline styles from the admin token object, like every
// other admin screen; no copy lives here — every label arrives from t().
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { alpha } from '../core/tokens';

// ─── Glyphs ─────────────────────────────────────────────────────────────────
// Paths copied from the boards (AD0, AD5, AD6, AD7). 24×24, stroked in
// currentColor, decorative unless the caller labels them.
const PATHS = {
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.5" /></>,
  warn: <><path d="M12 4.5 3 19.5h18z" /><path d="M12 10.5v4M12 17v.5" /></>,
  ok: <><circle cx="12" cy="12" r="8.5" /><path d="m8 12.5 3 3 5-6" /></>,
  download: <path d="M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  chevL: <path d="m15 6-6 6 6 6" />,
  chevR: <path d="m9 6 6 6-6 6" />,
  chevD: <path d="m6 9 6 6 6-6" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  sms: <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-9l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z" />,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  db: <><ellipse cx="12" cy="6" rx="7" ry="2.8" /><path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" /></>,
  store: <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5" />,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  // The Shell board's navigation and top bar.
  shieldCheck: <><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></>,
  more: <><circle cx="5.5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18.5" cy="12" r="1.6" /></>,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  back: <path d="M15 5 8 12l7 7" />,
  logout: <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />,
  manager: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  ban: <><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  // A seal with a tick: the verified mark.
  verified: <><path d="M12 3.2 14.1 5l2.7-.3.9 2.6 2.4 1.3-.6 2.7 1.3 2.4-2 1.9-.1 2.7-2.7.5-1.6 2.2-2.4-1.2-2.4 1.2-1.6-2.2-2.7-.5-.1-2.7-2-1.9 1.3-2.4-.6-2.7 2.4-1.3.9-2.6 2.7.3z" /><path d="m9 12.2 2.1 2.1 4-4.3" /></>,
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
      style={{ flex: 'none', ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}

/**
 * The esy bag and wordmark as the kit's `.logo` draws it: a 30px mark and
 * 21px type by default (the sidebar uses 28 / 19). `font={0}` draws the mark alone.
 */
export function EsyLogo({ T, size = 30, font = 21 }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, flex: 'none', color: T.text,
      font: `800 ${font || 21}px/1 ${T.font}`, letterSpacing: '-0.045em',
    }}>
      <svg viewBox="0 0 48 48" aria-hidden="true" style={{ width: size, height: size, color: T.accent, flex: 'none' }}>
        <rect x="4" y="10" width="40" height="34" rx="13" fill="currentColor" />
        <path d="M17 12V9.5a7 7 0 0 1 14 0V12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M15.5 27.5c4.5 5.5 12.5 5.5 17 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {/* The brand is a proper noun, the same in both languages. */}
      {font ? 'esy' : null}
    </span>
  );
}

// ─── Status colours ─────────────────────────────────────────────────────────
// The kit's chip tones, read from the shared status tokens in themes.css.
const TONES = {
  mute: ['var(--k-mute-bg)', 'var(--k-mute)'],
  warn: ['var(--k-warn-bg)', 'var(--k-warn)'],
  info: ['var(--k-info-bg)', 'var(--k-info)'],
  ok: ['var(--k-ok-bg)', 'var(--k-ok)'],
  bad: ['var(--k-bad-bg)', 'var(--k-bad)'],
  proc: ['var(--k-sf2)', 'var(--k-fg)'],
};

/** The kit's chip: 26px, 12px type, an optional status dot. */
export function KitChip({ T, tone = 'mute', dot = false, children, style }) {
  const [bg, fg] = tone === 'brand'
    ? [`color-mix(in oklab, ${T.accent} 15%, ${T.surface})`, T.accentFg]
    : (TONES[tone] || TONES.mute);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px',
      borderRadius: 999, background: bg, color: fg, font: `600 12px/1 ${T.font}`,
      whiteSpace: 'nowrap', flex: 'none', ...style,
    }}>
      {dot && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flex: 'none' }} />}
      {children}
    </span>
  );
}

/** "From the environment" or "changed here" — where a live config value comes from. */
export function SourceChip({ T, source }) {
  const { t } = useTranslation('admin');
  const override = source === 'override';
  return (
    <KitChip T={T} tone={override ? 'warn' : 'mute'}>
      {override ? t('kit.sourceOverride') : t('kit.sourceEnv')}
    </KitChip>
  );
}

// ─── Alert ──────────────────────────────────────────────────────────────────
const ALERT_ICON = { info: 'info', warn: 'info', bad: 'warn', ok: 'ok' };

/** The kit's alert: a tinted block with an icon, an optional bold line, then the body. */
export function Alert({ T, tone = 'info', icon, title, children, style }) {
  const [bg, fg] = TONES[tone] || TONES.info;
  return (
    <div
      role={tone === 'bad' ? 'alert' : undefined}
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px',
        borderRadius: 16, background: bg, color: T.text, ...style,
      }}
    >
      <span style={{ color: fg, display: 'flex' }}><Glyph name={icon || ALERT_ICON[tone]} /></span>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {title && <span style={{ font: `700 12.5px/1.45 ${T.font}` }}>{title}</span>}
        <span style={{ font: `500 12.5px/1.55 ${T.font}` }}>{children}</span>
      </div>
    </div>
  );
}

// ─── Figures ────────────────────────────────────────────────────────────────
/** One headline figure (the kit's `.card.kpi`). `value` arrives formatted; null is a dash. */
export function Kpi({ T, label, value, hint, big, style }) {
  return (
    <div style={{
      padding: 16, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0,
      borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, ...style,
    }}>
      <span style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{label}</span>
      <b style={{
        font: `700 ${big ? 28 : 24}px/1.1 ${T.font}`, color: value == null ? T.textMute : T.text,
        letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value == null ? '—' : value}
      </b>
      {hint && <span style={{ font: `500 12px/1.4 ${T.font}`, color: T.textDim }}>{hint}</span>}
    </div>
  );
}

// ─── Segmented control ──────────────────────────────────────────────────────
/** One of a few, all visible (the kit's `.seg`). Buttons are 38px, 40px on a phone. */
export function Seg({ T, options, value, onChange, phone, label, style }) {
  return (
    <div role="group" aria-label={label} style={{
      display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: T.surface2, ...style,
    }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            style={{
              flex: '1 1 0', minWidth: 0, height: phone ? 40 : 38, padding: '0 10px', borderRadius: 9,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: on ? (T.dark ? 'color-mix(in oklab, var(--k-fg) 16%, var(--k-sf2))' : T.surface) : 'transparent',
              boxShadow: on ? '0 1px 4px rgba(0,0,0,0.14)' : 'none',
              color: on ? T.text : T.textDim, font: `${on ? 600 : 500} 13.5px ${T.font}`,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Lists ──────────────────────────────────────────────────────────────────
/** The kit's `.list`: a card whose rows own their insets. */
export function List({ T, children, style }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
      overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  );
}

/** The 34px tinted square an icon sits in at the start of a list row. */
export function RowIcon({ T, name, tone }) {
  return (
    <span style={{
      width: 34, height: 34, borderRadius: 10, background: T.surface2, flex: 'none',
      display: 'grid', placeItems: 'center', color: tone || T.text,
    }}>
      <Glyph name={name} size={18} />
    </span>
  );
}

/** The kit's switch, drawn only; the row around it is the control. */
export function SwitchMark({ T, on, dim }) {
  return (
    <span aria-hidden="true" style={{
      position: 'relative', display: 'inline-block', width: 46, height: 28, borderRadius: 14,
      flex: 'none', background: on ? T.accent : T.borderStr, opacity: dim ? 0.45 : 1,
      transition: 'background 120ms ease',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 120ms ease',
      }} />
    </span>
  );
}

/**
 * A switch you can reach with the keyboard: a real <button role="switch">
 * at least 44px square around the drawn mark. `label` names it for a screen
 * reader when no visible text sits beside it.
 */
export function Switch({ T, on, onChange, disabled, label, dim }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        minWidth: 46, minHeight: 44, padding: 0, border: 'none', background: 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, flex: 'none',
      }}
    >
      <SwitchMark T={T} on={on} dim={dim} />
    </button>
  );
}

// ─── Dialog ─────────────────────────────────────────────────────────────────
/**
 * The kit's dialog: a centred 520px card, or a sheet from the bottom edge on a
 * phone. Escape and the scrim close it unless `busy`.
 */
export function Dialog({ T, phone, title, onClose, busy, children }) {
  const { t } = useTranslation('admin');
  const titleId = useId();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);
  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(8,8,12,0.44)',
        display: 'flex', alignItems: phone ? 'flex-end' : 'center', justifyContent: 'center',
        padding: phone ? 0 : 24,
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          width: '100%', maxWidth: phone ? 'none' : 520, background: T.surface, color: T.text,
          borderRadius: phone ? '24px 24px 0 0' : 24, boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)',
          padding: phone ? '12px 16px 22px' : 26, display: 'flex', flexDirection: 'column', gap: 16,
          maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box',
        }}
      >
        {phone && (
          <span aria-hidden="true" style={{ width: 42, height: 5, borderRadius: 3, background: T.border, alignSelf: 'center' }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <b id={titleId} style={{ font: `700 20px/1.22 ${T.font}`, letterSpacing: '-0.015em' }}>{title}</b>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={t('kit.close')}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none', background: T.surface2,
              color: T.text, display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none',
            }}
          >
            <Glyph name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

/** A row of a dialog's consequence list (inside a List): icon square and one sentence. */
export function DialogPoint({ T, icon, tone, first, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56,
      boxSizing: 'border-box', borderTop: first ? 'none' : `1px solid ${T.border}`,
    }}>
      <RowIcon T={T} name={icon} tone={tone} />
      <span style={{ flex: 1, minWidth: 0, font: `500 12.5px/1.5 ${T.font}`, color: T.text }}>{children}</span>
    </div>
  );
}

/** The kit's buttons, in the four kinds the boards use. */
export function KitBtn({ T, kind = 'ghost', size = 'md', full, children, style, disabled, ...rest }) {
  const h = size === 'sm' ? 38 : size === 'lg' ? 54 : 48;
  const kinds = {
    primary: { background: T.accent, color: T.onAccent, boxShadow: 'none' },
    ghost: { background: 'transparent', color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}` },
    soft: { background: 'var(--k-bad-bg)', color: 'var(--k-bad)' },
    // The one deep red the design uses for destructive confirmations, in both modes.
    danger: { background: '#c42b2b', color: '#fff' },
  };
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: h, padding: size === 'sm' ? '0 15px' : '0 22px', borderRadius: 12, border: 'none',
        font: `600 ${size === 'sm' ? 13.5 : 15}px/1 ${T.font}`, whiteSpace: 'nowrap', flex: 'none',
        width: full ? '100%' : undefined, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, ...kinds[kind], ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Mono inline text inside a sentence (env var names, tokens) — for <Trans
 * components>. The system monospace: the kit's JetBrains Mono is only loaded
 * for Neon storefronts.
 */
export function Mono({ T, children, style }) {
  return (
    <span style={{ fontFamily: T.mono, fontSize: '0.92em', overflowWrap: 'anywhere', ...style }}>
      {children}
    </span>
  );
}

/** A thin bar, filled to `pct` (0–100). Over the limit it turns warning-amber. */
export function Progress({ T, pct, over }) {
  return (
    <div style={{ flex: 1, height: 6, borderRadius: 3, background: T.surface2, overflow: 'hidden' }}>
      <i style={{
        display: 'block', height: '100%', borderRadius: 3, width: `${Math.max(0, Math.min(100, pct))}%`,
        background: over ? 'var(--k-warn)' : T.accent,
      }} />
    </div>
  );
}

/** A left-aligned label above a block (the kit's `.lbl`, sentence case). */
export function Label({ T, children, style }) {
  return (
    <span style={{ font: `600 12px/1.2 ${T.font}`, color: T.textDim, ...style }}>{children}</span>
  );
}

export const kitAlpha = alpha;
