/* eslint-disable react-refresh/only-export-components */
// The pieces every screen of "open a store" shares (the design's O2–O10):
// the bar across the top with back and cancel, the step bar, the content
// column for each device, and the phone's action bar at the foot. Classes are
// in sell.css; icons are the boards' own paths.
import './sell.css';
import { useTranslation } from 'react-i18next';
import { useDevice } from '../../contexts/DeviceContext';

/** 'ph' | 'tab' | 'desk', on the app's breakpoints, as the boards name the three frames. */
export function useDev() {
  const { isMobile, isTablet } = useDevice();
  return isMobile ? 'ph' : isTablet ? 'tab' : 'desk';
}

const ICONS = {
  back: <path d="M15 5 8 12l7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  phone: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.6" /></>,
  dots: <path d="M6 12h.01M12 12h.01M18 12h.01" style={{ strokeWidth: 3.2 }} />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  palette: <><path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.7 0-.9.7-1.6 1.7-1.6h2a4 4 0 0 0 4-4c0-4-3.8-7-8.5-7z" /><circle cx="8" cy="11" r="1" /><circle cx="11" cy="7.5" r="1" /><circle cx="15.5" cy="8.5" r="1" /></>,
  shuffle: <path d="M4 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6c1.1 1.7 2.3 2.7 4.3 2.7H20M4 17h3.5c1.4 0 2.4-.5 3.2-1.4M13.3 8.4c.8-.9 1.8-1.4 3.2-1.4H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5" />,
  plus: <path d="M12 6v12M6 12h12" />,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m4 18 5-5 4 4 3-3 4 4" /></>,
  box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></>,
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".6" /></>,
  facebook: <path d="M14 21v-7.5h2.6l.4-3H14V8.7c0-.9.3-1.5 1.6-1.5H17V4.5a19 19 0 0 0-2.3-.1c-2.3 0-3.8 1.4-3.8 3.9v2.2H8.4v3H11V21" />,
  whatsapp: <path d="M4 20l1.2-4A8 8 0 1 1 8 18.9z" />,
  warn: <path d="M12 4.2 2.8 19.5h18.4zM12 10v4.4M12 17.2h.01" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 7.6v5.6M12 16.3h.01" /></>,
  user: <><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" /></>,
  // What you sell (O4)
  fashion: <path d="M12 7.5a2 2 0 1 1 2-2c0 1-1 1.4-2 2.1L3.5 14a1 1 0 0 0 .6 1.8h15.8a1 1 0 0 0 .6-1.8z" />,
  food: <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3.5v3M11.5 3.5v3" />,
  beauty: <path d="M9 21h6V11H9zM10 11V6l4-2.5V11" />,
  tech: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></>,
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  kids: <><circle cx="12" cy="13.6" r="6.6" /><path d="M6.41 10.1A2.8 2.8 0 1 1 9.07 7.68M14.93 7.68A2.8 2.8 0 1 1 17.59 10.1" /><ellipse cx="12" cy="16.3" rx="2.5" ry="1.9" /><path d="M9.5 12.3h.01M14.5 12.3h.01M12 15.7h.01" style={{ strokeWidth: 2.6 }} /></>,
  other: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
};

/** One of the boards' icons, drawn in the text colour. */
export function Ic({ name, className = '', style }) {
  return (
    <svg className={`sl-ic ${className}`} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      {ICONS[name]}
    </svg>
  );
}

/** Google's "G", in its own colours. */
export function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 20, height: 20, flex: 'none' }}>
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" />
    </svg>
  );
}

/** The esy mark and wordmark, in the platform colour (or white on the brand panel). */
export function Logo({ onBrand = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: '800 21px/1 var(--k-font)', letterSpacing: '-.045em', color: onBrand ? '#fff' : 'var(--k-fg)' }}>
      <svg viewBox="0 0 48 48" aria-hidden="true" style={{ width: 30, height: 30, color: onBrand ? '#fff' : 'var(--k-brand)' }}>
        <rect x="4" y="10" width="40" height="34" rx="13" fill="currentColor" />
        <path d="M17 12V9.5a7 7 0 0 1 14 0V12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M15.5 27.5c4.5 5.5 12.5 5.5 17 0" fill="none" stroke={onBrand ? 'var(--k-brand)' : '#fff'} strokeWidth="4" strokeLinecap="round" />
      </svg>
      {'esy'}
    </span>
  );
}

/**
 * A screen of the flow: the top bar (back, what this step is, cancel), the
 * step bar, the content and, on a phone, the action bar at the foot.
 *
 * @param {string} [props.label] the middle of the top bar ("Step 1 / 4")
 * @param {Function} [props.onBack]
 * @param {string} [props.backLabel] what back does, for assistive technology
 * @param {Function} [props.onCancel] leaves the flow; without it, a spacer
 * @param {{on: number, total: number}} [props.steps]
 * @param {import('react').ReactNode} [props.bar] the phone's actions
 */
export function SellScreen({ label, onBack, backLabel, onCancel, steps, bar, top = true, children }) {
  const { t } = useTranslation('platform');
  return (
    <div className="sl">
      {top && (
        <div className="sl-top">
          {onBack
            ? <button type="button" className="sl-ibtn" aria-label={backLabel || t('open.back')} onClick={onBack}><Ic name="back" /></button>
            : <span className="sl-gap" aria-hidden="true" />}
          <span className="sl-sm sl-dim">{label}</span>
          {onCancel
            ? <button type="button" className="sl-link sl-sm" onClick={onCancel}>{t('open.cancel')}</button>
            : <span className="sl-gap" aria-hidden="true" />}
        </div>
      )}
      {steps && (
        <div className="sl-stepsw">
          <div className="sl-steps" aria-hidden="true">
            {Array.from({ length: steps.total }, (_, i) => <i key={i} className={i < steps.on ? 'on' : ''} />)}
          </div>
        </div>
      )}
      <main className="sl-main">{children}</main>
      {bar && <div className="sl-bar">{bar}</div>}
    </div>
  );
}

/**
 * The content column, as the boards lay it out: one column on a phone and a
 * tablet (640px, centred), and on a desktop either one 980px column or a main
 * column beside a 380px side one (`side`).
 */
export function Wrap({ dev, side, gap = {}, top = {}, children, aside }) {
  if (dev === 'desk' && side) {
    return (
      <div style={{ display: 'flex', gap: 72, alignItems: 'flex-start', maxWidth: 1076, width: '100%', margin: '0 auto', padding: `${top.desk ?? 56}px 48px 0` }}>
        <div className="sl-stk" style={{ flex: 1, minWidth: 0, gap: gap.desk ?? 18 }}>{children}</div>
        <div className="sl-stk" style={{ width: 380, flex: 'none', gap: gap.side ?? 10 }}>{aside}</div>
      </div>
    );
  }
  const st = dev === 'desk'
    ? { maxWidth: 1076, padding: `${top.desk ?? 56}px 48px 0`, gap: gap.desk ?? 26 }
    : dev === 'tab'
      ? { maxWidth: 640, padding: `${top.tab ?? 40}px 28px 0`, gap: gap.tab ?? 32 }
      : { padding: `${top.ph ?? 24}px 16px 0`, gap: gap.ph ?? 22 };
  return (
    <div className="sl-stk" style={{ width: '100%', margin: '0 auto', ...st }}>
      {children}
      {aside}
    </div>
  );
}

/** A primary button that stays legible while it waits (aria-disabled, not disabled, so it keeps focus). */
export function Btn({ kind = 'p', size = 'lg', block = true, off = false, onClick, className = '', style, children, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      className={`sl-btn ${kind} ${size} ${block ? 'b' : ''} ${className}`}
      aria-disabled={off || undefined}
      onClick={off ? undefined : onClick}
      style={style}
      {...rest}
    >{children}</button>
  );
}

/** Initials for a store's name: the first letter of its first two words. Latin is capitalised; Georgian has no capitals to give (Mtavruli would be wrong here). */
export function initialsOf(name) {
  const letters = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0]);
  return letters.join('').replace(/[a-z]/g, (c) => c.toUpperCase());
}

/** The masked number a code went to, in the design's shape (+995 5•• •• •• 56), from what was typed. */
export function maskedNumber(typed, destination) {
  const digits = String(typed || '').replace(/\D/g, '');
  const local = digits.startsWith('995') && digits.length === 12 ? digits.slice(3) : digits;
  if (local.length === 9 && (!destination || destination.endsWith(local.slice(-2)))) {
    return `+995 ${local[0]}•• •• •• ${local.slice(-2)}`;
  }
  return destination || '';
}
