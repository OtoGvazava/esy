/* eslint-disable react-refresh/only-export-components */
// The shopper screens drawn straight from their boards (A8, A9, B1–B5, C2,
// C3, D2, E2–E4) share the design kit's classes (styles/shop-kit.css) and
// these few pieces: the .sk root that carries the device, the kit's own
// glyphs, the store's header with a back button, a product thumbnail, the
// four-box code input and the store's reachable channels.
//
// Copy never lives here: every label arrives from the caller's t().
import { useEffect, useRef, useState } from 'react';
import { useDevice } from '../../contexts/DeviceContext';
import { usePublicContacts } from '../../hooks/useStoreContacts';
import { markIfComplete, markLoaded } from '../../core/imgFade';
import '../../styles/shop-kit.css';

/** The design's three frames: ph ≤ 768 px, tab ≤ 1024 px, desk beyond. */
export function useDev() {
  const { isMobile, isTablet } = useDevice();
  return isMobile ? 'ph' : isTablet ? 'tab' : 'desk';
}

/** The kit's root: its classes only apply inside, and device rules key on data-dev. */
export function Sk({ className = '', children, ...rest }) {
  const dev = useDev();
  return <div className={`sk ${className}`.trim()} data-dev={dev} {...rest}>{children}</div>;
}

// ── Glyphs: the boards' own paths ───────────────────────────────────────────
const PATHS = {
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M15 5 8 12l7 7" />,
  chevR: <path d="m9 5 7 7-7 7" />,
  chevD: <path d="m6 9 6 6 6-6" />,
  chat: <path d="M4 20l1.2-4A8 8 0 1 1 8 18.9z" />,
  phone: <path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />,
  truck: <><path d="M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></>,
  pin: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.5" /></>,
  warn: <><path d="M12 4 2.5 20h19z" /><path d="M12 10v4M12 17v.5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  store: <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5" />,
  bag: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  wifiOff: <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 6-2.9M19 13a10 10 0 0 0-3.2-2.2M2 9.5A15 15 0 0 1 8 6.3M22 9.5a15 15 0 0 0-9-3.4" />,
  user: <><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c1.5-4 4.3-5.5 7.5-5.5s6 1.5 7.5 5.5" /></>,
};

/** A line glyph. `cls` is the kit's sizing class: "ic", "ic s", or none inside .btn/.li-ic. */
export function G({ name, cls = 'ic', style }) {
  return (
    <svg className={cls || undefined} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={style}>
      {PATHS[name]}
    </svg>
  );
}

/** Google's own mark, in its own colours (B1, D2). */
export function GoogleMark({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ width: size, height: size, flex: 'none', stroke: 'none' }}>
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" />
    </svg>
  );
}

/** esy's bag with a smile, in the page's primary colour (B1, the platform bar). */
export function EsyBag({ size = 52, color = 'var(--k-pri)' }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ width: size, height: size, color, flex: 'none' }}>
      <rect x="4" y="10" width="40" height="34" rx="13" fill="currentColor" />
      <path d="M17 12V9.5a7 7 0 0 1 14 0V12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M15.5 27.5c4.5 5.5 12.5 5.5 17 0" fill="none" strokeWidth="4" strokeLinecap="round" style={{ stroke: 'var(--k-on-pri)' }} />
    </svg>
  );
}

// ── Text helpers ────────────────────────────────────────────────────────────
/** "SF" for Studio Form, "ნბ" for ნინო ბერიძე: Latin is capitalised, Georgian left as it is
 *  (toUpperCase would turn it into Mtavruli capitals). */
export function initials(name) {
  // The first letter of the first two words that have one ("Fashion & Style" → "FS").
  return String(name || '').trim().split(/\s+/)
    .map((w) => Array.from(w).find((c) => /\p{L}/u.test(c))).filter(Boolean).slice(0, 2)
    .join('').replace(/[a-z]/g, (c) => c.toUpperCase());
}

const digits = (p) => String(p || '').replace(/\D/g, '');

/** A Georgian mobile as the design writes it, "+995 555 12 34 56"; anything else as typed. */
export function phoneText(p) {
  const m = digits(p).match(/^(?:995)?(5\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+995 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : String(p || '').trim();
}

/** The server's timestamps carry no zone (LocalDateTime); read them as local time. */
export function parseWhen(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * "31 ოქტ. · 14:20". Month names come from the locale (storefront.date), not
 * from Intl: a browser without Georgian locale data would print English ones.
 */
export function dayTime(t, v, { time = true } = {}) {
  const d = parseWhen(v);
  if (!d) return '';
  const months = t('date.monthsShort', { ns: 'storefront', returnObjects: true });
  const day = `${d.getDate()} ${Array.isArray(months) ? months[d.getMonth()] : d.getMonth() + 1}`;
  if (!time) return day;
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${day} · ${hm}`;
}

// ── Pieces ──────────────────────────────────────────────────────────────────
/**
 * The store's header on a pushed screen (StoreTop "back"): a round glass back
 * button, the title centred. Phone and tablet only — on a desktop the store bar
 * is the header and the page starts with DeskTitle.
 */
export function BackTop({ title, onBack, backLabel }) {
  return (
    <div className="st-top">
      <button type="button" className="ibtn float" aria-label={backLabel} onClick={onBack}><G name="back" cls="" /></button>
      <b className="h3 grow" style={{ textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</b>
      <span style={{ width: 44, flex: 'none' }} />
    </div>
  );
}

/** Desktop: "‹ back" above the page's large title. */
export function DeskTitle({ title, back, onBack }) {
  return (
    <div>
      <button type="button" className="link sm" onClick={onBack} style={{ display: 'inline-block', marginBottom: 4 }}>{`‹ ${back}`}</button>
      <h1 className="h1" style={{ display: 'block' }}>{title}</h1>
    </div>
  );
}

/** A product's photo, or the theme's tile with a bag when it has none (or it fails). */
export function Thumb({ src, i = 0, size = 52, radius = 12, alt = '' }) {
  const [ok, setOk] = useState(Boolean(src));
  useEffect(() => { setOk(Boolean(src)); }, [src]);
  return (
    <span className={`ph t${(i % 4) + 1}`} style={{ width: size, borderRadius: radius }}>
      {ok ? (
        <img
          src={src} alt={alt} loading="lazy" onError={() => setOk(false)}
          className="esy-img" ref={markIfComplete} onLoad={markLoaded}
        />
      ) : <G name="bag" cls="" />}
    </span>
  );
}

/**
 * The four boxes of a one-time code. One real input lies over them, so typing,
 * pasting and the phone's "from Messages" suggestion all work; the boxes only
 * draw what it holds, and the next box takes the focus ring.
 */
export function Otp({ value, onChange, length = 4, invalid = false, label, autoFocus = false, disabled = false, align = 'center', inputRef }) {
  const own = useRef(null);
  const ref = inputRef || own;
  const [focus, setFocus] = useState(false);
  const chars = String(value || '').slice(0, length).split('');
  const at = Math.min(chars.length, length - 1);
  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus({ preventScroll: true });
  }, [autoFocus, ref]);
  return (
    <div className="otp" role="group" aria-label={label} aria-invalid={invalid || undefined} style={{ justifyContent: align === 'start' ? 'flex-start' : 'center' }}>
      {Array.from({ length }, (_, i) => (
        <span key={i} aria-hidden="true" className={focus && i === at ? 'on' : undefined}>{chars[i] || ''}</span>
      ))}
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        aria-label={label}
        aria-invalid={invalid || undefined}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * The store's public channels a shopper can reach it on right now: its
 * WhatsApp and its phone, the primary first. Empty when it lists none (or the
 * list cannot be read) — callers then draw no contact button at all.
 */
export function useStoreChannels(enabled = true) {
  const { channels: rows } = usePublicContacts(enabled);
  const pick = (type) => rows.filter((c) => c.type === type && c.value)
    .sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary))[0] || null;
  return { whatsapp: pick('whatsapp'), phone: pick('phone') };
}
