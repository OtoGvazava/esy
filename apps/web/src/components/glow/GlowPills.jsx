// Topbar pills — ported from direction-a.jsx (v2 handoff): a theme toggle and
// a language pill that opens the language picker. Both answer a press as the
// header's buttons do (styles/motion.css).
import { Link } from 'react-router-dom';
import { Icon, langInfo } from './GlowPrimitives';

export function ThemePill({ T, dark, onClick, compact = true }) {
  return (
    <button type="button" onClick={onClick} aria-label="toggle appearance" className="esy-press" style={{
      width: 36, height: 36, borderRadius: compact ? 12 : 999,
      border: `1px solid ${T.border}`, background: 'transparent', color: T.text,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
    }}>
      {dark ? <Icon.sun /> : <Icon.moon />}
    </button>
  );
}

// The pill opens the Language and display page (language, appearance, text
// size, view) rather than flipping the language, so it carries a gear, the
// sign for settings, with the current language beside it: not a globe (it
// promised only the language) and not sliders (in a shop they mean filters).
// Given `to` it is a real link; `onClick` alone keeps it a button (the
// design previews).
export function LangPill({ T, lang = 'en', to, onClick, label = 'language', compact = true }) {
  const L = langInfo(lang);
  const style = {
    boxSizing: 'border-box', height: 36, padding: compact ? '0 10px' : '0 13px',
    borderRadius: compact ? 12 : 999,
    border: `1px solid ${T.border}`, background: 'transparent', color: T.text,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    font: `600 ${compact ? 11.5 : 12.5}px ${T.font}`, letterSpacing: '0.02em',
    cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none',
  };
  const body = (
    <>
      <Icon.gear aria-hidden="true" />
      <span>{compact ? L.short : L.native}</span>
    </>
  );
  if (to) return <Link to={to} aria-label={label} className="esy-press" style={style}>{body}</Link>;
  return <button type="button" onClick={onClick} aria-label={label} className="esy-press" style={style}>{body}</button>;
}
