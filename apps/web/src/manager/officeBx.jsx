// The back office's kit components, drawn with the classes in office.css (the
// design kit's own, bx- prefixed). Shared by the shell, Analytics, Finances
// and the settings tabs. Every label arrives from the caller's t(); the only
// literals here are icon paths, copied from the boards.
/* eslint-disable react-refresh/only-export-components */
import { useDevice } from '../contexts/DeviceContext';
import './office.css';

/** The canvas frame a viewport corresponds to: the value of data-bx. */
export function useBx() {
  const { isDesktop, isTablet } = useDevice();
  return isDesktop ? 'desk' : isTablet ? 'tab' : 'ph';
}

// The boards' icon paths, verbatim, on the kit's 24×24 stroke grid.
const PATHS = {
  chevD: <path d="m6 9 6 6 6-6" />,
  chevDs: <path d="m7 10 5 5 5-5" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  overview: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  orders: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  products: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
  stats: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />,
  money: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M16 14.5h2" /></>,
  team: <><circle cx="9" cy="9" r="3.5" /><path d="M3 19.5c1-3 3.3-4.5 6-4.5s5 1.5 6 4.5" /><circle cx="17" cy="8" r="2.6" /><path d="M17.5 13.5c2 .3 3.3 1.6 4 3.8" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></>,
  more: <><circle cx="5.5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18.5" cy="12" r="1.6" /></>,
  store: <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m4 18 5-5 4 4 3-3 4 4" /></>,
  palette: <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.7 0-.9.7-1.6 1.7-1.6h2a4 4 0 0 0 4-4c0-4-3.8-7-8.5-7z" />,
  warn: <><path d="M12 4 2.5 20h19z" /><path d="M12 10v4M12 17v.5" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.5" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  pin: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  truck: <><path d="M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  layout: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".6" /></>,
  facebook: <path d="M14 21v-7.5h2.6l.4-3H14V8.7c0-.9.3-1.5 1.6-1.5H17V4.5a19 19 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.2H8.4v3H11V21" />,
  phone: <path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  whatsapp: <path d="M4 20l1.2-4A8 8 0 1 1 8 18.9z" />,
  signOut: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 16l-4-4 4-4M6 12h10" /></>,
  swap: <path d="M7 4 4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7" />,
};

/** A board icon. `size` "s" is 16px, "l" 28px, default 20px. */
export function BxIcon({ name, size, className = '', label, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`bx-ic${size ? ` ${size}` : ''}${className ? ` ${className}` : ''}`}
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

// Georgian (Mkhedruli, Mtavruli, Nuskhuri) keeps its own case: upper-casing
// Mkhedruli would give Mtavruli, which reads as shouting.
const GEORGIAN = /[Ⴀ-ჿᲐ-Ჿⴀ-⴯]/;
const LETTER = /\p{L}/u;

/** One letter as an avatar draws it: Latin capitalised, Georgian as it is. */
export function capital(ch) {
  if (!ch) return '';
  return GEORGIAN.test(ch) ? ch : ch.toLocaleUpperCase('en');
}

/**
 * Up to two initials, the way the design's avatars draw them: the first
 * letter of the first two words that start with a letter ("Studio Form" →
 * "SF", "ნინო ბერიძე" → "ნბ", "Fashion & Style" → "FS"). Surrogate-pair safe.
 */
export function initialsOf(name, fallback = '') {
  const words = String(name || '').trim().split(/[\s\-_.]+/)
    .map((w) => Array.from(w).find((c) => LETTER.test(c)))
    .filter(Boolean);
  const two = words.slice(0, 2).map(capital).join('');
  return two || capital(Array.from(String(fallback || ''))[0] || '');
}

/** The kit's switch (`sw`): a real button with role="switch". */
export function Switch({ on, onChange, label, disabled }) {
  return (
    <button
      type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled}
      className={`bx-sw${on ? ' on' : ''}`} onClick={() => onChange(!on)}
    />
  );
}

/** A labelled field (`fld`) around any control. */
export function Fld({ label, children, className = '', style }) {
  return (
    <label className={`bx-fld${className ? ` ${className}` : ''}`} style={style}>
      {label}
      {children}
    </label>
  );
}

/** A native select drawn as the kit's input, with its chevron. */
export function Select({ value, onChange, children, label, ...rest }) {
  return (
    <span className="bx-sel">
      <select className="bx-in" value={value} onChange={onChange} aria-label={label} {...rest}>{children}</select>
      <BxIcon name="chevD" />
    </span>
  );
}

/**
 * The settings tabs' save bar: pinned to the bottom of the content (above the
 * tab bar on a phone), one save for every field of the tab. The buttons rest
 * disabled until something changed; after a save the hint says it was saved.
 */
export function SaveBar({ t, dirty, busy, saved, onSave, onCancel }) {
  return (
    <div className="bx-save">
      <span className="bx-sm bx-dim bx-grow bx-no-ph" aria-live="polite">
        {saved && !dirty ? t('settingsTabs.saved') : t('settingsTabs.saveHint')}
      </span>
      <button type="button" className="bx-btn bx-btn-g bx-btn-sm" disabled={!dirty || busy} onClick={onCancel}>
        {t('settingsTabs.cancel')}
      </button>
      <button type="button" className="bx-btn bx-btn-p bx-btn-sm" disabled={!dirty || busy} onClick={onSave}>
        {busy ? t('settingsTabs.saving') : t('settingsTabs.save')}
      </button>
    </div>
  );
}

/** An info, warning, success or danger alert (`alert`). */
export function Alert({ tone = '', icon = 'info', children, style }) {
  return (
    <div className={`bx-alert${tone ? ` ${tone}` : ''}`} style={style} role={tone === 'bad' ? 'alert' : undefined}>
      <BxIcon name={icon} />
      <div className="bx-stk bx-grow" style={{ gap: 6 }}>{children}</div>
    </div>
  );
}
