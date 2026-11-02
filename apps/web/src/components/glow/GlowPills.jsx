// Topbar pills — ported from direction-a.jsx (v2 handoff): a theme toggle and
// a language pill that opens the language picker.
import { Link } from 'react-router-dom';
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

// The pill opens the Language and display page rather than flipping the
// language, so it is drawn as a way in, not a switch: a link with a chevron
// after the current language, beside the theme toggle's square. Given `to`
// it is a real link; `onClick` alone keeps it a button (the design previews).
export function LangPill({ T, lang = 'en', to, onClick, label = 'language', compact = true }) {
  const L = langInfo(lang);
  const style = {
    boxSizing: 'border-box', height: 36, padding: compact ? '0 7px 0 10px' : '0 9px 0 13px',
    borderRadius: compact ? 12 : 999,
    border: `1px solid ${T.border}`, background: 'transparent', color: T.text,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    font: `600 ${compact ? 11.5 : 12.5}px ${T.font}`, letterSpacing: '0.02em',
    cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  };
  const body = (
    <>
      <Icon.globe />
      <span>{compact ? L.short : L.native}</span>
      <Icon.chevR aria-hidden="true" style={{ color: T.textMute, marginLeft: -1 }} />
    </>
  );
  if (to) return <Link to={to} aria-label={label} style={style}>{body}</Link>;
  return <button type="button" onClick={onClick} aria-label={label} style={style}>{body}</button>;
}
