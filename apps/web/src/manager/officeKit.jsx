// The pieces the order, product and team screens share, drawn after the
// design kit's own classes (esy-kit.css on the "esy Full Design" canvas):
// .btn, .ibtn, .chip, .card, .list/.li, .kv, .alert, .sw, .opt/.radio,
// .fld/.in, .tl and .dialog. Each takes its colours and radii from the theme
// tokens (themes.css, --k-*), so a screen built from these follows the back
// office's theme and mode without knowing which one it is.
//
// No copy lives here: every label arrives from the caller's t().
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '../core/tokens';

// ---- glyphs, as the boards draw them (24 × 24, stroked) ---------------------
export const G = {
  back: <path d="M15 5 8 12l7 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  refund: (
    <>
      <path d="M4 9a8 8 0 1 1-1 6" />
      <path d="M4 4v5h5" />
    </>
  ),
  phone: <path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />,
  chat: <path d="M4 20l1.2-4A8 8 0 1 1 8 18.9z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="18.5" cy="12" r="1.2" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8v.5" />
    </>
  ),
  warn: (
    <>
      <path d="M12 4 2.5 20h19z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  box: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </>
  ),
};

export function Glyph({ size = 20, children, style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: 'none', strokeWidth: 'var(--k-ic-w, 1.8)', ...style }}>
      {children}
    </svg>
  );
}

// ---- type ---------------------------------------------------------------------
export const type = {
  h2: (T, lang) => ({
    margin: 0, font: `var(--k-w-t, 700) 20px/1.22 ${T.font}`, color: T.text,
    letterSpacing: track(lang, '-0.015em'), textWrap: 'balance',
  }),
  h3: (T) => ({ margin: 0, font: `600 16px/1.3 ${T.font}`, color: T.text }),
  sm: { fontSize: 12.5 },
  xs: { fontSize: 12 },
  // The kit's label. Its capitals are left off: upper-casing Georgian turns it
  // into small Mtavruli, which the design review removed everywhere.
  lbl: (T) => ({ font: `600 11.5px/1.2 ${T.font}`, letterSpacing: '.06em', color: T.textDim }),
  price: { fontVariantNumeric: 'tabular-nums', fontWeight: 600 },
};

// ---- buttons --------------------------------------------------------------------
// The design's one destructive red, the same in light and dark mode: white on
// dark mode's lighter red failed 4.5:1.
export const DEEP_RED = '#c42b2b';

/** The kit's .btn: kind p · s · g · d · bad, size md (48) or sm (38). */
export function btn(T, kind = 'p', { size = 'md', block, off } = {}) {
  const sm = size === 'sm';
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: sm ? 38 : 48, padding: sm ? '0 15px' : '0 22px', borderRadius: 'var(--k-r-btn)',
    font: `600 ${sm ? 13.5 : 15}px/1 ${T.font}`, border: 0, cursor: 'pointer', whiteSpace: 'nowrap',
    textDecoration: 'none', flex: block ? '1 1 0' : 'none', minWidth: 0, boxSizing: 'border-box',
    overflow: 'hidden', textOverflow: 'ellipsis',
  };
  const kinds = {
    p: { background: T.accent, color: T.onAccent },
    s: { background: T.surface2, color: T.text },
    g: { background: 'transparent', color: T.text, boxShadow: `inset 0 0 0 1.5px ${T.border}` },
    d: { background: T.dangerBg, color: T.danger },
    bad: { background: DEEP_RED, color: '#fff' },
  };
  // A button that cannot be pressed is flat and quiet, but its label still
  // reads — never a faded copy of the live one.
  const unavailable = {
    background: `color-mix(in srgb, ${T.text} 9%, ${T.surface})`,
    color: `color-mix(in srgb, ${T.text} 56%, ${T.surface})`,
    boxShadow: 'none', cursor: 'default',
  };
  return { ...base, ...(kinds[kind] || kinds.p), ...(off ? unavailable : null) };
}

/** The kit's .ibtn: a 44 px round-cornered icon button. */
export const ibtn = (T, bg = T.surface2) => ({
  width: 44, height: 44, flex: 'none', padding: 0, border: 0, cursor: 'pointer',
  borderRadius: 'var(--k-r-ibtn)', background: bg, color: T.text,
  display: 'inline-grid', placeItems: 'center', textDecoration: 'none',
});

// ---- surfaces -------------------------------------------------------------------
export const card = (T, pad = 16) => ({
  background: T.surface, border: 'var(--k-card-bd)', boxShadow: 'var(--k-card-sh)',
  borderRadius: 'var(--k-r-card)', padding: pad, boxSizing: 'border-box', minWidth: 0,
});
export const list = (T) => ({ ...card(T, 0), overflow: 'hidden' });
export const li = (T, last) => ({
  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56,
  boxSizing: 'border-box', borderBottom: last ? 0 : `1px solid ${T.border}`, color: T.text,
});
export const kv = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0' };

/** The kit's .alert: info (default), warn, bad or ok, with its icon. */
export function Alert({ T, tone = 'info', icon, children, role, style }) {
  const tones = {
    info: ['var(--k-info-bg)', 'var(--k-info)'],
    warn: [T.warnBg, T.warn],
    bad: [T.dangerBg, T.danger],
    ok: [T.successBg, T.success],
  };
  const [bg, fg] = tones[tone] || tones.info;
  return (
    <div role={role} style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px',
      borderRadius: 'var(--k-r-card)', background: bg, color: T.text, ...style,
    }}>
      <span style={{ color: fg, display: 'inline-flex' }}>
        <Glyph>{icon || (tone === 'warn' || tone === 'bad' ? G.warn : G.info)}</Glyph>
      </span>
      <span style={{ flex: 1, minWidth: 0, font: `400 12.5px/1.5 ${T.font}` }}>{children}</span>
    </div>
  );
}

// ---- order status chips -----------------------------------------------------------
// One hue per fulfilment step (placed amber, shipped indigo, out for delivery
// blue, delivered green, cancelled grey), and payment as its own outlined chip
// beside it — never merged into one status (D2). Shipped and refund-pending
// have no token in themes.css, so their kit values sit here, per mode.
const SHIP = { light: ['#e7e6fb', '#4338ca'], dark: ['#25234a', '#a9a5ff'] };
const RFP = { light: ['#fdeaf3', '#be185d'], dark: ['#3d1a2c', '#f9a8d4'] };

function hue(T, name) {
  const md = T.dark ? 'dark' : 'light';
  return {
    pend: [T.warnBg, T.warn],
    ship: [`var(--k-ship-bg, ${SHIP[md][0]})`, `var(--k-ship, ${SHIP[md][1]})`],
    conf: ['var(--k-info-bg)', 'var(--k-info)'],
    done: [T.successBg, T.success],
    canc: ['var(--k-mute-bg)', 'var(--k-mute)'],
    ref: [T.dangerBg, T.danger],
    rfp: RFP[md],
    // a role chip's neutral: the kit's c-proc
    proc: [T.surface2, T.text],
  }[name] || ['var(--k-mute-bg)', 'var(--k-mute)'];
}

export const STATUS_HUE = { PLACED: 'pend', SHIPPED: 'ship', OUT_FOR_DELIVERY: 'conf', DELIVERED: 'done', CANCELLED: 'canc' };
export const PAY_HUE = { NONE: 'canc', PENDING: 'pend', PAID: 'done', FAILED: 'ref', REFUND_PENDING: 'rfp', REFUNDED: 'canc' };

/** The kit's .chip — `dot` for a status, `outline` for a payment. */
export function Chip({ T, name, dot = true, outline, children, style }) {
  const [bg, fg] = hue(T, name);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px',
      boxSizing: 'border-box', borderRadius: 'var(--k-r-pill)', font: `600 12px/1 ${T.font}`,
      whiteSpace: 'nowrap', flex: 'none', color: fg,
      background: outline ? 'transparent' : bg,
      boxShadow: outline ? 'inset 0 0 0 1.5px color-mix(in oklab, currentColor 55%, transparent)' : 'none',
      ...style,
    }}>
      {dot && !outline && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flex: 'none' }} />}
      {children}
    </span>
  );
}

// ---- controls -------------------------------------------------------------------
/** The kit's .sw. Presentational: the caller owns the state and the click. */
export function Switch({ T, on, onClick, disabled, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled}
      onClick={onClick}
      style={{
        position: 'relative', width: 46, height: 28, flex: 'none', padding: 0, border: 0,
        borderRadius: 14, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        background: on ? T.accent : T.border,
      }}
    >
      {/* a 44 px target around the 28 px track, as the kit's ::before draws it */}
      <span aria-hidden="true" style={{ position: 'absolute', inset: -8 }} />
      <span aria-hidden="true" style={{
        position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left 120ms ease',
      }} />
    </button>
  );
}

/** The kit's .opt: a radio card. `children` is the right-hand slot. */
export function Option({ T, on, onSelect, title, sub, children, disabled, name }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', boxSizing: 'border-box',
      width: '100%', borderRadius: 'var(--k-r-card)', background: T.surface, color: T.text,
      border: `1.5px solid ${on ? T.accent : T.border}`, cursor: disabled ? 'default' : 'pointer',
      boxShadow: on ? `0 0 0 3px color-mix(in oklab, ${T.accent} 14%, transparent)` : 'none',
    }}>
      <input
        type="radio" name={name} checked={!!on} disabled={disabled}
        onChange={() => onSelect?.()}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, margin: 0, pointerEvents: 'none' }}
      />
      <span aria-hidden="true" style={{
        width: 22, height: 22, borderRadius: '50%', flex: 'none', boxSizing: 'border-box',
        background: T.surface, border: on ? `7px solid ${T.accent}` : `2px solid ${T.border}`,
      }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block', font: `600 12.5px/1.4 ${T.font}` }}>{title}</b>
        {sub && <span style={{ display: 'block', font: `400 12px/1.4 ${T.font}`, color: T.textDim }}>{sub}</span>}
      </span>
      {children}
    </label>
  );
}

/** The kit's .fld wrapping its .in: a label over a 50 px input. */
export const fld = (T) => ({ display: 'flex', flexDirection: 'column', gap: 7, font: `400 12.5px ${T.font}`, color: T.textDim });
export const input = (T, { focus, error } = {}) => ({
  width: '100%', height: 50, padding: '0 15px', boxSizing: 'border-box', borderRadius: 'var(--k-r-in)',
  background: 'var(--k-in-bg)', color: T.text, font: `400 15px ${T.font}`, outline: 'none', appearance: 'none',
  border: `1.5px solid ${error ? T.danger : focus ? T.accent : 'var(--k-in-bd)'}`,
  boxShadow: focus && !error ? `0 0 0 4px color-mix(in oklab, ${T.accent} 18%, transparent)` : 'none',
});

/** Focus that rings like the kit's .in.on — for the keyboard and the pointer alike. */
export function useFocusRing() {
  const [focus, setFocus] = useState(false);
  return [focus, { onFocus: () => setFocus(true), onBlur: () => setFocus(false) }];
}

// ---- the page heading --------------------------------------------------------------
/**
 * The back office's page head as the boards draw it in the top bar: a back
 * button, the title, and its line underneath. `onBack` omitted means a tab
 * root, which opens with its title alone.
 */
export function PageHead({ T, title, sub, onBack, backLabel, right, mobile }) {
  const { i18n } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
      {onBack && (
        <button type="button" onClick={onBack} aria-label={backLabel} style={ibtn(T)}>
          <Glyph>{G.back}</Glyph>
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ ...type.h2(T, i18n.language), display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </h1>
        {sub && (
          <div style={{
            marginTop: 2, font: `400 12.5px/1.45 ${T.font}`, color: T.textDim,
            ...(mobile ? null : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
          }}>{sub}</div>
        )}
      </div>
      {right}
    </div>
  );
}

// ---- the dialog -----------------------------------------------------------------
/**
 * The kit's .dialog: centred on a wide screen, a bottom sheet with a grab
 * handle on a phone. Escape and a tap outside close it, focus moves in and
 * comes back to where it was.
 */
export function Sheet({ T, isMobile, titleId, label, onClose, children }) {
  const box = useRef(null);
  // The latest close handler, so the listeners are set up once and focus is
  // not pulled back into the dialog on every render.
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  useEffect(() => {
    const before = document.activeElement;
    (box.current?.querySelector('[data-autofocus]:not([disabled])') || box.current)?.focus();
    const onKey = (e) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (before && typeof before.focus === 'function') before.focus();
    };
  }, []);

  return (
    <div
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close.current(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(8,8,12,0.44)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
        padding: isMobile ? 0 : 24,
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={titleId ? undefined : label}
        tabIndex={-1}
        style={{
          width: '100%', maxWidth: isMobile ? 'none' : 520, boxSizing: 'border-box',
          maxHeight: isMobile ? '88vh' : 'calc(100vh - 48px)', overflowY: 'auto', outline: 'none',
          display: 'flex', flexDirection: 'column', gap: 16,
          padding: isMobile ? '10px 16px calc(env(safe-area-inset-bottom) + 18px)' : 26,
          borderRadius: isMobile ? 'var(--k-r-sheet) var(--k-r-sheet) 0 0' : 'var(--k-r-sheet)',
          background: T.surface, color: T.text, boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)',
        }}
      >
        {isMobile && (
          <span aria-hidden="true" style={{
            width: 42, height: 5, borderRadius: 3, background: T.border, alignSelf: 'center', flex: 'none',
          }} />
        )}
        {children}
      </div>
    </div>
  );
}

/** A dialog's head row: its title and the round close button. */
export function SheetHead({ T, titleId, title, closeLabel, onClose, autofocusClose, children }) {
  const { i18n } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: children ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <h2 id={titleId} style={type.h2(T, i18n.language)}>{title}</h2>
        {children}
      </div>
      <button
        type="button" onClick={onClose} aria-label={closeLabel}
        data-autofocus={autofocusClose ? '' : undefined}
        style={ibtn(T)}
      ><Glyph size={18}>{G.close}</Glyph></button>
    </div>
  );
}

// ---- the team (Y1, Y2) -----------------------------------------------------------------
/** A team member's own name from their profile, or '' before they filled it in. */
export const fullName = (m) => [m?.firstName, m?.lastName].filter(Boolean).join(' ');

/**
 * A team refusal in the merchant's words, from the code the server sent
 * (MembershipService); its English sentence when it sent none.
 */
export function teamProblem(t, e, fallbackKey) {
  const d = e?.details || {};
  switch (e?.code) {
    case 'TEAM_ALREADY':
      return t(d.role === 'OWNER' ? 'invite.err.alreadyOwner' : 'invite.err.alreadyManager', { email: d.email || '' });
    case 'TEAM_NO_ACCOUNT': return t('invite.err.noAccount', { email: d.email || '' });
    case 'TEAM_BAD_EMAIL': return t('invite.err.badEmail');
    case 'TEAM_BAD_ROLE': return t('invite.err.badRole');
    case 'TEAM_LAST_OWNER': return t('invite.err.lastOwner');
    case 'TEAM_NOT_STAFF': return t('invite.err.notStaff', { email: d.email || '' });
    default: return e?.message || t(fallbackKey);
  }
}

// ---- small helpers ------------------------------------------------------------------
/** "ანა მაისურაძე" → "ანა მ.", the way the design's lists name a buyer. */
export function shortName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${Array.from(parts[parts.length - 1])[0]}.`;
}

/** Two initials for an avatar: "ანა მაისურაძე" → "ამ", "nino.b@…" → "N". */
export function initials(name, fallback) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${Array.from(parts[0])[0]}${Array.from(parts[parts.length - 1])[0]}`;
  if (parts.length === 1) return Array.from(parts[0])[0];
  return Array.from(String(fallback || '?').trim())[0]?.toUpperCase() || '?';
}

/** The kit's small .av.u: initials on ink. */
export function Avatar({ T, text, size = 34 }) {
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
      background: 'var(--k-ink)', color: 'var(--k-on-ink)', font: `700 ${size >= 44 ? 15 : 12}px ${T.font}`,
      letterSpacing: '.02em',
    }}>{text}</span>
  );
}

/** "+995577442108" → "+995 577 44 21 08", the way a Georgian number is read. */
export function formatPhone(raw) {
  const s = String(raw || '').replace(/[\s-]/g, '');
  const m = /^(\+995)(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(s);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : String(raw || '');
}

/** "+995577442108" → "+995 577 •• •• 08": enough to recognise, not to copy. */
export function maskPhone(raw) {
  const s = String(raw || '').replace(/[\s-]/g, '');
  const m = /^(\+995)(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(s);
  if (m) return `${m[1]} ${m[2]} •• •• ${m[5]}`;
  return s.length > 6 ? `${s.slice(0, 4)} •• •• ${s.slice(-2)}` : s;
}
