// Glow flexible search — the pill input that drives navigation (no category
// chips, per the design). Active filter tokens render inside the field.
import { useRef } from 'react';
import { Icon, GlowToken } from './GlowPrimitives';
import { GLOW_MONO } from '../../styles/glow';

export default function GlowSearchBar({
  T, value, onChange, onSubmit, compact = false,
  placeholder = 'try "under $50" or "in stock"…', tokens = [], autoFocus = false,
}) {
  const inputRef = useRef(null);
  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: compact ? 48 : 56, padding: '0 10px 0 16px', borderRadius: 999,
        background: T.surface, border: `1px solid ${T.border}`,
        boxShadow: T.dark ? 'none' : '0 4px 18px rgba(20,20,60,0.05)',
        cursor: 'text',
      }}
    >
      <span style={{ color: T.textDim, display: 'flex' }}><Icon.search /></span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {tokens.map((tok) => (
          <GlowToken key={tok.id} T={T} accent>{tok.label}</GlowToken>
        ))}
        <input
          ref={inputRef}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit?.(value); }}
          placeholder={placeholder}
          aria-label="search"
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            font: `400 ${compact ? 13 : 14}px ${T.font}`, color: T.text,
          }}
        />
      </div>
      <span style={{
        display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 6px',
        borderRadius: 6, font: `500 10px ${GLOW_MONO}`,
        background: T.surface2, color: T.textMute, letterSpacing: '0.04em',
      }}>⌘ K</span>
    </div>
  );
}
