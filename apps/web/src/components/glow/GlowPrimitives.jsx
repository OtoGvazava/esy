// Glow shared primitives — ported verbatim from the handoff (shared.jsx):
// the inline-SVG Icon set, striped Placeholder, "powered by esy" mark, and
// the removable filter token pill.
import { GLOW_MONO } from '../../styles/glow';

export const Icon = {
  search: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  cart: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg>,
  bag: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>,
  grid: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>,
  user: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
  heart: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>,
  plus: (p = {}) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>,
  arrowR: (p = {}) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14m-5-6 6 6-6 6" /></svg>,
  star: (p = {}) => <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" {...p}><path d="m12 17.3-6.2 3.7 1.7-7L2 9.3l7.2-.6L12 2l2.8 6.7 7.2.6-5.5 4.7 1.7 7z" /></svg>,
  menu: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  filter: (p = {}) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M6 12h12M10 18h4" /></svg>,
  spark: (p = {}) => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...p}><path d="M12 2 14 10l8 2-8 2-2 8-2-8-8-2 8-2z" /></svg>,
  pin: (p = {}) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13Z" /><circle cx="12" cy="9" r="2.5" /></svg>,
  mail: (p = {}) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  share: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>,
  sun: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>,
  moon: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>,
  globe: (p = {}) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>,
  check: (p = {}) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m5 12 5 5L20 7" /></svg>,
  auto: (p = {}) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3v18M12 3a9 9 0 0 1 0 18Z" fill="currentColor" /></svg>,
  close: (p = {}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>,
};

// App's real supported languages (react-i18next: en + ka), shaped like the
// design's LANGS so the picker UI ports directly.
export const LANGS = [
  { code: 'en', native: 'English', short: 'EN', region: 'United States', currency: 'USD ($)' },
  { code: 'ka', native: 'ქართული', short: 'KA', region: 'საქართველო', currency: 'GEL (₾)' },
];
export const langInfo = (code) => LANGS.find((l) => l.code === code) || LANGS[0];

// Subtle striped placeholder with a monospace label (used when a product has
// no real photo — preserves aspect ratio, avoids confusing reviewers).
export function Placeholder({ label, hue = 240, dark = false, style = {}, radius = 0 }) {
  const c1 = dark ? `oklch(0.22 0.02 ${hue})` : `oklch(0.93 0.02 ${hue})`;
  const c2 = dark ? `oklch(0.18 0.02 ${hue})` : `oklch(0.97 0.015 ${hue})`;
  const text = dark ? `oklch(0.6 0.04 ${hue})` : `oklch(0.45 0.04 ${hue})`;
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `repeating-linear-gradient(135deg, ${c1} 0 8px, ${c2} 8px 16px)`,
      display: 'flex', alignItems: 'flex-end', padding: 10,
      color: text, font: `500 10px ${GLOW_MONO}`,
      letterSpacing: '0.02em', borderRadius: radius, position: 'relative', overflow: 'hidden',
      ...style,
    }}>
      <span style={{ opacity: 0.85 }}>// {label}</span>
    </div>
  );
}

export function PoweredBy({ T, align = 'center', size = 10 }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: align === 'center' ? 'center' : 'flex-start', gap: 6,
      color: T.textMute, font: `500 ${size}px ${GLOW_MONO}`,
      letterSpacing: '0.12em', textTransform: 'uppercase',
    }}>
      <span style={{ opacity: 0.7 }}>powered by</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: T.text, opacity: 0.85 }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }} />
        esy
      </span>
    </div>
  );
}

export function GlowToken({ T, children, removable = true, outline = false, accent = false, onClick }) {
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px',
      borderRadius: 999, whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default',
      font: `500 12px ${T.font}`, letterSpacing: '-0.005em',
      background: accent ? T.accentBg : (outline ? 'transparent' : T.surface2),
      color: accent ? T.accentFg : T.text,
      border: `1px solid ${outline ? T.border : 'transparent'}`,
    }}>
      {children}
      {removable && <span style={{ opacity: 0.55, font: `500 14px ${T.font}`, marginLeft: 2 }}>×</span>}
    </span>
  );
}
