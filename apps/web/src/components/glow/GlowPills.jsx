// Topbar pills — ported from direction-a.jsx (v2 handoff): a theme toggle and
// a language pill that opens the language picker.
import { Icon, langInfo } from './GlowPrimitives';

export function ThemePill({ T, dark, onClick, compact = true }) {
  return (
    <button onClick={onClick} aria-label="toggle appearance" style={{
      width: 36, height: 36, borderRadius: compact ? 12 : 999,
      border: `1px solid ${T.border}`, background: 'transparent', color: T.text,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
    }}>
      {dark ? <Icon.sun /> : <Icon.moon />}
    </button>
  );
}

export function LangPill({ T, lang = 'en', onClick, compact = true }) {
  const L = langInfo(lang);
  return (
    <button onClick={onClick} aria-label="language" style={{
      height: 36, padding: compact ? '0 9px' : '0 12px',
      borderRadius: compact ? 12 : 999,
      border: `1px solid ${T.border}`, background: 'transparent', color: T.text,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      font: `600 ${compact ? 11.5 : 12.5}px ${T.font}`, letterSpacing: '0.02em',
      cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      <Icon.globe />
      {compact ? <span>{L.short}</span> : <span>{L.short} · {L.currency.split(' ')[0]}</span>}
    </button>
  );
}
